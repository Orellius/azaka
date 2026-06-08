import type { ReactNode } from 'react'
import { BarList, VBars } from './charts'
import { useHistoryStats, type HistoryEvent } from './useHistoryStats'
import { navigate } from '../router'
import { useLang } from '../i18n/useLang'

// Historical statistics dashboard, in the spirit of tzevaadom's /historical page. All figures come
// server-aggregated from the relay's year-partitioned log; pick a year or view all. UI is translated
// via useLang; numbers keep he-IL grouping (digits are language-neutral).
const SIZE_ORDER = ['1', '2-5', '6-20', '21-100', '100+']
const KIND_BAR: Record<string, string> = { active: 'bg-rose-500', special: 'bg-rose-500', early: 'bg-amber-500' }

type T = ReturnType<typeof useLang>['t']

// Historical type-chart label: reuse the shared threat names; flash reads as "early warning" here and
// unknown as "other".
function typeLabel(key: string, t: T, tThreat: ReturnType<typeof useLang>['tThreat']): string {
  if (key === 'flash') return t('status_early')
  if (!key || key === 'unknown') return t('hist_other')
  return tThreat(key) || t('hist_other')
}

function fmtRange(from: number | null, to: number | null, t: T): string {
  if (!from || !to) return t('hist_no_data')
  const opt = { day: '2-digit', month: '2-digit', year: '2-digit' } as const
  const a = new Date(from).toLocaleDateString('he-IL', opt)
  const b = new Date(to).toLocaleDateString('he-IL', opt)
  return a === b ? a : `${a} – ${b}`
}

export function HistoricalView() {
  const { t, tThreat } = useLang()
  const { years, year, setYear, stats, recent, loading, error } = useHistoryStats()

  const typeRows = stats
    ? Object.entries(stats.byType)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: typeLabel(k, t, tThreat), value: v }))
    : []
  const sizeRows = stats ? SIZE_ORDER.map((b) => ({ label: b === '1' ? t('hist_size_1') : b, value: stats.byEventSize[b] ?? 0 })) : []
  const cityRows = stats ? stats.topCities.map((c) => ({ label: c.name, value: c.count })) : []
  const dayValues = stats ? Object.values(stats.byDay) : []

  return (
    <div className="h-screen w-screen overflow-y-auto bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-5 py-6">
        <header className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-slate-200 transition hover:bg-white/10"
          >
            {t('hist_live_map')}
          </button>
          <div className="leading-tight">
            <h1 className="text-xl font-bold text-white">{t('hist_stats')}</h1>
            <p className="text-[11px] text-slate-400">
              {t('hist_subtitle')} · {fmtRange(stats?.range.from ?? null, stats?.range.to ?? null, t)}
            </p>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-1.5">
            <YearChip active={year === null} onClick={() => setYear(null)}>
              {t('hist_all')}
            </YearChip>
            {years.map((y) => (
              <YearChip key={y.year} active={year === y.year} onClick={() => setYear(y.year)}>
                {y.year}
              </YearChip>
            ))}
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {t('hist_relay_error')}
          </div>
        )}

        {!stats || loading ? (
          <div className="py-20 text-center text-sm text-slate-500">{t('hist_loading')}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Card value={stats.totalEvents.toLocaleString('he-IL')} label={t('hist_card_alerts')} />
              <Card value={stats.totalSirens.toLocaleString('he-IL')} label={t('hist_card_sirens')} />
              <Card value={stats.uniqueCities.toLocaleString('he-IL')} label={t('hist_card_unique')} />
              <Card value={fmtRange(stats.range.from, stats.range.to, t)} label={t('hist_card_range')} small />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Panel title={t('hist_panel_hour')}>
                <VBars values={stats.byHour} labels={['00', '06', '12', '18', '23']} />
              </Panel>
              <Panel title={t('hist_panel_day')}>
                {dayValues.length > 0 ? <VBars values={dayValues} color="#f59e0b" /> : <Empty />}
              </Panel>
              <Panel title={t('hist_panel_types')}>{typeRows.length ? <BarList rows={typeRows} /> : <Empty />}</Panel>
              <Panel title={t('hist_panel_size')}>
                <BarList rows={sizeRows} color="#f59e0b" />
              </Panel>
              <Panel title={t('hist_panel_cities')} className="md:col-span-2">
                <div className="max-h-72 overflow-y-auto pe-1">{cityRows.length ? <BarList rows={cityRows} /> : <Empty />}</div>
              </Panel>
            </div>

            <Panel title={t('hist_panel_recent')} className="mt-4">
              <div className="flex flex-col gap-2">
                {recent.length === 0 && <Empty />}
                {recent.map((e, i) => (
                  <EventRow key={`${e.ts}-${i}`} e={e} />
                ))}
              </div>
            </Panel>

            <p className="mt-6 text-center text-[10px] text-slate-600">{t('hist_source')}</p>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
      <div className={`font-bold tabular-nums text-white ${small ? 'text-base' : 'text-2xl'}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-400">{label}</div>
    </div>
  )
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className ?? ''}`}>
      <h2 className="mb-3 text-[13px] font-semibold text-slate-200">{title}</h2>
      {children}
    </section>
  )
}

function YearChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
        active ? 'bg-rose-600 text-white' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

function EventRow({ e }: { e: HistoryEvent }) {
  const { t, tThreat } = useLang()
  const time = e.ts ? new Date(e.ts).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
  const bar = e.type === 'clear' ? 'bg-emerald-500' : KIND_BAR[e.kind ?? 'active'] ?? 'bg-rose-500'
  const title = e.type === 'clear' ? t('status_cleared') : e.title || typeLabel(e.key ?? 'unknown', t, tThreat)
  const cities = e.cities ?? []
  return (
    <div className="flex gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className={`w-1.5 shrink-0 ${bar}`} />
      <div className="min-w-0 flex-1 px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13px] font-semibold text-slate-100">{title}</span>
          <span className="shrink-0 text-[10px] text-slate-500">
            {time} · {t('hist_localities_n', { n: cities.length })}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{cities.join(', ')}</div>
      </div>
    </div>
  )
}

function Empty() {
  const { t } = useLang()
  return <div className="py-6 text-center text-[12px] text-slate-600">{t('hist_no_data')}</div>
}
