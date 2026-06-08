// NASA FIRMS active-fire / thermal-anomaly poller. Fetches VIIRS NRT detections over Israel and keeps
// the last 24h in memory for the map to overlay. HONEST CONSTRAINTS (verified, see project memory):
// FIRMS detects thermal anomalies (~375m, ~3h latency, a few overpasses/day) and CANNOT attribute
// cause, so the app says "thermal anomaly / fire detected near X", never "impact confirmed". Needs a
// free MAP_KEY from https://firms.modaps.eosdis.nasa.gov/api/map_key (set FIRMS_MAP_KEY in env).
const MAP_KEY = Bun.env.FIRMS_MAP_KEY ?? ''
const BBOX = Bun.env.FIRMS_BBOX ?? '34.2,29.4,35.9,33.4' // west,south,east,north (Israel)
const SOURCES = ['VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT', 'VIIRS_SNPP_NRT']
const POLL_MS = Number(Bun.env.FIRMS_POLL_MS ?? 20 * 60_000)
const MAX_AGE_MS = 24 * 60 * 60_000

export type FireDetection = {
  lat: number
  lng: number
  ts: number // detection time (acq_date + acq_time, UTC) as epoch ms
  confidence: string // VIIRS: low|nominal|high. MODIS: 0-100
  frp: number // fire radiative power, MW
  satellite: string
}

let detections: FireDetection[] = []

export const firmsConfigured = () => MAP_KEY.length > 0
export const getFires = () => detections

function parseCsv(csv: string): FireDetection[] {
  const lines = csv.trim().split('\n')
  if (lines.length < 2 || lines[0].startsWith('Invalid')) return []
  const header = lines[0].split(',')
  const at = (name: string) => header.indexOf(name)
  const iLat = at('latitude')
  const iLng = at('longitude')
  const iDate = at('acq_date')
  const iTime = at('acq_time')
  const iConf = at('confidence')
  const iFrp = at('frp')
  const iSat = at('satellite')
  if (iLat < 0 || iLng < 0) return []

  const out: FireDetection[] = []
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',')
    const lat = Number(c[iLat])
    const lng = Number(c[iLng])
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    const hhmm = String(c[iTime] ?? '0').padStart(4, '0')
    const ts = Date.parse(`${c[iDate]}T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00Z`)
    out.push({
      lat,
      lng,
      ts: Number.isFinite(ts) ? ts : Date.now(),
      confidence: String(c[iConf] ?? ''),
      frp: Number(c[iFrp]) || 0,
      satellite: String(c[iSat] ?? ''),
    })
  }
  return out
}

async function poll() {
  if (!MAP_KEY) return
  const merged = new Map<string, FireDetection>()
  for (const src of SOURCES) {
    try {
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${MAP_KEY}/${src}/${BBOX}/1`
      const res = await fetch(url)
      if (!res.ok) {
        console.error(`[firms] ${src} http ${res.status}`)
        continue
      }
      for (const d of parseCsv(await res.text())) {
        merged.set(`${d.lat.toFixed(4)},${d.lng.toFixed(4)},${d.ts},${d.satellite}`, d)
      }
    } catch (err) {
      console.error(`[firms] ${src}`, (err as Error).message)
    }
  }
  const cutoff = Date.now() - MAX_AGE_MS
  detections = [...merged.values()].filter((d) => d.ts >= cutoff).sort((a, b) => b.ts - a.ts)
  console.log(`[firms] ${detections.length} thermal-anomaly detections (last 24h) over Israel`)
}

export function startFirms() {
  if (!MAP_KEY) {
    console.log('[firms] FIRMS_MAP_KEY not set - fire overlay disabled. Free key: https://firms.modaps.eosdis.nasa.gov/api/map_key')
    return
  }
  poll()
  setInterval(poll, POLL_MS)
}
