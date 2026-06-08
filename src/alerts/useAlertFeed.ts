import { useCallback, useEffect, useRef, useState } from 'react'

// Live alert feed off OUR relay (official Pikud HaOref, Israeli egress). SAFETY: an alerted area is
// NEVER auto-marked "safe" on a short timer. Official guidance is remain 10 min (rockets/UAV) or
// until an official release (ballistic/terror/nonconventional). We hold an area until an explicit
// cat-13 all-clear, with a long 180-min fail-safe backstop (mirrors amitfin/oref_alert) used only to
// avoid a stuck-on state, never as a "safe to leave" signal. 'special' (terror/nonconv) renders red.
const WS_URL = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS_URL.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')
const BACKSTOP_MS = 180 * 60_000 // 3h fail-safe only; NOT a safe-to-leave signal
const CLEAR_TTL_MS = 25_000
const RECONNECT_MS = 3_000
const FEED_TTL_MS = 24 * 60 * 60_000 // the event feed shows the last 24h, then entries drop off

export type FeedStatus = 'connecting' | 'live' | 'error'
export type AlertKind = 'active' | 'early' | 'special'
export type Instruction = { title: string; desc: string; key: string; remain: 'tenmin' | 'release' | 'none' }
// one entry per alert EVENT (tzevaadom-style), grouping all of its areas, newest first
export type FeedEvent = { id: string; severity: AlertKind | 'cleared'; title: string; ts: number; cities: string[] }
const MAX_EVENTS = 60

type RelayMessage =
  | {
      type: 'alert'
      kind?: AlertKind
      cities?: string[]
      cat?: string
      key?: string
      title?: string
      desc?: string
      remain?: Instruction['remain']
      id?: string
    }
  | { type: 'hello'; activeAreas?: string[] }
  | { type: 'clear'; cities?: string[]; id?: string; ts?: number }

const GROUP_WINDOW_MS = 30 * 60_000 // alerts with the same title within this window stack into one card

// Merge an event into the feed: if a recent card has the same severity+title (within GROUP_WINDOW_MS),
// union its areas and bump its time (tzevaadom-style stacking, so one ongoing event is one updating
// card, not 600 rows); otherwise prepend a new card. Also drops anything older than 24h. Pure, so it is
// reused for both live events and the history seed.
function mergeEvent(prev: FeedEvent[], ev: FeedEvent): FeedEvent[] {
  const cutoff = Date.now() - FEED_TTL_MS
  const fresh = prev.filter((e) => e.ts >= cutoff && e.id !== ev.id)
  const i = fresh.findIndex(
    (e) => e.severity === ev.severity && e.title === ev.title && Math.abs(e.ts - ev.ts) <= GROUP_WINDOW_MS,
  )
  const next =
    i >= 0
      ? fresh.map((e, idx) =>
          idx === i ? { ...e, ts: Math.max(e.ts, ev.ts), cities: Array.from(new Set([...e.cities, ...ev.cities])) } : e,
        )
      : [ev, ...fresh]
  return next.sort((a, b) => b.ts - a.ts).slice(0, MAX_EVENTS)
}

// Map a relay history record (alert/clear) into a feed event; null for anything else (e.g. firms-daily).
function toFeedEvent(raw: unknown): FeedEvent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const e = raw as { type?: string; kind?: string; id?: string; title?: string; cities?: unknown; ts?: number }
  if (!e.ts || !Array.isArray(e.cities) || e.cities.length === 0) return null
  if (e.type === 'clear') return { id: e.id ?? String(e.ts), severity: 'cleared', title: 'האירוע הסתיים', ts: e.ts, cities: e.cities as string[] }
  if (e.type === 'alert') {
    const severity: FeedEvent['severity'] = e.kind === 'early' ? 'early' : e.kind === 'special' ? 'special' : 'active'
    return { id: e.id ?? String(e.ts), severity, title: e.title || '', ts: e.ts, cities: e.cities as string[] }
  }
  return null
}

