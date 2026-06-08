import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource } from 'maplibre-gl'
import type { Feature, FeatureCollection, Polygon } from 'geojson'
import 'maplibre-gl/dist/maplibre-gl.css'
import { mapStyle, ISRAEL_CENTER, ISRAEL_ZOOM } from './mapStyle'
import { computeThreatZone } from '../threat-zone/computeThreatZone'
import { convexHull, type Point } from '../threat-zone/convexHull'
import { buildCityLabels, type CityLabel } from './majorCities'
import { FireLayer, FirePopup, type PickedFire } from './FireLayer'
import type { FireDetection } from '../firms/useFirms'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import type { StringKey } from '../i18n/strings'

// MapLibre map of all Pikud HaOref alert areas. The GL layer (polygons, feature-state colours,
// threat-zone hull, auto-zoom) is imperative because it lives on the WebGL canvas. The HTML overlays
// (city pills, area popup) are REAL React via createPortal: MapLibre owns the positioned container,
// React renders the component into it. Tiers: red active / amber early / green cleared. Any sub-area
// is click-selectable. Public surface: <AlertMap activeAreas earlyAreas clearedAreas />.
const AREAS_URL = '/data/areas.geojson'
const EMPTY: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] }
const RED = '#ff2532'
const AMBER = '#f59e0b'
const GREEN = '#10b981'
const SELECT = '#22d3ee'
const ZOOM_MIN_GAP_MS = 3000
const USER_HOLD_MS = 8000

type Tier = 'active' | 'early' | 'cleared' | 'idle'
type AreaProps = { name?: string; en?: string; countdown?: number | null }
type Selected = { name: string; en?: string; countdown?: number | null; lngLat: maplibregl.LngLat }

const stateActive: ExpressionSpecification = ['boolean', ['feature-state', 'active'], false]
const stateEarly: ExpressionSpecification = ['boolean', ['feature-state', 'early'], false]
const stateCleared: ExpressionSpecification = ['boolean', ['feature-state', 'cleared'], false]
const stateSelected: ExpressionSpecification = ['boolean', ['feature-state', 'selected'], false]

function tierOf(names: string[], active: Set<string>, early: Set<string>, cleared: Set<string>): Tier {
  if (names.some((n) => active.has(n))) return 'active'
  if (names.some((n) => early.has(n))) return 'early'
  if (names.some((n) => cleared.has(n))) return 'cleared'
  return 'idle'
}

const TIER_STATUS: Record<Tier, { dot: string; txt: string; key: StringKey }> = {
  active: { dot: 'bg-rose-500', txt: 'text-rose-300', key: 'status_active' },
  early: { dot: 'bg-amber-500', txt: 'text-amber-300', key: 'status_early' },
  cleared: { dot: 'bg-emerald-500', txt: 'text-emerald-300', key: 'status_cleared' },
  idle: { dot: 'bg-slate-500', txt: 'text-slate-400', key: 'status_idle' },
}

