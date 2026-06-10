// Telegram fan-out for the relay: one channel post per alert EVENT (same-title alerts within 30min
// EDIT the existing post, tzevaadom-style; see telegram-events.ts) + a map-snapshot photo reply that
// strictly FOLLOWS the text post (telegram-render.ts; render failure = text-only, never a delay) +
// per-city DM subscriptions managed by bot commands (/add, /remove, /list, /stop) over getUpdates.
// Public surface: telegramInit() (load token/subs, start polling), telegramNotify(ev) (fire-and-forget
// from server.ts right after broadcast). Pure helpers (parseCommand, formatChannelPost, formatDm,
// TokenBucket, sub store fns) are exported for import-level smoke tests; never call the real API there.
// Why this file: keeps Telegram I/O out of server.ts's life-safety websocket path. No throw crosses
// this module's boundary — every failure is logged and swallowed; the relay must never crash here.
// NOT responsible for: classification (events arrive pre-classified), history persistence, the channel
// itself (TELEGRAM_CHANNEL env). Rate limits: global ≤25 msg/s, ≤1 msg/s per chat, 429 retry_after;
// new-event sends always outrank edits/photos (the job queue drains only after the send queue).
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import {
  EDIT_GAP_MS,
  RENDER_GAP_MS,
  absorb,
  closeOnClear,
  dmDelta,
  formatPhotoCaption,
  newOpen,
  pruneOpen,
  type OpenEvent,
} from './telegram-events'
import { renderSnapshot } from './telegram-render'

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

