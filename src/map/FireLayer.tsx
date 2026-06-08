import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl from 'maplibre-gl'
import type { FireDetection } from '../firms/useFirms'
import { FIRMS_CREDIT, nearestCity } from '../firms/anomaly'
import { useLang } from '../i18n/useLang'

// NASA FIRMS thermal-anomaly overlay. Each detection is an HTML fire-icon marker (createPortal into a
// MapLibre-owned container) with a drop-shadow so it reads as a real detection, not a flat dot. Using
// HTML markers (not a GL layer) also removes the popup collision by construction: a click on a marker is
// a DOM event that never reaches the map canvas, so it can't also fire the area-fill click handler.
// AlertMap holds the single selected-fire state and renders FirePopup. HONEST FRAMING: FIRMS senses
// HEAT, not impacts, and lags up to ~3h, so a marker means "possible fire near here", never "confirmed
// strike". Public surface: <FireLayer map detections onPick /> and <FirePopup map fire onClose />.
const FLAME_PATH =
  'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z'

export type PickedFire = FireDetection & { lngLat: maplibregl.LngLat }

// the shared flame glyph: used for the map markers and the sidebar legend so they stay in sync
export function FlameIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" stroke="#7c2d12" strokeWidth="1" className={className}>
      <path d={FLAME_PATH} />
    </svg>
  )
}

export function FireLayer({
  map,
  detections,
  onPick,
}: {
  map: maplibregl.Map
  detections: FireDetection[]
  onPick: (fire: PickedFire) => void
}) {
  return (
    <>
      {detections.map((d) => (
        <FireMarker key={`${d.lat},${d.lng},${d.ts},${d.satellite}`} map={map} d={d} onPick={onPick} />
      ))}
    </>
  )
}

function FireMarker({ map, d, onPick }: { map: maplibregl.Map; d: FireDetection; onPick: (fire: PickedFire) => void }) {
  const { t } = useLang()
  const [el] = useState(() => document.createElement('div'))
  useEffect(() => {
    const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([d.lng, d.lat]).addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, el, d.lng, d.lat])
  return createPortal(
    <button
      type="button"
      aria-label={t('firms_anomaly')}
      onClick={() => onPick({ ...d, lngLat: new maplibregl.LngLat(d.lng, d.lat) })}
      className="flex cursor-pointer items-center justify-center text-orange-500 transition hover:text-orange-400"
    >
      <FlameIcon className="size-5 drop-shadow-md" />
    </button>,
    el,
  )
}

export function FirePopup({ map, fire, onClose }: { map: maplibregl.Map; fire: PickedFire; onClose: () => void }) {
  const { t, tAgo, tConf } = useLang()
  const [el] = useState(() => document.createElement('div'))
  const popupRef = useRef<maplibregl.Popup | null>(null)
  useEffect(() => {
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 16, maxWidth: '260px' })
      .setDOMContent(el)
      .setLngLat(fire.lngLat)
      .addTo(map)
    popup.on('close', onClose)
    popupRef.current = popup
    return () => {
      popup.off('close', onClose) // do not fire onClose on programmatic removal (StrictMode/unmount)
      popup.remove()
    }
    // create once; reposition handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, el])
  useEffect(() => {
    popupRef.current?.setLngLat(fire.lngLat)
  }, [fire.lngLat])

  const near = nearestCity(fire)
  const time = fire.ts
    ? new Date(fire.ts).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : '—'
  return createPortal(
    <div className="w-52">
      <div className="flex items-start gap-2">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[0.8125rem] font-bold leading-tight text-orange-200">
            {t('firms_anomaly')}
            {near ? ` · ${t('firms_near')} ${near}` : ''}
          </div>
          <div className="text-[0.625rem] text-slate-400">{tAgo(fire.ts)} · {time}</div>
        </div>
      </div>
      <div className="mt-2 text-[0.6875rem] leading-relaxed text-slate-300">{t('firms_disclaimer')}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 rounded-lg bg-white/5 px-2.5 py-1.5 text-[0.625rem]">
        <span className="text-slate-400">{t('firms_confidence')}</span>
        <span className="text-end font-medium text-white">{tConf(fire.confidence)}</span>
        <span className="text-slate-400">{t('firms_intensity')}</span>
        <span className="text-end font-medium text-white">{fire.frp ? `${fire.frp} MW` : '—'}</span>
        <span className="text-slate-400">{t('firms_satellite')}</span>
        <span className="text-end font-medium text-white">{fire.satellite || '—'}</span>
      </div>
      <div className="mt-1.5 text-[0.5625rem] text-slate-500">{FIRMS_CREDIT}</div>
    </div>,
    el,
  )
}