export function AlertMap({
  activeAreas,
  earlyAreas,
  clearedAreas,
  fires = [],
  snapshot = null,
  snapshotColor = SELECT,
}: {
  activeAreas: Set<string>
  earlyAreas: Set<string>
  clearedAreas: Set<string>
  fires?: FireDetection[]
  snapshot?: string[] | null // a past event's areas to highlight + fit (history snapshot view)
  snapshotColor?: string // highlight colour, matching the event's severity (red / amber / green)
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const coordsRef = useRef<Map<string, Point[]>>(new Map())
  const prevRef = useRef({ active: new Set<string>(), early: new Set<string>(), cleared: new Set<string>() })
  const selectedIdRef = useRef<string | null>(null)
  const lastZoomRef = useRef(0)
  const userMovedRef = useRef(0)
  const zoomArmedRef = useRef(false)
  const hadSnapshotRef = useRef(false)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [cities, setCities] = useState<CityLabel[]>([])
  const [selected, setSelected] = useState<Selected | null>(null)
  const [selectedFire, setSelectedFire] = useState<PickedFire | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: ISRAEL_CENTER,
      zoom: ISRAEL_ZOOM,
      attributionControl: { compact: true },
    })
    mapRef.current = m
    const onUserMove = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) userMovedRef.current = Date.now()
    }
    m.on('dragstart', onUserMove)
    m.on('zoomstart', onUserMove)

    m.on('load', async () => {
      const fc = (await (await fetch(AREAS_URL)).json()) as FeatureCollection<Polygon>
      if (cancelled) return // map was torn down (StrictMode remount / unmount) before data arrived
      const points = new Map<string, { lng: number; lat: number }>()
      for (const f of fc.features) {
        const p = f.properties as (AreaProps & { lng?: number; lat?: number }) | null
        if (p?.name) {
          coordsRef.current.set(p.name, f.geometry.coordinates[0] as Point[])
          if (p.lng != null && p.lat != null) points.set(p.name, { lng: p.lng, lat: p.lat })
        }
      }

      m.addSource('areas', { type: 'geojson', data: fc, promoteId: 'name' })
      m.addSource('threat-zone', { type: 'geojson', data: EMPTY })
      m.addSource('threat-early', { type: 'geojson', data: EMPTY })

      m.addLayer({ id: 'threat-early-fill', type: 'fill', source: 'threat-early', paint: { 'fill-color': AMBER, 'fill-opacity': 0.08 } })
      m.addLayer({ id: 'threat-fill', type: 'fill', source: 'threat-zone', paint: { 'fill-color': RED, 'fill-opacity': 0.1 } })
      m.addLayer({
        id: 'areas-fill',
        type: 'fill',
        source: 'areas',
        paint: {
          'fill-color': ['case', stateActive, RED, stateEarly, AMBER, stateCleared, GREEN, RED],
          'fill-opacity': ['case', stateActive, 0.6, stateEarly, 0.38, stateCleared, 0.32, 0.03],
        },
      })
      m.addLayer({
        id: 'areas-line',
        type: 'line',
        source: 'areas',
        paint: {
          'line-color': ['case', stateSelected, SELECT, stateActive, RED, stateEarly, AMBER, stateCleared, GREEN, '#64748b'],
          'line-width': ['case', stateSelected, 2.5, stateActive, 1.5, stateEarly, 1.2, stateCleared, 1, 0.4],
          'line-opacity': ['case', stateSelected, 1, stateActive, 0.95, stateEarly, 0.8, stateCleared, 0.75, 0.25],
        },
      })
      m.addLayer({ id: 'threat-early-line', type: 'line', source: 'threat-early', paint: { 'line-color': AMBER, 'line-width': 1.5, 'line-dasharray': [2, 2], 'line-opacity': 0.7 } })
      m.addLayer({ id: 'threat-line', type: 'line', source: 'threat-zone', paint: { 'line-color': RED, 'line-width': 2, 'line-dasharray': [2, 1.5], 'line-opacity': 0.85 } })

      // history-snapshot highlight (cyan), painted on top when a past feed card is opened
      m.addSource('snapshot', { type: 'geojson', data: EMPTY })
      m.addLayer({ id: 'snapshot-fill', type: 'fill', source: 'snapshot', paint: { 'fill-color': SELECT, 'fill-opacity': 0.4 } })
      m.addLayer({ id: 'snapshot-line', type: 'line', source: 'snapshot', paint: { 'line-color': SELECT, 'line-width': 2.5, 'line-opacity': 1 } })

      m.on('mouseenter', 'areas-fill', () => (m.getCanvas().style.cursor = 'pointer'))
      m.on('mouseleave', 'areas-fill', () => (m.getCanvas().style.cursor = ''))
      m.on('click', 'areas-fill', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties as AreaProps
        setSelectedFire(null) // selecting an area supersedes any open fire popup
        setSelected({ name: String(p.name ?? ''), en: p.en, countdown: p.countdown, lngLat: e.lngLat })
      })
      m.on('click', (e) => {
        // a fire-marker click is a DOM event that never reaches the canvas, so an empty-canvas click
        // means the user tapped neither an area nor a marker: clear both popups.
        if (m.queryRenderedFeatures(e.point, { layers: ['areas-fill'] }).length === 0) {
          setSelected(null)
          setSelectedFire(null)
        }
      })

      setCities(buildCityLabels(points))
      setMap(m)
      // arm auto-zoom only after the initial state restore (hello) settles, so a refresh never
      // auto-zooms to areas that are merely being re-synced; live alerts after this do zoom.
      setTimeout(() => {
        zoomArmedRef.current = true
      }, 1500)
    })

    return () => {
      cancelled = true
      m.remove()
      mapRef.current = null
      setMap(null)
    }
  }, [])

  // GL state: feature-state colours + threat-zone hull + auto-zoom to freshly-alerted areas
  useEffect(() => {
    const m = mapRef.current
    if (!m || !map) return
    const prev = prevRef.current
    const fresh = [...activeAreas].filter((n) => !prev.active.has(n))
    syncState(m, prev.active, activeAreas, 'active')
    syncState(m, prev.early, earlyAreas, 'early')
    syncState(m, prev.cleared, clearedAreas, 'cleared')
    prevRef.current = { active: new Set(activeAreas), early: new Set(earlyAreas), cleared: new Set(clearedAreas) }
    ;(m.getSource('threat-zone') as GeoJSONSource | undefined)?.setData(computeThreatZone(activeAreas, coordsRef.current))
    ;(m.getSource('threat-early') as GeoJSONSource | undefined)?.setData(computeThreatZone(earlyAreas, coordsRef.current))
    if (fresh.length > 0 && zoomArmedRef.current) maybeZoomTo(m, fresh, coordsRef.current, lastZoomRef, userMovedRef)
  }, [map, activeAreas, earlyAreas, clearedAreas])

  // selected-area cyan ring (GL feature-state)
  useEffect(() => {
    const m = mapRef.current
    if (!m || !map) return
    if (selectedIdRef.current && selectedIdRef.current !== selected?.name) {
      m.setFeatureState({ source: 'areas', id: selectedIdRef.current }, { selected: false })
    }
    if (selected) {
      m.setFeatureState({ source: 'areas', id: selected.name }, { selected: true })
      selectedIdRef.current = selected.name
    } else {
      selectedIdRef.current = null
    }
  }, [map, selected])

  // history snapshot: highlight a past event's areas (cyan) and fit the map to them
  useEffect(() => {
    const m = mapRef.current
    if (!m || !map) return
    const src = m.getSource('snapshot') as GeoJSONSource | undefined
    if (!src) return
    if (!snapshot || snapshot.length === 0) {
      src.setData(EMPTY)
      if (hadSnapshotRef.current) {
        // left a history snapshot: zoom back out to the default country view
        m.flyTo({ center: ISRAEL_CENTER, zoom: ISRAEL_ZOOM, duration: 900 })
        hadSnapshotRef.current = false
      }
      return
    }
    hadSnapshotRef.current = true
    if (m.getLayer('snapshot-fill')) m.setPaintProperty('snapshot-fill', 'fill-color', snapshotColor)
    if (m.getLayer('snapshot-line')) m.setPaintProperty('snapshot-line', 'line-color', snapshotColor)
    const features: Feature<Polygon>[] = []
    const pts: Point[] = []
    for (const name of snapshot) {
      const ring = coordsRef.current.get(name)
      if (!ring) continue
      features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })
      for (const p of ring) pts.push(p)
    }
    src.setData({ type: 'FeatureCollection', features })
    if (pts.length === 0) return
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [x, y] of pts) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    m.fitBounds(
      [
        [minX, minY],
        [maxX, maxY],
      ],
      { padding: 80, maxZoom: 11, duration: 1000 },
    )
  }, [map, snapshot, snapshotColor])

  return (
    <div ref={containerRef} className="h-full w-full">
      {map && (
        <FireLayer
          map={map}
          detections={fires}
          onPick={(f) => {
            setSelected(null)
            setSelectedFire(f)
          }}
        />
      )}
      {map && selectedFire && <FirePopup map={map} fire={selectedFire} onClose={() => setSelectedFire(null)} />}
      {map &&
        cities.map((c) => (
          <CityMarker key={c.label} map={map} city={c} tier={tierOf(c.names, activeAreas, earlyAreas, clearedAreas)} />
        ))}
      {map && selected && (
        <AreaPopup
          map={map}
          selected={selected}
          tier={tierOf([selected.name], activeAreas, earlyAreas, clearedAreas)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function syncState(map: maplibregl.Map, prev: Set<string>, next: Set<string>, key: 'active' | 'early' | 'cleared') {
  for (const name of prev) if (!next.has(name)) map.setFeatureState({ source: 'areas', id: name }, { [key]: false })
  for (const name of next) map.setFeatureState({ source: 'areas', id: name }, { [key]: true })
}

function maybeZoomTo(
  map: maplibregl.Map,
  names: string[],
  coords: Map<string, Point[]>,
  lastZoom: { current: number },
  userMoved: { current: number },
) {
  const now = Date.now()
  if (now - userMoved.current < USER_HOLD_MS) return // user is looking elsewhere; do not hijack
  if (now - lastZoom.current < ZOOM_MIN_GAP_MS) return // rate-limit during a barrage
  const pts: Point[] = []
  for (const name of names) {
    const ring = coords.get(name)
    if (ring) for (const p of ring) pts.push(p)
  }
  if (pts.length === 0) return
  const hull = convexHull(pts)
  const ring = hull.length ? hull : pts
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  lastZoom.current = now
  map.fitBounds(
    [
      [minX, minY],
      [maxX, maxY],
    ],
    { padding: 140, maxZoom: 11, duration: 1600 },
  )
}

function CityMarker({ map, city, tier }: { map: maplibregl.Map; city: CityLabel; tier: Tier }) {
  const [el] = useState(() => document.createElement('div'))
  useEffect(() => {
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([city.lng, city.lat]).addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, el, city.lng, city.lat])
  return createPortal(<div className={tier === 'idle' ? 'city-label' : `city-label city-label--${tier}`}>{city.label}</div>, el)
}

function AreaPopup({
  map,
  selected,
  tier,
  onClose,
}: {
  map: maplibregl.Map
  selected: Selected
  tier: Tier
  onClose: () => void
}) {
  const { t, lang } = useLang()
  const localizeArea = useAreaName()
  const [el] = useState(() => document.createElement('div'))
  const popupRef = useRef<maplibregl.Popup | null>(null)
  useEffect(() => {
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 14, maxWidth: '260px' })
      .setDOMContent(el)
      .setLngLat(selected.lngLat)
      .addTo(map)
    popup.on('close', onClose)
    popupRef.current = popup
    return () => {
      popup.off('close', onClose) // do not fire onClose on programmatic removal (StrictMode/unmount)
      popup.remove()
    }
    // create once; repositioning handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el])
  useEffect(() => {
    popupRef.current?.setLngLat(selected.lngLat)
  }, [selected.lngLat])

  const sec = selected.countdown
  const status = TIER_STATUS[tier]
  return createPortal(
    <div className="w-44">
      <div className="flex items-start gap-2">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${status.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold leading-tight text-white">{localizeArea(selected.name)}</div>
          {lang === 'he' && selected.en && <div className="truncate text-[10px] text-slate-400">{selected.en}</div>}
          <div className={`mt-0.5 text-[11px] font-medium ${status.txt}`}>{t(status.key)}</div>
        </div>
      </div>
      {sec != null && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
          <span className="text-[10px] text-slate-400">{t('map_shelter_time')}</span>
          <span className="whitespace-nowrap text-[13px] font-bold text-white">
            {sec === 0 ? t('immediate') : `${sec} ${t('unit_sec')}`}
          </span>
        </div>
      )}
    </div>,
    el,
  )
}
