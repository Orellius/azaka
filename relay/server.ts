// Pikud HaOref relay. Polls the OFFICIAL oref.org.il alert feed from this host's Israeli IP (the
// browser can't: no CORS + Israeli-IP geoblock; a Cloudflare Worker can't either, its egress is not
// an Israeli IP), dedups by alert id, and pushes new alerts to every connected browser over our own
// WebSocket. No third party in the path. Run: bun relay/server.ts (PORT, OREF_POLL_MS, OREF_URL env).
// Dev runs on an Israeli IP; production needs an Israeli egress (GCP me-west1 / IL VPS).
import { existsSync, readFileSync } from 'node:fs'
import { join, normalize } from 'node:path'
import { categoryOf, classifyAlert } from '../src/alerts/categories'
import { computeAnalytics, recordHit } from './analytics'
import { availableYears, cityHistory, computeStats, findEvent, persist, readAll, readYear, recent } from './history'
import { telegramInit, telegramNotify } from './telegram'

const PORT = Number(Bun.env.PORT ?? 8787)
const POLL_MS = Number(Bun.env.OREF_POLL_MS ?? 1500)
const OREF_URL = Bun.env.OREF_URL ?? 'https://www.oref.org.il/warningMessages/alert/Alerts.json'
// /test/alert lets anyone broadcast a fake siren to every client, a life-safety integrity hole if
// left open in production. Enabled in dev (NODE_ENV unset), disabled in prod unless explicitly opted in.
const TEST_ALERTS_ENABLED = Bun.env.ALLOW_TEST_ALERTS === '1' || Bun.env.NODE_ENV !== 'production'

// The frontend lives on Vercel; the relay is API-only (ws/history/analytics) behind the tunnel at
// azaka-relay.orellius.ai. SERVE_STATIC=1 re-enables serving dist/ for single-origin setups.
const DIST_DIR = new URL('../dist', import.meta.url).pathname
const HAS_DIST = Bun.env.SERVE_STATIC === '1' && existsSync(join(DIST_DIR, 'index.html'))

const CORS = { 'Access-Control-Allow-Origin': '*' }
const OREF_HEADERS = {
  Referer: 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (azaka-relay)',
  Accept: 'application/json, text/plain, */*',
}

// Known oref area names (cities.json keys == oref alert area names), so /history/city can 404 on a
// garbage name instead of returning an honest-looking empty record for it. Loaded once, on first use.
const CITIES_FILE = new URL('../public/data/cities.json', import.meta.url).pathname
let knownAreas: Set<string> | null = null
function isKnownArea(name: string): boolean {
  if (!knownAreas) {
    try {
      const data = JSON.parse(readFileSync(CITIES_FILE, 'utf8')) as { cities?: Record<string, unknown> }
      knownAreas = new Set(Object.keys(data.cities ?? {}))
    } catch (err) {
      console.error('[cities]', (err as Error).message)
      return true // can't read the list: fail open, serve the (possibly empty) history
    }
  }
  return knownAreas.has(name)
}

const clients = new Set<import('bun').ServerWebSocket<unknown>>()
let lastId: string | null = null
const ACTIVE_WINDOW_MS = 15 * 60_000
const activeAreas = new Map<string, number>() // area name -> last-seen ts; pruned so `hello` is not stale

function currentActive(): string[] {
  const cutoff = Date.now() - ACTIVE_WINDOW_MS
  const out: string[] = []
  for (const [name, ts] of activeAreas) {
    if (ts < cutoff) activeAreas.delete(name)
    else out.push(name)
  }
  return out
}

function broadcast(msg: unknown) {
  const s = JSON.stringify(msg)
  for (const ws of clients) {
    try {
      ws.send(s)
    } catch {
      // drop on a dead socket; close() will clean it up
    }
  }
}

