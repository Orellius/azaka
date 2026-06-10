// Telegram fan-out for the relay: one channel post per alert/clear event + per-city DM subscriptions
// managed by bot commands (/add, /remove, /list, /stop) over long-poll getUpdates.
// Public surface: telegramInit() (load token/subs, start polling), telegramNotify(ev) (fire-and-forget
// from server.ts right after broadcast). Pure helpers (parseCommand, formatChannelPost, formatDm,
// TokenBucket, sub store fns) are exported for import-level smoke tests; never call the real API there.
// Why this file: keeps Telegram I/O out of server.ts's life-safety websocket path. No throw crosses
// this module's boundary — every failure is logged and swallowed; the relay must never crash here.
// NOT responsible for: classification (events arrive pre-classified), history persistence, the channel
// itself (TELEGRAM_CHANNEL env). Rate limits: global ≤25 msg/s, ≤1 msg/s per chat, 429 retry_after.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export type RelayEvent = {
  type: 'alert' | 'clear'
  id: string
  cities: string[]
  ts: number
  kind?: string // 'active' | 'early' | 'special'
  cat?: string; key?: string; title?: string; desc?: string; remain?: string
}

// TELEGRAM_TOKEN_FILE override exists so tests can force the disabled path without touching the real secret
const TOKEN_FILE = Bun.env.TELEGRAM_TOKEN_FILE ?? new URL('./data/telegram.token', import.meta.url).pathname
const SUBS_FILE = new URL('./data/telegram-subs.json', import.meta.url).pathname
const CITIES_FILE = new URL('../public/data/cities.json', import.meta.url).pathname
const CHANNEL = Bun.env.TELEGRAM_CHANNEL ?? '@azaka_alerts'
const PERMALINK = 'https://azaka.orellius.ai/alert/'
const MAX_LEN = 4096
const MAX_QUEUE = 5000

const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const emojiFor = (ev: RelayEvent) => (ev.type === 'clear' ? '🟢' : ev.kind === 'early' ? '🟠' : '🔴')

// City list that fits a char budget. >60 cities (or over budget): count + leading cities + "ועוד N".
export function fitCities(cities: string[], budget: number): string {
  const full = cities.join(', ')
  if (cities.length <= 60 && full.length <= budget) return full
  const headLabel = `${cities.length} אזורים: `
  let out = headLabel
  let used = 0
  for (const c of cities) {
    const piece = (used ? ', ' : '') + c
    // reserve room for the " ועוד N" suffix
    if (out.length + piece.length + 16 > budget || used >= 40) break
    out += piece
    used++
  }
  return out + ` ועוד ${cities.length - used}`
}

// Channel post: verbatim Hebrew title (bold) + verbatim desc, never truncated; the city list absorbs
// the 4096 limit. No per-city shelter seconds here (country-wide post, mixed values) — the link has them.
export function formatChannelPost(ev: RelayEvent): string {
  const title = ev.title || (ev.type === 'clear' ? 'האירוע הסתיים' : '')
  const head = `${emojiFor(ev)} <b>${esc(title)}</b>\n` + (ev.desc ? `${esc(ev.desc)}\n` : '') + '\n'
  const tail = `\n\n🔗 ${PERMALINK}${encodeURIComponent(ev.id)}`
  const cityLine = esc(fitCities(ev.cities, MAX_LEN - head.length - tail.length))
  return head + cityLine + tail
}

// DM to a subscriber: verbatim title + only their matched cities, each with the OFFICIAL shelter-entry
// seconds (migun countdown from cities.json — time to REACH shelter, never time-to-impact).
export function formatDm(ev: RelayEvent, matched: string[], seconds: (city: string) => number | null): string {
  const title = ev.title || (ev.type === 'clear' ? 'האירוע הסתיים' : '')
  const lines = matched.map((c) => {
    const s = ev.type === 'clear' ? null : seconds(c)
    return s == null ? `• ${esc(c)}` : `• ${esc(c)} — זמן כניסה למרחב מוגן: ${s} שניות`
  })
  return `${emojiFor(ev)} <b>${esc(title)}</b>\n${lines.join('\n')}\n\n🔗 ${PERMALINK}${encodeURIComponent(ev.id)}`
}

export type BotCommand = { cmd: 'start' | 'add' | 'remove' | 'list' | 'stop'; arg: string } | null