export function useAlertFeed() {
  const [activeAreas, setActive] = useState<Set<string>>(new Set())
  const [earlyAreas, setEarly] = useState<Set<string>>(new Set())
  const [clearedAreas, setCleared] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<FeedStatus>('connecting')
  const [lastAt, setLastAt] = useState<number | null>(null)
  const [instruction, setInstruction] = useState<Instruction | null>(null)
  const [events, setEvents] = useState<FeedEvent[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const pushEvent = useCallback((ev: FeedEvent) => {
    setEvents((prev) => mergeEvent(prev, ev))
  }, [])

  // seed the feed with the last 24h from the relay history (grouped) so a refresh keeps recent alerts,
  // and prune entries older than 24h every minute so the feed is always a rolling 24h window
  useEffect(() => {
    let alive = true
    fetch(`${RELAY_HTTP}/history?limit=300`)
      .then((r) => r.json())
      .then((d: { events?: unknown }) => {
        if (!alive || !Array.isArray(d.events)) return
        const cutoff = Date.now() - FEED_TTL_MS
        const hist = d.events
          .map(toFeedEvent)
          .filter((e): e is FeedEvent => e !== null && e.ts >= cutoff)
          .sort((a, b) => a.ts - b.ts) // oldest first so stacking accumulates forward
        // a live websocket event may already be in the feed with MORE (newer) areas than the history
        // snapshot captured; never let the staler history copy of the same id replace it
        setEvents((prev) => {
          const liveIds = new Set(prev.map((e) => e.id))
          return hist.filter((e) => !liveIds.has(e.id)).reduce((acc, e) => mergeEvent(acc, e), prev)
        })
      })
      .catch(() => {
        // relay history unavailable: live websocket events still populate the feed
      })
    const prune = setInterval(() => {
      setEvents((prev) => {
        const cutoff = Date.now() - FEED_TTL_MS
        const next = prev.filter((e) => e.ts >= cutoff)
        return next.length === prev.length ? prev : next
      })
    }, 60_000)
    return () => {
      alive = false
      clearInterval(prune)
    }
  }, [])

  const removeFrom = useCallback((setter: typeof setActive, name: string) => {
    setter((prev) => {
      if (!prev.has(name)) return prev
      const next = new Set(prev)
      next.delete(name)
      return next
    })
  }, [])

  const activate = useCallback(
    (names: string[], kind: AlertKind = 'active') => {
      if (names.length === 0) return
      setLastAt(Date.now())
      // 'special' (terror/nonconventional) renders in the red/active bucket (over-warn); its specific
      // instruction is carried separately in `instruction` (oref desc verbatim).
      const bucket: 'active' | 'early' = kind === 'early' ? 'early' : 'active'
      // a fresh alert supersedes a recent all-clear on the same area
      setCleared((prev) => {
        if (!names.some((n) => prev.has(n))) return prev
        const next = new Set(prev)
        for (const name of names) next.delete(name)
        return next
      })
      const setter = bucket === 'active' ? setActive : setEarly
      setter((prev) => {
        const next = new Set(prev)
        for (const name of names) next.add(name)
        return next
      })
      // an area escalating from early -> active drops out of the amber set
      if (bucket === 'active') setEarly((prev) => {
        if (!names.some((n) => prev.has(n))) return prev
        const next = new Set(prev)
        for (const name of names) next.delete(name)
        return next
      })
      for (const name of names) {
        const key = `${bucket}:${name}`
        const existing = timers.current.get(key)
        if (existing) clearTimeout(existing)
        timers.current.set(
          key,
          setTimeout(() => {
            timers.current.delete(key)
            removeFrom(setter, name)
          }, BACKSTOP_MS),
        )
      }
    },
    [removeFrom],
  )

  // "האירוע הסתיים" — move areas out of active/early into a short-lived green "safe to leave" set
  const resolve = useCallback(
    (names: string[]) => {
      if (names.length === 0) return
      setLastAt(Date.now())
      for (const name of names) {
        for (const k of ['active', 'early'] as const) {
          const t = timers.current.get(`${k}:${name}`)
          if (t) {
            clearTimeout(t)
            timers.current.delete(`${k}:${name}`)
          }
        }
      }
      const drop = (prev: Set<string>) => {
        if (!names.some((n) => prev.has(n))) return prev
        const next = new Set(prev)
        for (const name of names) next.delete(name)
        return next
      }
      setActive(drop)
      setEarly(drop)
      setCleared((prev) => {
        const next = new Set(prev)
        for (const name of names) next.add(name)
        return next
      })
      for (const name of names) {
        const key = `cleared:${name}`
        const existing = timers.current.get(key)
        if (existing) clearTimeout(existing)
        timers.current.set(
          key,
          setTimeout(() => {
            timers.current.delete(key)
            removeFrom(setCleared, name)
          }, CLEAR_TTL_MS),
        )
      }
    },
    [removeFrom],
  )

  useEffect(() => {
    let ws: WebSocket | null = null
    let retry: ReturnType<typeof setTimeout> | undefined
    let closed = false

    const connect = () => {
      setStatus('connecting')
      ws = new WebSocket(WS_URL)
      ws.onopen = () => setStatus('live')
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as RelayMessage
          if (msg.type === 'alert' && Array.isArray(msg.cities)) {
            const kind: AlertKind = msg.kind === 'early' ? 'early' : msg.kind === 'special' ? 'special' : 'active'
            activate(msg.cities, kind)
            setInstruction({
              title: msg.title ?? '',
              desc: msg.desc ?? '',
              key: msg.key ?? '',
              remain: msg.remain ?? 'release',
            })
            pushEvent({ id: msg.id ?? String(Date.now()), severity: kind, title: msg.title || '', ts: Date.now(), cities: msg.cities })
          } else if (msg.type === 'clear' && Array.isArray(msg.cities)) {
            resolve(msg.cities)
            pushEvent({ id: msg.id ?? String(Date.now()), severity: 'cleared', title: 'האירוע הסתיים', ts: Date.now(), cities: msg.cities })
          } else if (msg.type === 'hello' && Array.isArray(msg.activeAreas)) {
            activate(msg.activeAreas, 'active')
          }
        } catch {
          // ignore non-JSON keepalives
        }
      }
      ws.onerror = () => setStatus('error')
      ws.onclose = () => {
        if (closed) return
        setStatus('error')
        retry = setTimeout(connect, RECONNECT_MS)
      }
    }
    connect()

    const pending = timers.current
    return () => {
      closed = true
      if (retry) clearTimeout(retry)
      ws?.close()
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [activate, resolve, pushEvent])

  return { activeAreas, earlyAreas, clearedAreas, status, lastAt, instruction, events }
}
