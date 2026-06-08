import { useEffect, useMemo, useRef, useState } from 'react'
import type { MyArea } from './useMyArea'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'

// Searchable modal for picking a home area from public/data/cities.json (~1449 entries, 422 KB).
// Fetched lazily only when the picker opens, so it never weighs on first paint. Results are capped
// (the list is long; the search narrows it) and filter by Hebrew or English substring.

type CityRec = { en?: string; countdown?: number | null; lat: number; lng: number }
type CitiesFile = { cities: Record<string, CityRec> }
const MAX_RESULTS = 60

export function AreaPicker({ onPick, onClose }: { onPick: (area: MyArea) => void; onClose: () => void }) {
  const { t, lang } = useLang()
  const localizeArea = useAreaName()
  const [all, setAll] = useState<MyArea[] | null>(null)
  const [error, setError] = useState(false)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    fetch('/data/cities.json')
      .then((r) => r.json())
      .then((d: CitiesFile) => {
        if (!alive) return
        const list = Object.entries(d.cities).map(([name, rec]) => ({
          name,
          en: rec.en,
          countdown: rec.countdown ?? null,
          lat: rec.lat,
          lng: rec.lng,
        }))
        list.sort((a, b) => a.name.localeCompare(b.name, 'he'))
        setAll(list)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const results = useMemo(() => {
    if (!all) return []
    const term = q.trim().toLowerCase()
    if (!term) return all.slice(0, MAX_RESULTS)
    const out: MyArea[] = []
    for (const a of all) {
      if (a.name.includes(q.trim()) || (a.en && a.en.toLowerCase().includes(term))) {
        out.push(a)
        if (out.length >= MAX_RESULTS) break
      }
    }
    return out
  }, [all, q])

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-slate-950/95 shadow-2xl sm:max-h-[70vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/10 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white">{t('picker_title')}</div>
            <div className="text-[0.6875rem] text-slate-400">{t('picker_sub')}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="shrink-0 rounded-lg px-2 py-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="p-3">
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            inputMode="search"
            placeholder={t('picker_search')}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[0.9375rem] text-white placeholder:text-slate-500 focus:border-sky-400/50 focus:outline-none"
          />
        </div>

        <div className="feed-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {error ? (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-[0.8125rem] text-rose-200">
              {t('picker_failed')}
            </div>
          ) : !all ? (
            <div className="p-4 text-center text-[0.8125rem] text-slate-400">{t('picker_loading')}</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-[0.8125rem] text-slate-400">{t('picker_none')}</div>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((a) => (
                <li key={a.name}>
                  <button
                    type="button"
                    onClick={() => onPick(a)}
                    className="flex w-full items-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-start transition hover:border-sky-400/40 hover:bg-sky-400/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[0.875rem] font-semibold text-white">{localizeArea(a.name)}</div>
                      {lang === 'he' && a.en && <div className="truncate text-[0.6875rem] text-slate-400">{a.en}</div>}
                    </div>
                    {a.countdown != null && (
                      <span className="shrink-0 whitespace-nowrap rounded-md bg-white/5 px-2 py-0.5 text-[0.625rem] text-slate-300">
                        {a.countdown === 0 ? t('immediate') : t('shelter_secs', { n: a.countdown })}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
