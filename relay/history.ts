// Year-partitioned alert history log + server-side stats aggregation for the relay. Each year lives
// in its own file (relay/data/history-YYYY.jsonl) so a year of data archives cleanly and old years
// can be served on demand. Stats are aggregated server-side so the client never ships a year of rows.
// This log is also the training corpus for any later predictive layer, so we keep every event whole.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'

const DATA_DIR = 'relay/data'
mkdirSync(DATA_DIR, { recursive: true })

export type HistoryEvent = {
  type?: string // 'alert' | 'clear' | 'firms-daily'
  kind?: string // 'active' | 'early' | 'special'
  id?: string
  cat?: string
  key?: string // threat key (missilealert, uav, terrorattack, ...)
  title?: string
  cities?: string[]
  ts?: number
  count?: number // firms-daily: distinct thermal anomalies logged for that day
  maxFrp?: number // firms-daily: peak fire radiative power (MW) that day
}

const yearFile = (year: number) => `${DATA_DIR}/history-${year}.jsonl`

export function persist(ev: HistoryEvent) {
  try {
    const year = new Date(ev.ts ?? Date.now()).getFullYear()
    appendFileSync(yearFile(year), JSON.stringify(ev) + '\n')
  } catch (err) {
    console.error('[persist]', (err as Error).message)
  }
}

export function availableYears(): number[] {
  try {
    return readdirSync(DATA_DIR)
      .map((f) => /^history-(\d{4})\.jsonl$/.exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b)
  } catch {
    return []
  }
}

export function readYear(year: number): HistoryEvent[] {
  const f = yearFile(year)
  if (!existsSync(f)) return []
  return readFileSync(f, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l) as HistoryEvent
      } catch {
        return null
      }
    })
    .filter((x): x is HistoryEvent => x !== null)
}

export function readAll(): HistoryEvent[] {
  return availableYears().flatMap(readYear)
}

export function recent(limit: number): HistoryEvent[] {
  return readAll()
    .filter((e) => e.type !== 'firms-daily') // keep the recent-events feed to real alerts/clears
    .slice(-limit)
    .reverse()
}

function sizeBucket(n: number): string {
  if (n <= 1) return '1'
  if (n <= 5) return '2-5'
  if (n <= 20) return '6-20'
  if (n <= 100) return '21-100'
  return '100+'
}

export type Stats = {
  totalEvents: number
  totalSirens: number // sum of cities across events (locality-instances)
  uniqueCities: number
  range: { from: number | null; to: number | null }
  byHour: number[] // length 24, index = hour of day (server local time)
  byDay: Record<string, number> // YYYY-MM-DD -> event count
  byType: Record<string, number> // threat key -> event count
  byEventSize: Record<string, number> // locality-count bucket -> event count
  topCities: Array<{ name: string; count: number }>
}

export function computeStats(events: HistoryEvent[], topN = 30): Stats {
  const alerts = events.filter((e) => e.type === 'alert')
  const byCity: Record<string, number> = {}
  const byHour = new Array(24).fill(0)
  const byDay: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byEventSize: Record<string, number> = { '1': 0, '2-5': 0, '6-20': 0, '21-100': 0, '100+': 0 }
  let totalSirens = 0
  let minTs = Infinity
  let maxTs = -Infinity

  for (const e of alerts) {
    const ts = e.ts ?? 0
    if (ts) {
      if (ts < minTs) minTs = ts
      if (ts > maxTs) maxTs = ts
      const d = new Date(ts)
      byHour[d.getHours()]++
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      byDay[day] = (byDay[day] ?? 0) + 1
    }
    const key = e.key || 'unknown'
    byType[key] = (byType[key] ?? 0) + 1
    const cities = e.cities ?? []
    totalSirens += cities.length
    for (const c of cities) byCity[c] = (byCity[c] ?? 0) + 1
    byEventSize[sizeBucket(cities.length)]++
  }

  const topCities = Object.entries(byCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }))

  return {
    totalEvents: alerts.length,
    totalSirens,
    uniqueCities: Object.keys(byCity).length,
    range: { from: Number.isFinite(minTs) ? minTs : null, to: Number.isFinite(maxTs) ? maxTs : null },
    byHour,
    byDay: Object.fromEntries(Object.entries(byDay).sort()),
    byType,
    byEventSize,
    topCities,
  }
}