async function pollOref() {
  try {
    const res = await fetch(OREF_URL, { headers: OREF_HEADERS })
    if (!res.ok) return
    const text = (await res.text()).trim().replace(/^\uFEFF/, '')
    if (!text || text === '{}') return // no active alert; client TTL expires stale areas

    let data: { id?: unknown; cat?: unknown; title?: unknown; data?: unknown }
    try {
      data = JSON.parse(text)
    } catch {
      return // not JSON (occasional HTML error page)
    }
    const id = String(data.id ?? '')
    const cat = String(data.cat ?? '')
    const title = String(data.title ?? '')
    const desc = String((data as { desc?: unknown }).desc ?? '')
    const cities = Array.isArray(data.data) ? (data.data as string[]) : []
    if (!id || id === lastId) return // nothing new
    lastId = id
    if (cities.length === 0) return

    // Classify by oref's verbatim TITLE, not the live `cat` number (which is unreliable: live cat 10
    // carries "האירוע הסתיים"=all-clear, not terrorattack). See classifyAlert for the safety rationale.
    const cls = classifyAlert(title, desc)
    const ts = Date.now()
    const stamp = new Date(ts).toISOString()

    // explicit all-clear ("האירוע הסתיים")
    if (cls.severity === 'cleared') {
      for (const c of cities) activeAreas.delete(c)
      const ev = { type: 'clear' as const, id, cat, cities, ts }
      broadcast(ev)
      telegramNotify(ev)
      persist(ev)
      console.log(`[clear] ${stamp} id=${id} "${title}" ${cities.length} areas`)
      return
    }
    // non-threats: memorial sirens + drills must NEVER show as an attack
    if (!cls.isThreat) {
      console.log(`[skip] ${stamp} non-threat (${cls.key}) "${title}" ${cities.length} areas`)
      return
    }
    // real threat: early = pre-alert; special = terror/nonconv/quake/etc; else active. Verbatim text passed through.
    const kind = cls.severity === 'early' ? 'early' : cls.severity === 'special' ? 'special' : 'active'
    for (const c of cities) activeAreas.set(c, ts)
    const ev = { type: 'alert' as const, kind, id, cat, key: cls.key, title, desc, remain: cls.remain, cities, ts }
    broadcast(ev)
    telegramNotify(ev)
    persist(ev)
    console.log(`[${kind}] ${stamp} id=${id} cat=${cat} (${cls.key}) "${title}" ${cities.length} areas`)
  } catch (err) {
    console.error('[poll]', (err as Error).message)
  }
}

setInterval(pollOref, POLL_MS)
pollOref()
telegramInit()