export function parseCommand(text: string): BotCommand {
  const m = /^\/(start|add|remove|list|stop)(?:@\w+)?(?:\s+(.*))?$/s.exec(text.trim())
  if (!m) return null
  return { cmd: m[1] as Exclude<BotCommand, null>['cmd'], arg: (m[2] ?? '').trim() }
}

// Global token bucket: ≤25 msg/s, headroom under Telegram's 30/s cap.
export class TokenBucket {
  private tokens: number
  private last: number
  constructor(private rate = 25, private cap = 25, now = Date.now()) {
    this.tokens = cap
    this.last = now
  }
  take(now = Date.now()): boolean {
    this.tokens = Math.min(this.cap, this.tokens + ((now - this.last) / 1000) * this.rate)
    this.last = now
    if (this.tokens < 1) return false
    this.tokens -= 1
    return true
  }
}

// Subscription store (chatId -> city names), persisted as plain JSON.
export function loadSubs(file = SUBS_FILE): Map<string, string[]> {
  try {
    if (!existsSync(file)) return new Map()
    const raw = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string[]>
    return new Map(Object.entries(raw).filter(([, v]) => Array.isArray(v)))
  } catch (err) {
    console.error('[telegram] subs load:', (err as Error).message)
    return new Map()
  }
}

export function saveSubs(subs: Map<string, string[]>, file = SUBS_FILE): boolean {
  try {
    writeFileSync(file, JSON.stringify(Object.fromEntries(subs), null, 1))
    return true
  } catch (err) {
    console.error('[telegram] subs save:', (err as Error).message)
    return false
  }
}

// ---------- module state ----------

let token = ''
let subs = new Map<string, string[]>()
let cityData: Map<string, number | null> | null = null // area name -> official shelter seconds
const bucket = new TokenBucket()
const queue: Array<{ chatId: string; text: string }> = []
const lastSentAt = new Map<string, number>()
let pausedUntil = 0
let updateOffset = 0

function cities(): Map<string, number | null> {
  if (!cityData) {
    try {
      const data = JSON.parse(readFileSync(CITIES_FILE, 'utf8')) as {
        cities?: Record<string, { countdown?: number }>
      }
      cityData = new Map(Object.entries(data.cities ?? {}).map(([k, v]) => [k, v.countdown ?? null]))
    } catch (err) {
      console.error('[telegram] cities load:', (err as Error).message)
      cityData = new Map()
    }
  }
  return cityData
}

function enqueue(chatId: string, text: string, front = false) {
  if (front) queue.unshift({ chatId, text })
  else queue.push({ chatId, text })
  if (queue.length > MAX_QUEUE) {
    // overflow: keep only the NEWEST message per chat (a clear supersedes its alert, never vice versa)
    const newest = new Map<string, { chatId: string; text: string }>()
    for (const m of queue) newest.set(m.chatId, m)
    queue.length = 0
    queue.push(...newest.values())
    console.error(`[telegram] queue overflow: compacted to ${queue.length} (newest per chat)`)
  }
}

async function api(method: string, body: Record<string, unknown>): Promise<unknown | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await res.json()) as { ok?: boolean; result?: unknown; parameters?: { retry_after?: number } }
    if (res.status === 429) {
      pausedUntil = Date.now() + (data.parameters?.retry_after ?? 3) * 1000
      return null
    }
    if (!data.ok) {
      console.error(`[telegram] ${method} failed:`, JSON.stringify(data).slice(0, 200))
      return null
    }
    return data.result ?? true
  } catch (err) {
    console.error(`[telegram] ${method}:`, (err as Error).message)
    return null
  }
}

function drain() {
  const now = Date.now()
  if (now < pausedUntil) return
  for (let i = 0; i < queue.length; ) {
    const msg = queue[i]
    const last = lastSentAt.get(msg.chatId) ?? 0
    if (now - last < 1000) {
      i++ // this chat is throttled; later messages for other chats may still go
      continue
    }
    if (!bucket.take(now)) return
    queue.splice(i, 1)
    lastSentAt.set(msg.chatId, now)
    void api('sendMessage', {
      chat_id: msg.chatId,
      text: msg.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }).then((ok) => {
      // 429: api() set pausedUntil; put the message back at the FRONT so order (alert before clear) holds
      if (ok === null && Date.now() < pausedUntil) enqueue(msg.chatId, msg.text, true)
    })
  }
}

