// Pikud HaOref relay. Polls the OFFICIAL oref.org.il alert feed from this host's Israeli IP (the
// browser can't: no CORS + Israeli-IP geoblock; a Cloudflare Worker can't either, its egress is not
// an Israeli IP), dedups by alert id, and pushes new alerts to every connected browser over our own
// WebSocket. No third party in the path. Run: bun relay/server.ts (PORT, OREF_POLL_MS, OREF_URL env).
// Dev runs on an Israeli IP; production needs an Israeli egress (GCP me-west1 / IL VPS).
import { categoryOf, classifyAlert } from '../src/alerts/categories'
import { availableYears, computeStats, persist, readAll, readYear, recent } from './history'
import { firmsConfigured, getFires, startFirms } from './firms'

const PORT = Number(Bun.env.PORT ?? 8787)
const POLL_MS = Number(Bun.env.OREF_POLL_MS ?? 1500)
const OREF_URL = Bun.env.OREF_URL ?? 'https://www.oref.org.il/warningMessages/alert/Alerts.json'

const CORS = { 'Access-Control-Allow-Origin': '*' }
const OREF_HEADERS = {
  Referer: 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (azaka-relay)',
  Accept: 'application/json, text/plain, */*',
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
    const text = (await res.text()).trim().replace(/^﻿/, '')
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
      const ev = { type: 'clear', id, cat, cities, ts }
      broadcast(ev)
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
    const ev = { type: 'alert', kind, id, cat, key: cls.key, title, desc, remain: cls.remain, cities, ts }
    broadcast(ev)
    persist(ev)
    console.log(`[${kind}] ${stamp} id=${id} cat=${cat} (${cls.key}) "${title}" ${cities.length} areas`)
  } catch (err) {
    console.error('[poll]', (err as Error).message)
  }
}

setInterval(pollOref, POLL_MS)
pollOref()
startFirms()

Bun.serve({
  port: PORT,
  fetch(req, server) {
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
    if (url.pathname === '/history/stats') {
      const yearParam = url.searchParams.get('year')
      const events = yearParam ? readYear(Number(yearParam)) : readAll()
      return Response.json({ year: yearParam ? Number(yearParam) : null, ...computeStats(events) }, { headers: CORS })
    }
    if (url.pathname === '/firms') {
      return Response.json(
        { configured: firmsConfigured(), detections: getFires(), attribution: 'NASA FIRMS (LANCE/EOSDIS)' },
        { headers: CORS },
      )
    }
    // DEV-ONLY: inject a fake alert to exercise the end-to-end push path without a real siren.
    if (url.pathname === '/test/alert') {
      // pipe-delimited: real area names contain commas (e.g. "שדרות, איבים"), so do not split on ','
      const cities = (url.searchParams.get('cities') ?? 'תל אביב - מרכז העיר|חולון|רמת גן - מערב').split('|')
      const kindParam = url.searchParams.get('kind')
      const ts = Date.now()
      if (kindParam === 'clear') {
        broadcast({ type: 'clear', id: 'test-' + ts, cities, ts })
        return Response.json({ cleared: cities }, { headers: CORS })
      }
      const cat = kindParam === 'early' ? '14' : kindParam === 'special' ? '10' : '1'
      const c = categoryOf(cat)!
      const kind = c.severity === 'early' ? 'early' : c.severity === 'special' ? 'special' : 'active'
      const desc =
        cat === '1'
          ? 'היכנסו למרחב המוגן ושהו בו 10 דקות'
          : cat === '14'
            ? 'היכנסו למרחב מוגן בדקות הקרובות'
            : 'היכנסו לבית, נעלו דלתות וחלונות, התרחקו מהמחבל והמתינו להנחיות'
      broadcast({ type: 'alert', kind, id: 'test-' + ts, cat, key: c.key, title: c.he, desc, remain: c.remain, cities, ts })
      return Response.json({ injected: cities, kind, cat }, { headers: CORS })
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