Bun.serve({
  port: PORT,
  async fetch(req, server) {
    const url = new URL(req.url)
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('expected websocket', { status: 426 })
    }
    if (url.pathname === '/health') {
      return Response.json({ ok: true, clients: clients.size, lastId, activeAreas: currentActive() }, { headers: CORS })
    }
    if (url.pathname === '/history') {
      const limit = Number(url.searchParams.get('limit') ?? 200)
      return Response.json({ events: recent(limit) }, { headers: CORS })
    }
    if (url.pathname === '/history/years') {
      const years = availableYears().map((year) => ({
        year,
        events: readYear(year).filter((e) => e.type === 'alert').length,
      }))
      return Response.json({ years }, { headers: CORS })
    }
    if (url.pathname === '/history/city') {
      const name = (url.searchParams.get('name') ?? '').trim()
      if (!name || name.length > 120) return Response.json({ error: 'bad name' }, { status: 400, headers: CORS })
      const city = cityHistory(name)
      if (city.total === 0 && !isKnownArea(name))
        return Response.json({ error: 'unknown area' }, { status: 404, headers: CORS })
      return Response.json(city, { headers: CORS })
    }
    if (url.pathname === '/history/event') {
      const id = (url.searchParams.get('id') ?? '').trim()
      if (!id || id.length > 64) return Response.json({ error: 'bad id' }, { status: 400, headers: CORS })
      const event = findEvent(id)
      if (!event) return Response.json({ error: 'not found' }, { status: 404, headers: CORS })
      return Response.json({ event }, { headers: CORS })
    }
    if (url.pathname === '/history/stats') {
      const yearParam = url.searchParams.get('year')
      const events = yearParam ? readYear(Number(yearParam)) : readAll()
      return Response.json({ year: yearParam ? Number(yearParam) : null, ...computeStats(events) }, { headers: CORS })
    }
    // DEV-ONLY: inject a fake alert to exercise the end-to-end push path without a real siren.
    if (url.pathname === '/test/alert' && TEST_ALERTS_ENABLED) {
      // pipe-delimited: real area names contain commas (e.g. "שדרות, איבים"), so do not split on ','
      const cities = (url.searchParams.get('cities') ?? 'תל אביב - מרכז העיר|חולון|רמת גן - מערב').split('|')
      const kindParam = url.searchParams.get('kind')
      const ts = Date.now()
      if (kindParam === 'clear') {
        broadcast({ type: 'clear', id: 'test-' + ts, cities, ts })
        return Response.json({ cleared: cities }, { headers: CORS })
      }
      // dev: fire any category by name (or ?cat=N) so every severity + card icon is exercisable
      const KINDS: Record<string, string> = {
        early: '14', special: '10', uav: '2', terror: '10', tsunami: '11',
        quake: '8', earthquake: '8', cbrne: '9', hazmat: '12', nonconv: '3', nonconventional: '3',
      }
      const cat = url.searchParams.get('cat') ?? (kindParam && KINDS[kindParam]) ?? '1'
      const c = categoryOf(cat) ?? categoryOf('1')!
      const kind = c.severity === 'early' ? 'early' : c.severity === 'special' ? 'special' : 'active'
      const desc =
        c.remain === 'release'
          ? 'היכנסו למרחב המוגן והמתינו להנחיות רשמיות'
          : cat === '14'
            ? 'היכנסו למרחב מוגן בדקות הקרובות'
            : 'היכנסו למרחב המוגן ושהו בו 10 דקות'
      broadcast({ type: 'alert', kind, id: 'test-' + ts, cat, key: c.key, title: c.he, desc, remain: c.remain, cities, ts })
      return Response.json({ injected: cities, kind, cat }, { headers: CORS })
    }
    // First-party pageview beacon (src/analytics/track.ts). Untrusted input: clamp/sanitize at the
    // boundary, then trust. vid is the consented visitor cookie; absent = anonymous view only.
    if (url.pathname === '/collect' && req.method === 'POST') {
      try {
        const body = JSON.parse(await req.text()) as Record<string, unknown>
        const vid =
          typeof body.vid === 'string' && body.vid.length <= 64 && /^[a-f0-9-]+$/i.test(body.vid)
            ? body.vid
            : undefined
        const path = typeof body.path === 'string' ? body.path.slice(0, 200) : undefined
        const lang = typeof body.lang === 'string' ? body.lang.slice(0, 8) : undefined
        recordHit({ ts: Date.now(), vid, path, c: req.headers.get('cf-ipcountry') ?? undefined, lang })
      } catch {
        // malformed beacon: drop silently, still 204
      }
      return new Response(null, { status: 204, headers: CORS })
    }
    if (url.pathname === '/analytics/stats') {
      return Response.json(computeAnalytics(), { headers: CORS })
    }
    // Static frontend + SPA fallback (History-API routes like /historical resolve to index.html).
    if (HAS_DIST && (req.method === 'GET' || req.method === 'HEAD')) {
      const safe = normalize(url.pathname).replaceAll('..', '')
      const file = Bun.file(join(DIST_DIR, safe))
      if (safe !== '/' && (await file.exists())) {
        // Vite assets are content-hashed -> immutable; everything else revalidates
        const cache = safe.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
        return new Response(file, { headers: { 'Cache-Control': cache } })
      }
      return new Response(Bun.file(join(DIST_DIR, 'index.html')), { headers: { 'Cache-Control': 'no-cache' } })
    }
    return new Response('azaka relay', { headers: CORS })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      ws.send(JSON.stringify({ type: 'hello', activeAreas: currentActive() }))
    },
    close(ws) {
      clients.delete(ws)
    },
    message() {
      // clients are receive-only
    },
  },
})

console.log(`[relay] ws://localhost:${PORT}/ws  polling ${OREF_URL} every ${POLL_MS}ms`)
console.log(`[relay] /test/alert ${TEST_ALERTS_ENABLED ? 'ENABLED (dev)' : 'disabled (production)'}`)