// Israel-time stamps on every post/DM: Telegram's own message time is the reader's local zone and
// drifts under edits; the alert's official time must be explicit.
const stampIL = (ts: number) =>
  new Date(ts).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const timeIL = (ts: number) =>
  new Date(ts).toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit' })

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
export function formatChannelPost(ev: RelayEvent, updatedTs?: number): string {
  const title = ev.title || (ev.type === 'clear' ? 'האירוע הסתיים' : '')
  const stamp = `🕒 ${stampIL(ev.ts)}` + (updatedTs ? ` · עודכן ${timeIL(updatedTs)}` : '')
  const head = `${emojiFor(ev)} <b>${esc(title)}</b>\n` + (ev.desc ? `${esc(ev.desc)}\n` : '') + stamp + '\n\n'
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
  return `${emojiFor(ev)} <b>${esc(title)}</b>\n🕒 ${stampIL(ev.ts)}\n${lines.join('\n')}\n\n🔗 ${PERMALINK}${encodeURIComponent(ev.id)}`
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
const queue: Array<{ chatId: string; text: string; onSent?: (messageId: number) => void }> = []
const jobQueue: Array<{ chatId: string; run: () => Promise<void> }> = [] // edits + photos, lower priority than sends
const openEvents = new Map<string, OpenEvent>() // threat title -> open channel post (30-min window, in-memory only)
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

function enqueue(chatId: string, text: string, front = false, onSent?: (messageId: number) => void) {
  if (front) queue.unshift({ chatId, text, onSent })
  else queue.push({ chatId, text, onSent })
  if (queue.length > MAX_QUEUE) {
    // overflow: keep only the NEWEST message per chat (a clear supersedes its alert, never vice versa)
    const newest = new Map<string, { chatId: string; text: string }>()
    for (const m of queue) newest.set(m.chatId, m)
    queue.length = 0
    queue.push(...newest.values())
    console.error(`[telegram] queue overflow: compacted to ${queue.length} (newest per chat)`)
  }
}

async function api(method: string, body: Record<string, unknown> | FormData): Promise<unknown | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      ...(body instanceof FormData
        ? { body } // multipart (photo uploads); fetch sets the boundary header itself
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
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
    if (!bucket.take(now)) return // bucket empty: jobs below never starve a pending send
    queue.splice(i, 1)
    lastSentAt.set(msg.chatId, now)
    void api('sendMessage', {
      chat_id: msg.chatId,
      text: msg.text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }).then((res) => {
      // 429: api() set pausedUntil; put the message back at the FRONT so order (alert before clear) holds
      if (res === null && Date.now() < pausedUntil) {
        enqueue(msg.chatId, msg.text, true, msg.onSent)
        return
      }
      const mid = res && typeof res === 'object' && 'message_id' in res ? (res as { message_id: number }).message_id : null
      if (mid != null) msg.onSent?.(mid)
    })
  }
  // edits + photo ops only when no send is waiting on the bucket
  for (let i = 0; i < jobQueue.length; ) {
    const job = jobQueue[i]
    if (now - (lastSentAt.get(job.chatId) ?? 0) < 1000) {
      i++
      continue
    }
    if (!bucket.take(now)) return
    jobQueue.splice(i, 1)
    lastSentAt.set(job.chatId, now)
    void job.run()
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

// ---------- open-event channel posts (edit-on-update + photo reply) ----------

function openAsEvent(open: OpenEvent): RelayEvent {
  return { type: 'alert', id: open.id, kind: open.kind, title: open.title, desc: open.desc, cities: [...open.cities], ts: open.firstTs }
}

function clearTimers(open: OpenEvent) {
  if (open.editTimer) clearTimeout(open.editTimer)
  if (open.renderTimer) clearTimeout(open.renderTimer)
  open.editTimer = open.renderTimer = null
}

// Coalesced edit: at most one pending per event, fires ≥EDIT_GAP_MS after the previous edit, and
// reads the city set at fire time so the latest state wins.
function scheduleEdit(open: OpenEvent) {
  if (open.editTimer) return
  const fire = () => {
    open.editTimer = null
    if (openEvents.get(open.key) !== open) return // closed by an all-clear or the 30-min window
    if (open.messageId == null) {
      open.editTimer = setTimeout(fire, 1000) // text post not confirmed yet; retry shortly
      return
    }
    open.lastEditTs = Date.now()
    const messageId = open.messageId
    const text = formatChannelPost(openAsEvent(open), Date.now())
    jobQueue.push({
      chatId: CHANNEL,
      run: async () => {
        await api('editMessageText', { chat_id: CHANNEL, message_id: messageId, text, parse_mode: 'HTML', disable_web_page_preview: true })
      },
    })
  }
  open.editTimer = setTimeout(fire, Math.max(0, open.lastEditTs + EDIT_GAP_MS - Date.now()))
}

// Re-render the map at most every RENDER_GAP_MS as the event grows.
function scheduleRender(open: OpenEvent) {
  if (open.renderTimer) return
  const wait = Math.max(0, open.lastRenderTs + RENDER_GAP_MS - Date.now())
  open.renderTimer = setTimeout(() => {
    open.renderTimer = null
    if (openEvents.get(open.key) !== open) return
    void renderAndAttach(open)
  }, wait)
}

// Render strictly AFTER the text post: a slow or failed render only means a text-only post.
async function renderAndAttach(open: OpenEvent) {
  if (open.rendering) return
  open.rendering = true
  open.lastRenderTs = Date.now()
  const png = await renderSnapshot([...open.cities], open.kind)
  open.rendering = false
  if (!png) return // renderer logged why; the post stays text-only
  jobQueue.push({ chatId: CHANNEL, run: () => attachPhoto(open, png) })
}

async function sendPhotoReply(open: OpenEvent, png: string, caption: string) {
  const form = new FormData()
  form.set('chat_id', CHANNEL)
  form.set('photo', Bun.file(png), 'map.png')
  form.set('caption', caption)
  if (open.messageId != null) {
    form.set('reply_to_message_id', String(open.messageId))
    form.set('allow_sending_without_reply', 'true')
  }
  const res = await api('sendPhoto', form)
  if (res && typeof res === 'object' && 'message_id' in res) open.photoMessageId = (res as { message_id: number }).message_id
}

async function attachPhoto(open: OpenEvent, png: string) {
  try {
    const caption = formatPhotoCaption(open.title, open.id)
    if (open.photoMessageId == null) {
      await sendPhotoReply(open, png, caption)
      return
    }
    const form = new FormData()
    form.set('chat_id', CHANNEL)
    form.set('message_id', String(open.photoMessageId))
    form.set('media', JSON.stringify({ type: 'photo', media: 'attach://photo', caption }))
    form.set('photo', Bun.file(png), 'map.png')
    if ((await api('editMessageMedia', form)) === null && Date.now() >= pausedUntil) {
      // genuine edit failure (not a rate pause): replace via delete + fresh reply
      await api('deleteMessage', { chat_id: CHANNEL, message_id: open.photoMessageId })
      open.photoMessageId = null
      await sendPhotoReply(open, png, caption)
    }
  } finally {
    try {
      unlinkSync(png)
    } catch {
      // already gone
    }
  }
}

// DMs: for an open alert event, a subscriber hears ONLY about their cities newly entering it
// (per chat+city, tracked on the event); all-clears (open = null) DM once per affected chat.
function sendDms(ev: RelayEvent, open: OpenEvent | null) {
  const evCities = new Set(ev.cities)
  for (const [chatId, names] of subs) {
    let matched = names.filter((n) => evCities.has(n))
    if (open) matched = dmDelta(open, chatId, matched)
    if (matched.length) enqueue(chatId, formatDm(ev, matched, (c) => cities().get(c) ?? null))
  }
}

// Fire-and-forget from server.ts: must never throw, never block, never touch the websocket path.
// The channel post is enqueued FIRST (one message reaches everyone), then DMs drain via the bucket.
// A same-title alert within 30min EDITS the open post (union of areas) instead of posting again.
export function telegramNotify(ev: RelayEvent) {
  try {
    if (!token) return
    const now = Date.now()
    for (const expired of pruneOpen(openEvents, now)) clearTimers(expired)
    if (ev.type === 'clear') {
      enqueue(CHANNEL, formatChannelPost(ev)) // clear posts stay separate posts
      for (const closed of closeOnClear(openEvents, ev.cities)) clearTimers(closed)
      sendDms(ev, null)
      return
    }
    const open = openEvents.get(ev.title ?? '')
    if (open) {
      const added = absorb(open, ev.cities)
      if (ev.desc) open.desc = ev.desc
      if (added.length) {
        scheduleEdit(open)
        scheduleRender(open)
      }
      sendDms(ev, open)
      return
    }
    const fresh = newOpen({ id: ev.id, kind: ev.kind, title: ev.title, desc: ev.desc, cities: ev.cities, ts: ev.ts })
    openEvents.set(fresh.key, fresh)
    enqueue(CHANNEL, formatChannelPost(ev), false, (mid) => {
      fresh.messageId = mid
      void renderAndAttach(fresh) // the image is a follow-up reply, never a gate on the text
    })
    sendDms(ev, fresh)
  } catch (err) {
    console.error('[telegram] notify:', (err as Error).message)
  }
}