const HELP =
  'בוט ההתרעות של אזעקה (azaka.orellius.ai).\n' +
  'התרעות פיקוד העורף ישירות לטלגרם, לפי הערים שתבחרו:\n' +
  '/add שם עיר — הוספת עיר (בעברית, כפי שמופיעה בפיקוד העורף)\n' +
  '/remove שם עיר — הסרת עיר\n' +
  '/list — הערים שלכם\n' +
  '/stop — הפסקת כל ההתרעות\n\n' +
  'כלי אזרחי לא רשמי. אינו תחליף להתרעות הרשמיות של פיקוד העורף.'

export function handleCommand(chatId: string, text: string, store: Map<string, string[]>): string | null {
  const c = parseCommand(text)
  if (!c) return null
  const mine = store.get(chatId) ?? []
  switch (c.cmd) {
    case 'start':
      return HELP
    case 'add': {
      if (!c.arg) return 'שימוש: /add שם עיר (למשל: /add חולון)'
      if (cities().has(c.arg)) {
        if (!mine.includes(c.arg)) store.set(chatId, [...mine, c.arg])
        return `נוסף: ${c.arg}. תקבלו הודעה בכל התרעה באזור זה.`
      }
      const matches = [...cities().keys()].filter((n) => n.includes(c.arg)).slice(0, 5)
      return matches.length
        ? `לא נמצא אזור בשם "${c.arg}". אולי התכוונתם:\n${matches.map((m) => `• ${m}`).join('\n')}`
        : `לא נמצא אזור בשם "${c.arg}". יש להזין שם בעברית כפי שמופיע באתר פיקוד העורף.`
    }
    case 'remove': {
      if (!mine.includes(c.arg)) return `"${c.arg}" אינה ברשימה שלכם. /list להצגת הרשימה.`
      const next = mine.filter((n) => n !== c.arg)
      if (next.length) store.set(chatId, next)
      else store.delete(chatId)
      return `הוסר: ${c.arg}`
    }
    case 'list':
      return mine.length ? `הערים שלכם:\n${mine.map((m) => `• ${m}`).join('\n')}` : 'אין ערים ברשימה. /add שם עיר להוספה.'
    case 'stop':
      store.delete(chatId)
      return 'ההתרעות הופסקו. /add שם עיר כדי לחזור.'
  }
}

async function pollUpdates() {
  const result = await api('getUpdates', { offset: updateOffset, timeout: 50, allowed_updates: ['message'] })
  const updates = Array.isArray(result) ? (result as Array<{ update_id: number; message?: { chat?: { id?: number }; text?: string } }>) : []
  for (const u of updates) {
    updateOffset = Math.max(updateOffset, u.update_id + 1)
    const chatId = u.message?.chat?.id
    const text = u.message?.text
    if (chatId == null || !text) continue
    const reply = handleCommand(String(chatId), text, subs)
    if (reply) {
      saveSubs(subs)
      enqueue(String(chatId), reply)
    }
  }
  setTimeout(pollUpdates, result === null ? 5000 : 250) // backoff on failure, tight loop on success
}

export function telegramInit() {
  try {
    token = existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : ''
  } catch (err) {
    console.error('[telegram] token read:', (err as Error).message)
    token = ''
  }
  if (!token) {
    console.log('[telegram] disabled (no token)')
    return
  }
  subs = loadSubs()
  setInterval(drain, 60)
  void pollUpdates()
  console.log(`[telegram] enabled: channel ${CHANNEL}, ${subs.size} DM subscriber(s)`)
}

// Fire-and-forget from server.ts: must never throw, never block, never touch the websocket path.
// The channel post is enqueued FIRST (one message reaches everyone), then DMs drain via the bucket.
export function telegramNotify(ev: RelayEvent) {
  try {
    if (!token) return
    enqueue(CHANNEL, formatChannelPost(ev))
    const evCities = new Set(ev.cities)
    for (const [chatId, names] of subs) {
      const matched = names.filter((n) => evCities.has(n))
      if (matched.length) enqueue(chatId, formatDm(ev, matched, (c) => cities().get(c) ?? null))
    }
  } catch (err) {
    console.error('[telegram] notify:', (err as Error).message)
  }
}
