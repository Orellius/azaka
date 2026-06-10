import { useEffect, useState } from 'react'
import { navigate } from '../router'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import { useMyArea, type MyArea } from '../myarea/useMyArea'
import { usePageMeta } from '../seo/usePageMeta'
import { BarList } from '../historical/charts'
import { ArchiveShell, SpaLink } from './ArchiveShell'

// Per-city alert-history page (/city/<Hebrew name>): the indexable record for one locality. Shows the
// relay's per-area history (total, last alert, by-month bars, by-type, recent 20 with permalinks) plus
// the OFFICIAL migun shelter-seconds from cities.json. oref's verbatim Hebrew titles are shown as-is;
// the translated threat name is an aid beside them. Loading/error states are honest: no fabricated
// zeros while loading. NOT responsible for live alert state; that is the map's job (CTA links there).
// Public surface: <CityPage name={decodedHebrewName} />.

const WS = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')

type CityEvent = { id?: string; kind?: string; key?: string; title?: string; desc?: string; cities?: string[]; ts?: number }
type CityHistory = {
  name: string
  total: number
  lastTs: number | null
  byMonth: Record<string, number>
  byType: Record<string, number>
  recent: CityEvent[]
}
type CityRec = { en?: string; countdown?: number | null; lat: number; lng: number }
type Load = { s: 'loading' } | { s: 'error' } | { s: 'notfound' } | { s: 'ok'; data: CityHistory }

