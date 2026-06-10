import { useEffect, useState } from 'react'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import { usePageMeta } from '../seo/usePageMeta'
import { ArchiveShell, SpaLink } from './ArchiveShell'

// Event permalink page (/alert/<id>): one oref event from the relay's history log, verbatim. Title +
// desc are oref's own Hebrew text (never paraphrased); the translated threat name is an aid beside
// them. Every alerted locality links to its /city/ page, which is what makes the archive crawlable in
// both directions. Honest states: loading / relay-error / not-found, no fabricated content.
// Public surface: <AlertEventPage id={decodedId} />.

const WS = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')

type HistoryEvent = {
  type?: string
  kind?: string
  id?: string
  key?: string
  title?: string
  desc?: string
  cities?: string[]
  ts?: number
}
type Load = { s: 'loading' } | { s: 'error' } | { s: 'notfound' } | { s: 'ok'; event: HistoryEvent }

// severity badge: clears are emerald, early amber, active/special rose (same semantics as the feed)
function badgeOf(ev: HistoryEvent): { cls: string; label: 'status_active' | 'status_early' | 'status_cleared' } {
  if (ev.type === 'clear') return { cls: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400', label: 'status_cleared' }
  if (ev.kind === 'early') return { cls: 'border-amber-500/50 bg-amber-500/10 text-amber-400', label: 'status_early' }
  return { cls: 'border-rose-500/50 bg-rose-500/10 text-rose-400', label: 'status_active' }
}

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function AlertEventPage({ id }: { id: string }) {
  const { t, lang, tThreat } = useLang()
  const localizeArea = useAreaName()
  const [load, setLoad] = useState<Load>({ s: 'loading' })

  const ev = load.s === 'ok' ? load.event : null
  usePageMeta(
    ev
      ? t('alert_meta_title', { title: ev.title || t('alert_generic'), date: ev.ts ? fmtDateTime(ev.ts) : '' })
      : `${t('alert_event_title')} | ${t('brand')}`,
    ev ? t('alert_meta_desc', { n: ev.cities?.length ?? 0 }) : t('alert_meta_desc', { n: '' }),
  )

  useEffect(() => {
    let alive = true
    fetch(`${RELAY_HTTP}/history/event?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!alive) return
        if (r.status === 404) return setLoad({ s: 'notfound' })
        if (!r.ok) return setLoad({ s: 'error' })
        const d = (await r.json()) as { event: HistoryEvent }
        setLoad({ s: 'ok', event: d.event })
      })
      .catch(() => alive && setLoad({ s: 'error' }))
    return () => {
      alive = false
    }
  }, [id])

  return (
    <ArchiveShell>
      {load.s === 'loading' && <p className="text-[0.8125rem] text-slate-400">{t('hist_loading')}</p>}
      {load.s === 'error' && <p className="text-[0.8125rem] text-rose-300">{t('hist_relay_error')}</p>}
      {load.s === 'notfound' && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">{t('alert_event_title')}</h1>
          <p className="mt-3 text-[0.8125rem] text-slate-400">{t('alert_not_found')}</p>
        </div>
      )}

      {ev && (
        <div>
          <Badge ev={ev} />
          <h1 className="mt-3 text-2xl font-bold leading-snug tracking-tight text-white">
            {ev.title || t('alert_generic')}
          </h1>
          {lang !== 'he' && tThreat(ev.key) && <p className="mt-1 text-[0.9375rem] text-slate-400">{tThreat(ev.key)}</p>}
          {ev.desc && <p className="mt-3 text-[0.9375rem] leading-relaxed text-slate-300">{ev.desc}</p>}
          {ev.ts != null && <p className="mt-3 text-[0.8125rem] tabular-nums text-slate-400">{fmtDateTime(ev.ts)}</p>}

          <div className="mt-5">
            <SpaLink
              href="/"
              className="inline-block rounded-lg bg-fg px-4 py-2 text-[0.8125rem] font-semibold text-surface transition hover:opacity-90"
            >
              {t('hist_live_map')}
            </SpaLink>
          </div>

          {(ev.cities?.length ?? 0) > 0 && (
            <section className="mt-7">
              <h2 className="text-[0.9375rem] font-semibold text-white">{t('areas_n', { n: ev.cities!.length })}</h2>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {ev.cities!.map((c) => (
                  <SpaLink
                    key={c}
                    href={`/city/${encodeURIComponent(c)}`}
                    className="rounded-md border border-white/[0.08] bg-card px-2 py-1 text-[0.75rem] text-slate-300 transition hover:bg-card-hover hover:text-white"
                  >
                    {localizeArea(c)}
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

function Badge({ ev }: { ev: HistoryEvent }) {
  const { t } = useLang()
  const b = badgeOf(ev)
  return (
    <span className={`inline-block rounded-md border px-2 py-0.5 text-[0.75rem] font-semibold ${b.cls}`}>
      {t(b.label)}
    </span>
  )
}
