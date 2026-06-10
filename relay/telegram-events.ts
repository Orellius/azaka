// Open-event state for Telegram edit-on-update: one channel post per threat title within a 30-min
// window, growing by edits as oref adds areas (mirrors the app's mergeEvent stacking). Pure data +
// decision helpers only, exported for import-level smoke tests; telegram.ts owns all I/O and timers.
// Why this file: keeps the coalescing/delta logic testable without touching the Telegram API.
// NOT responsible for: sending, rate limits, rendering, persistence (open events are in-memory by
// design; a relay restart mid-event just means the next update posts fresh).

export const OPEN_WINDOW_MS = 30 * 60_000 // same-title alerts inside this window edit one post
export const EDIT_GAP_MS = 3_000 // min spacing between edits of one message; latest state wins
export const RENDER_GAP_MS = 30_000 // min spacing between map re-renders of one event
const PERMALINK = 'https://azaka.orellius.ai/alert/'
const CAPTION_MAX = 200

export type OpenEvent = {
  key: string // threat title (oref verbatim)
  id: string // FIRST oref id: the posted permalink stays stable across edits
  kind: string
  title: string
  desc: string
  messageId: number | null // channel text post; null until sendMessage resolves
  photoMessageId: number | null // map snapshot reply; null until sendPhoto resolves
  cities: Set<string>
  firstTs: number
  lastEditTs: number
  lastRenderTs: number
  rendering: boolean
  editTimer: ReturnType<typeof setTimeout> | null
  renderTimer: ReturnType<typeof setTimeout> | null
  dmSent: Set<string> // `${chatId}|${city}` pairs already DM'd for this event
}

export function newOpen(ev: { id: string; kind?: string; title?: string; desc?: string; cities: string[]; ts: number }): OpenEvent {
  return {
    key: ev.title ?? '',
    id: ev.id,
    kind: ev.kind ?? 'active',
    title: ev.title ?? '',
    desc: ev.desc ?? '',
    messageId: null,
    photoMessageId: null,
    cities: new Set(ev.cities),
    firstTs: ev.ts,
    lastEditTs: ev.ts, // first edit waits EDIT_GAP_MS after the post, never races it
    lastRenderTs: 0,
    rendering: false,
    editTimer: null,
    renderTimer: null,
    dmSent: new Set(),
  }
}

// Union new cities into the event; returns only the genuinely-new ones (empty = nothing changed).
export function absorb(open: OpenEvent, cities: string[]): string[] {
  const added: string[] = []
  for (const c of cities) {
    if (!open.cities.has(c)) {
      open.cities.add(c)
      added.push(c)
    }
  }
  return added
}

// Of a subscriber's matched cities, the ones not yet DM'd for this event; marks them sent.
export function dmDelta(open: OpenEvent, chatId: string, matched: string[]): string[] {
  const fresh = matched.filter((c) => !open.dmSent.has(`${chatId}|${c}`))
  for (const c of fresh) open.dmSent.add(`${chatId}|${c}`)
  return fresh
}

// Drop open events past the 30-min window; returns them so the caller can clear their timers.
export function pruneOpen(events: Map<string, OpenEvent>, now: number): OpenEvent[] {
  const expired: OpenEvent[] = []
  for (const [key, ev] of events) {
    if (now - ev.firstTs > OPEN_WINDOW_MS) {
      events.delete(key)
      expired.push(ev)
    }
  }
  return expired
}

// An all-clear closes every open event it touches (any city overlap); returns the closed ones.
export function closeOnClear(events: Map<string, OpenEvent>, clearCities: string[]): OpenEvent[] {
  const closed: OpenEvent[] = []
  for (const [key, ev] of events) {
    if (clearCities.some((c) => ev.cities.has(c))) {
      events.delete(key)
      closed.push(ev)
    }
  }
  return closed
}

// Photo caption: verbatim title + permalink, hard-capped at 200 chars (Telegram allows 1024).
export function formatPhotoCaption(title: string, id: string): string {
  const link = `${PERMALINK}${encodeURIComponent(id)}`
  const room = CAPTION_MAX - link.length - 1
  const head = title.length > room ? `${title.slice(0, room - 1)}…` : title
  return `${head}\n${link}`.slice(0, CAPTION_MAX)
}