const KIND_TXT: Record<string, string> = { active: 'text-rose-400', special: 'text-rose-400', early: 'text-amber-400' }
const KIND_DOT: Record<string, string> = { active: 'bg-rose-500', special: 'bg-rose-500', early: 'bg-amber-500' }

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function CityPage({ name }: { name: string }) {
  const { t, lang, tThreat, tAgo } = useLang()
  const localizeArea = useAreaName()
  const [, addArea] = useMyArea()
  const [load, setLoad] = useState<Load>({ s: 'loading' })
  const [rec, setRec] = useState<CityRec | null>(null)

  // relay-unknown city name still answers HTTP 200 (static host), so noindex keeps it out of the index
  usePageMeta(t('city_meta_title', { city: name }), t('city_meta_desc', { city: name }), { noindex: load.s === 'notfound' })

  useEffect(() => {
    let alive = true
    fetch(`${RELAY_HTTP}/history/city?name=${encodeURIComponent(name)}`)
      .then(async (r) => {
        if (!alive) return
        if (r.status === 404) return setLoad({ s: 'notfound' })
        if (!r.ok) return setLoad({ s: 'error' })
        setLoad({ s: 'ok', data: (await r.json()) as CityHistory })
      })
      .catch(() => alive && setLoad({ s: 'error' }))
    fetch('/data/cities.json')
      .then((r) => r.json())
      .then((d: { cities: Record<string, CityRec> }) => alive && setRec(d.cities[name] ?? null))
      .catch(() => {
        // shelter-seconds chip simply stays hidden
      })
    return () => {
      alive = false
    }
  }, [name])

  const localized = localizeArea(name)
  const setAsMyArea = () => {
    if (!rec) return
    const area: MyArea = { name, en: rec.en, countdown: rec.countdown ?? null, lat: rec.lat, lng: rec.lng }
    addArea(area)
    navigate('/')
  }

  return (
    <ArchiveShell>
      <h1 className="text-2xl font-bold tracking-tight text-white">{name}</h1>
      {lang !== 'he' && localized !== name && <p className="mt-1 text-[0.9375rem] text-fg-muted">{localized}</p>}

      {rec?.countdown != null && (
        <p className="mt-2 text-[0.8125rem] text-fg-muted">
          {t('map_shelter_time')}:{' '}
          <span className="font-semibold text-white">
            {rec.countdown === 0 ? t('immediate') : t('shelter_secs', { n: rec.countdown })}
          </span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2.5">
        <SpaLink
          href="/"
          className="rounded-lg bg-fg px-4 py-2 text-[0.8125rem] font-semibold text-surface transition hover:opacity-90"
        >
          {t('hist_live_map')}
        </SpaLink>
        {rec && (
          <button
            type="button"
            onClick={setAsMyArea}
            className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-[0.8125rem] font-semibold text-sky-300 transition hover:bg-sky-400/20"
          >
            {t('city_set_my_area')}
          </button>
        )}
      </div>

      {load.s === 'loading' && <p className="mt-7 text-[0.8125rem] text-fg-muted">{t('hist_loading')}</p>}
      {load.s === 'error' && <p className="mt-7 text-[0.8125rem] text-rose-300">{t('hist_relay_error')}</p>}
      {load.s === 'notfound' && <p className="mt-7 text-[0.8125rem] text-fg-muted">{t('city_not_found')}</p>}

      {load.s === 'ok' && (
        <div className="mt-7 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-md border border-white/[0.08] bg-card p-3">
              <div className="text-[0.6875rem] text-fg-muted">{t('city_total')}</div>
              <div className="mt-0.5 text-xl font-bold tabular-nums text-white">{load.data.total}</div>
            </div>
            <div className="rounded-md border border-white/[0.08] bg-card p-3">
              <div className="text-[0.6875rem] text-fg-muted">{t('city_last')}</div>
              <div className="mt-0.5 text-[0.875rem] font-semibold tabular-nums text-white">
                {load.data.lastTs ? `${tAgo(load.data.lastTs)} · ${fmtDateTime(load.data.lastTs)}` : '—'}
              </div>
            </div>
          </div>

          {load.data.total === 0 && <p className="text-[0.8125rem] text-fg-muted">{t('city_none')}</p>}

          {Object.keys(load.data.byMonth).length > 0 && (
            <section>
              <h2 className="text-[0.9375rem] font-semibold text-white">{t('city_by_month')}</h2>
              <div className="mt-2.5">
                <BarList rows={Object.entries(load.data.byMonth).map(([label, value]) => ({ label, value }))} />
              </div>
            </section>
          )}

          {Object.keys(load.data.byType).length > 0 && (
            <section>
              <h2 className="text-[0.9375rem] font-semibold text-white">{t('hist_panel_types')}</h2>
              <div className="mt-2 flex flex-col gap-1.5">
                {Object.entries(load.data.byType)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, count]) => (
                    <div key={key} className="flex items-center justify-between gap-3 text-[0.8125rem]">
                      <span className="text-fg-muted">{tThreat(key) || key}</span>
                      <span className="tabular-nums text-fg-muted">{count}</span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {load.data.recent.length > 0 && (
            <section>
              <h2 className="text-[0.9375rem] font-semibold text-white">{t('city_recent')}</h2>
              <div className="mt-2 flex flex-col gap-2">
                {load.data.recent.map((ev) => (
                  <SpaLink
                    key={ev.id}
                    href={`/alert/${encodeURIComponent(ev.id ?? '')}`}
                    className="block rounded-md border border-white/[0.08] bg-card px-3 py-2.5 transition hover:bg-card-hover"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${KIND_DOT[ev.kind ?? ''] ?? 'bg-rose-500'}`} />
                      <span className={`text-[0.8125rem] font-semibold ${KIND_TXT[ev.kind ?? ''] ?? 'text-rose-400'}`}>
                        {ev.title || t('alert_generic')}
                      </span>
                    </span>
                    {lang !== 'he' && tThreat(ev.key) && (
                      <span className="mt-0.5 block text-[0.6875rem] text-fg-muted">{tThreat(ev.key)}</span>
                    )}
                    <span className="mt-1 block text-[0.6875rem] tabular-nums text-fg-faint">
                      {ev.ts ? fmtDateTime(ev.ts) : ''} · {t('areas_n', { n: ev.cities?.length ?? 0 })}
                    </span>
                  </SpaLink>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </ArchiveShell>
  )
}
