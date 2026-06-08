import { useCallback, useEffect, useState } from 'react'

// Pulls server-aggregated stats from the relay's /history endpoints. The relay does the heavy lifting
// over the year-partitioned log, so this only fetches small JSON. Auto-refreshes so an open dashboard
// stays current during an event. The HTTP base is derived from the same VITE_RELAY_URL as the socket.
const WS = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')
const REFRESH_MS = 30_000

export type Stats = {
  year: number | null
  totalEvents: number
  totalSirens: number
  uniqueCities: number
  range: { from: number | null; to: number | null }
  byHour: number[]
  byDay: Record<string, number>
  byType: Record<string, number>
  byEventSize: Record<string, number>
  topCities: Array<{ name: string; count: number }>
}

export type HistoryEvent = { type?: string; kind?: string; key?: string; title?: string; cities?: string[]; ts?: number }
export type YearInfo = { year: number; events: number }

export function useHistoryStats() {
  const [years, setYears] = useState<YearInfo[]>([])
  const [year, setYear] = useState<number | null>(null) // null = all years
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<HistoryEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${RELAY_HTTP}/history/years`)
      .then((r) => r.json())
      .then((d) => setYears(d.years ?? []))
      .catch(() => setError(true))
  }, [])

  const load = useCallback(async () => {
    try {
      const q = year ? `?year=${year}` : ''
      const [s, h] = await Promise.all([
        fetch(`${RELAY_HTTP}/history/stats${q}`).then((r) => r.json()),
        fetch(`${RELAY_HTTP}/history?limit=40`).then((r) => r.json()),
      ])
      setStats(s)
      setRecent(h.events ?? [])
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    setLoading(true)
    load()
    const t = setInterval(load, REFRESH_MS)
    return () => clearInterval(t)
  }, [load])

  return { years, year, setYear, stats, recent, loading, error, reload: load }
}
