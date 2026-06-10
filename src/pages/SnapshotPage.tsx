import { useCallback, useEffect, useMemo } from 'react'
import type maplibregl from 'maplibre-gl'
import { AlertMap } from '../map/AlertMap'

// /snapshot — the relay's headless-render target for Telegram channel map images. Renders ONLY the
// AlertMap in a fixed 900x700 viewport, painting ?cities=a|b|c (pipe-delimited: area names contain
// commas) in the ?kind tier (active|special red, early amber, clear green) and auto-fitting to them.
// Sets document.title='SNAPSHOT_READY' on the first map 'idle' after the fit, so a headless poller
// can detect completion. App.tsx early-returns this route (no chrome, no cookie banner, no a11y
// widget) and trackPageview skips it; a robots-noindex meta is injected while mounted, and the route
// is excluded from the sitemap. NOT responsible for: live data (no websocket, no feed; query only).
// Test strategy: relay/telegram-render.ts smoke against `vite preview` + headless Brave.

// tier hex mirrors MapDashboard's SEV_HEX (MapLibre paint props need hex, not Tailwind classes)
const KIND_HEX: Record<string, string> = { active: '#ff2532', special: '#ff2532', early: '#f59e0b', clear: '#10b981' }

function parseQuery(): { cities: string[]; kind: string } {
  const q = new URLSearchParams(window.location.search)
  const cities = (q.get('cities') ?? '').split('|').map((c) => c.trim()).filter(Boolean)
  const kind = q.get('kind') ?? 'active'
  return { cities, kind: kind in KIND_HEX ? kind : 'active' }
}

export function SnapshotPage() {
  const { cities, kind } = useMemo(() => parseQuery(), [])
  const sets = useMemo(() => {
    const painted = new Set(cities)
    const none = new Set<string>()
    if (kind === 'early') return { active: none, early: painted, cleared: none }
    if (kind === 'clear') return { active: none, early: none, cleared: painted }
    return { active: painted, early: none, cleared: none }
  }, [cities, kind])

  useEffect(() => {
    document.title = 'snapshot'
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  // ready = the snapshot fitBounds ran (movestart) and the map then settled (idle: animation done,
  // tiles loaded). A time gate would race the fit; this ordering cannot. onMapReady is invoked in
  // AlertMap's 'load' handler, BEFORE the React effect that calls fitBounds, so no event is missed.
  const onMapReady = useCallback((m: maplibregl.Map) => {
    let fitStarted = false
    m.on('movestart', () => {
      fitStarted = true
    })
    m.on('idle', () => {
      if (fitStarted) document.title = 'SNAPSHOT_READY'
    })
  }, [])

  return (
    <div className="h-[700px] w-[900px] overflow-hidden bg-surface">
      <AlertMap
        activeAreas={sets.active}
        earlyAreas={sets.early}
        clearedAreas={sets.cleared}
        snapshot={cities}
        snapshotColor={KIND_HEX[kind]}
        onMapReady={onMapReady}
      />
    </div>
  )
}
