import { useEffect, useRef, useState } from 'react'

// Polls OUR relay's /firms endpoint (NASA FIRMS VIIRS thermal anomalies over Israel, last 24h). HONEST
// CONSTRAINTS: FIRMS detects HEAT (~375m footprint, up to ~3h latency, only a few satellite overpasses
// a day) and CANNOT attribute cause, so a detection means "possible fire near here", never "confirmed
// impact". `configured` is false until the relay has a FIRMS_MAP_KEY; until then detections is empty and
// the overlay stays hidden. HTTP base is derived from the same VITE_RELAY_URL as the socket.
const WS = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')
const POLL_MS = 5 * 60_000

export type FireDetection = {
  lat: number
  lng: number
  ts: number // detection time (UTC) epoch ms
  confidence: string // VIIRS: low|nominal|high
  frp: number // fire radiative power, MW
  satellite: string
}

export type FirmsState = {
  configured: boolean
  detections: FireDetection[]
  attribution: string
}

// Parse-don't-validate at the network boundary: coerce the untrusted relay payload into a precise type,
// dropping anything without finite coordinates. Internal consumers then trust FireDetection.
function parseDetections(raw: unknown): FireDetection[] {
  if (!Array.isArray(raw)) return []
  const out: FireDetection[] = []
  for (const d of raw) {
    if (typeof d !== 'object' || d === null) continue
    const o = d as Record<string, unknown>
    const lat = Number(o.lat)
    const lng = Number(o.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    out.push({
      lat,
      lng,
      ts: Number(o.ts) || 0,
      confidence: String(o.confidence ?? ''),
      frp: Number(o.frp) || 0,
      satellite: String(o.satellite ?? ''),
    })
  }
  return out
}

const INITIAL: FirmsState = { configured: false, detections: [], attribution: 'NASA FIRMS (LANCE/EOSDIS)' }

export function useFirms() {
  const [state, setState] = useState<FirmsState>(INITIAL)
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    const load = async () => {
      try {
        const r = await fetch(`${RELAY_HTTP}/firms`)
        if (!r.ok) return
        const d = (await r.json()) as { configured?: unknown; detections?: unknown; attribution?: unknown }
        if (!aliveRef.current) return
        setState({
          configured: Boolean(d.configured),
          detections: parseDetections(d.detections),
          attribution: typeof d.attribution === 'string' ? d.attribution : INITIAL.attribution,
        })
      } catch {
        // relay down / network blip: keep the last good state, retry next tick
      }
    }
    load()
    const t = setInterval(load, POLL_MS)
    return () => {
      aliveRef.current = false
      clearInterval(t)
    }
  }, [])

  return state
}
