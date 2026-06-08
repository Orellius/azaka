import { Fragment, useEffect, useState } from 'react'
import { AlertMap } from './map/AlertMap'
import { FlameIcon } from './map/FireLayer'
import { useAlertFeed, type FeedEvent, type FeedStatus } from './alerts/useAlertFeed'
import { AlertIcon } from './alerts/AlertIcon'
import { useNotifier } from './notify/useNotifier'
import { AlertToggle } from './notify/AlertToggle'
import { useMyArea } from './myarea/useMyArea'
import { usePersonalAlert } from './myarea/usePersonalAlert'
import { PersonalAlertBanner } from './myarea/PersonalAlertBanner'
import { MyAreaControl } from './myarea/MyAreaControl'
import { WhereToShelter } from './shelter/WhereToShelter'
import { useFirms, type FireDetection } from './firms/useFirms'
import { FIRMS_CREDIT, anomalyAge, confLabel, groupAnomalies, type AnomalyGroup } from './firms/anomaly'
import { openCookieSettings } from './consent/consentStore'
import { navigate } from './router'
import { useLang } from './i18n/useLang'
import { LangChips } from './i18n/LangChips'
import type { StringKey } from './i18n/strings'

const FIRMS_PREF = 'azaka_firms'

// Dashboard shell: full-bleed alert map + a dark-glass command panel. The panel is a tzevaadom-style
// FEED: one card per alert event, grouping all of its areas. Colour by severity: red active / amber
// early / green ended. oref's verbatim title/desc shows at top while an alert is live; a translated
// guidance aid sits beside it. UI strings come from useLang (he/en/ar/ru); place names + oref text are
// never translated. All state comes from useAlertFeed.
const STATUS_DOT: Record<string, string> = { live: 'bg-emerald-400', connecting: 'bg-amber-400', error: 'bg-rose-500' }
const STATUS_KEY: Record<string, StringKey> = { live: 'status_live', connecting: 'status_connecting', error: 'status_error' }
const SEV: Record<FeedEvent['severity'], { bar: string; txt: string; border: string }> = {
  active: { bar: 'bg-rose-500', txt: 'text-rose-400', border: 'border-rose-500/50' },
  special: { bar: 'bg-rose-500', txt: 'text-rose-400', border: 'border-rose-500/50' },
  early: { bar: 'bg-amber-500', txt: 'text-amber-400', border: 'border-amber-500/50' },
  cleared: { bar: 'bg-emerald-500', txt: 'text-emerald-400', border: 'border-emerald-500/50' },
}
// hex equivalents for the MapLibre snapshot highlight (paint props need hex, not Tailwind classes)
const SEV_HEX: Record<FeedEvent['severity'], string> = {
  active: '#ff2532',
  special: '#ff2532',
  early: '#f59e0b',
  cleared: '#10b981',
}

function relTime(ts: number, t: ReturnType<typeof useLang>['t']): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return t('rel_now')
  if (mins === 1) return t('rel_1min')
  if (mins < 60) return t('rel_min', { n: mins })
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? t('rel_1hr') : t('rel_hr', { n: hrs })
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="text-[13px] font-medium tabular-nums text-slate-300">
      {now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

export function MapDashboard() {
  const { t, tGuide, lang, tThreat } = useLang()
  const { activeAreas, earlyAreas, clearedAreas, status, lastAt, instruction, events, lastLiveAlert } = useAlertFeed()
  const [myArea, setMyArea] = useMyArea()
  const notifier = useNotifier(lastLiveAlert, myArea?.name ?? null)
  const personal = usePersonalAlert(myArea?.name ?? null, activeAreas, earlyAreas, clearedAreas, lastLiveAlert)
  const firms = useFirms()
  const [firmsOn, setFirmsOn] = useState(() => {
    try {
      return localStorage.getItem(FIRMS_PREF) === 'on' // off by default; opt-in
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(FIRMS_PREF, firmsOn ? 'on' : 'off')
    } catch {
      // private mode / storage disabled: the toggle still works for this session
    }
  }, [firmsOn])
  const [snapshot, setSnapshot] = useState<FeedEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(true) // mobile bottom-sheet expanded by default; desktop ignores it

  const alerting = activeAreas.size > 0
  const warning = earlyAreas.size > 0
  const headDot = alerting ? 'bg-rose-500' : warning ? 'bg-amber-500' : clearedAreas.size > 0 ? 'bg-emerald-500' : 'bg-slate-500'

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <AlertMap
        activeAreas={activeAreas}
        earlyAreas={earlyAreas}
        clearedAreas={clearedAreas}
        fires={firmsOn ? firms.detections : []}
        snapshot={snapshot ? snapshot.cities : null}
        snapshotColor={snapshot ? SEV_HEX[snapshot.severity] : undefined}
      />

      {myArea && personal && <PersonalAlertBanner area={myArea} personal={personal} />}

      <div className="pointer-events-none absolute inset-0 p-4">
        {snapshot && <SnapshotBanner event={snapshot} onClose={() => setSnapshot(null)} lowered={!!(myArea && personal)} />}
        <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-20 flex max-h-[78vh] flex-col gap-3 rounded-t-2xl border border-white/10 bg-slate-950/90 p-3 shadow-2xl backdrop-blur-md sm:static sm:me-auto sm:max-h-[calc(100vh-2rem)] sm:w-80 sm:max-w-[88vw] sm:rounded-2xl sm:bg-slate-950/85 sm:p-4">
          <button
            type="button"
            onClick={() => setSheetOpen((v) => !v)}
            aria-label={sheetOpen ? t('sheet_collapse') : t('sheet_expand')}
            className="mx-auto -mt-1 h-1.5 w-10 shrink-0 rounded-full bg-white/25 transition hover:bg-white/40 sm:hidden"
          />

          <LangChips />

          <header className="flex shrink-0 items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              {(alerting || warning) && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${headDot} opacity-75`} />
              )}
              <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${headDot}`} />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-white">אזעקה</div>
              <div className="text-[11px] text-slate-400">{t('brand_sub')}</div>
            </div>
            <div className="ms-auto flex items-center gap-2">
              <LiveClock />
              <AlertToggle enabled={notifier.enabled} onToggle={notifier.toggle} />
              <button
                type="button"
                onClick={() => setSheetOpen((v) => !v)}
                aria-label={sheetOpen ? t('sheet_collapse') : t('sheet_expand')}
                aria-expanded={sheetOpen}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 sm:hidden"
              >
                <svg className={`size-4 transition-transform ${sheetOpen ? '' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </header>

          <div className={`feed-scroll min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${sheetOpen ? 'flex' : 'hidden'} sm:flex`}>

          {notifier.enabled && notifier.perm === 'default' && (
            <button
              type="button"
              onClick={() => void notifier.requestPermission()}
              className="rounded-lg border border-sky-400/30 bg-sky-400/10 px-3 py-1.5 text-start text-[11px] font-medium text-sky-200 transition hover:bg-sky-400/20"
            >
              {t('notif_enable')}
            </button>
          )}
          {notifier.enabled && notifier.perm === 'denied' && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] text-slate-400">
              {t('notif_denied')}
            </div>
          )}

          <MyAreaControl myArea={myArea} onChange={setMyArea} tier={personal?.tier ?? null} />

          <WhereToShelter alerting={alerting || warning} />

          {(alerting || warning) && instruction && (instruction.title || instruction.desc) && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-2.5">
              {instruction.title && <div className="text-[15px] font-bold text-rose-100">{instruction.title}</div>}
              {lang !== 'he' && tThreat(instruction.key) && (
                <div className="text-[12px] font-semibold text-rose-200/90">{tThreat(instruction.key)}</div>
              )}
              {instruction.desc && <div className="mt-0.5 text-[12px] text-rose-100/90">{instruction.desc}</div>}
              {instruction.remain === 'tenmin' && (
                <div className="mt-1 text-[12px] text-rose-100/80">{tGuide('tenmin')}</div>
              )}
              <div className="mt-1 text-[11px] text-rose-200/80">{t('areas_active', { n: activeAreas.size })}</div>
              {instruction.remain === 'release' && (
                <div className="mt-1.5 text-[11px] font-semibold text-amber-200">{t('wait_release')}</div>
              )}
            </div>
          )}

          {events.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-slate-400">
              {t('feed_empty')}
            </div>
          ) : (
            <div className="feed-scroll flex max-h-[28rem] min-h-0 flex-col gap-2.5 overflow-y-auto pe-1">
              {events.map((ev) => (
                <EventCard key={ev.id} ev={ev} active={snapshot?.id === ev.id} onSelect={() => setSnapshot(ev)} />
              ))}
            </div>
          )}

          {firms.configured && (
            <FirmsPanel detections={firms.detections} on={firmsOn} onToggle={() => setFirmsOn((v) => !v)} />
          )}

          <SidebarFooter lastAt={lastAt} status={status} />
          </div>
        </div>
      </div>
    </div>
  )
}

function SnapshotBanner({ event, onClose, lowered = false }: { event: FeedEvent; onClose: () => void; lowered?: boolean }) {
  const { t } = useLang()
  const sev = SEV[event.severity]
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true)) // fade in on mount
    return () => cancelAnimationFrame(id)
  }, [])
  const close = () => {
    setVisible(false)
    window.setTimeout(onClose, 200) // let the fade-out finish before unmount
  }
  return (
    <div
      className={`pointer-events-auto absolute left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-xl border bg-slate-950/90 px-3 py-2 shadow-2xl backdrop-blur-md transition-opacity duration-200 ${lowered ? 'top-24' : 'top-4'} ${sev.border} ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${sev.bar}`} />
      <div className="min-w-0 text-[12px] text-slate-200">
        <span className={`font-semibold ${sev.txt}`}>{t('snap_label')}</span>
        {' · '}
        {event.title || t('alert_generic')} · {t('areas_n', { n: event.cities.length })} ·{' '}
        {new Date(event.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('snap_close')}
        className="shrink-0 text-slate-400 transition hover:text-white"
      >
        ✕
      </button>
    </div>
  )
}

function EventCard({ ev, active, onSelect }: { ev: FeedEvent; active: boolean; onSelect: () => void }) {
  const { t, lang, tThreat } = useLang()
  const c = SEV[ev.severity]
  const [expanded, setExpanded] = useState(false)
  const time = new Date(ev.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const long = ev.cities.length > 12 // collapse long lists; the card stays clickable for the map snapshot
  // translated threat-type aid beside oref's verbatim Hebrew title (shown only for non-Hebrew readers)
  const threat = tThreat(ev.key ?? (ev.severity === 'cleared' ? 'update' : undefined))
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`w-full shrink-0 cursor-pointer rounded-xl border bg-white/5 px-3 py-2.5 text-start transition hover:bg-white/10 ${active ? 'border-cyan-400/70 ring-1 ring-cyan-400/40' : 'border-white/10'}`}
    >
      <div className="flex items-center gap-2">
        <AlertIcon ev={ev} className={`size-4 shrink-0 ${c.txt}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-[13px] font-semibold leading-tight ${c.txt}`}>{ev.title || t('alert_generic')}</div>
          {lang !== 'he' && threat && threat !== ev.title && (
            <div className="text-[10px] font-medium text-slate-400">{threat}</div>
          )}
        </div>
      </div>
      <div className="mt-1 text-[10px] text-slate-500">
        {relTime(ev.ts, t)} · {time} · {t('areas_n', { n: ev.cities.length })}
      </div>
        <div
          className={`mt-1.5 break-words text-[11px] leading-relaxed text-slate-300 ${long && !expanded ? 'line-clamp-3' : ''}`}
        >
          {ev.cities.join(', ')}
        </div>
        {long && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="mt-1.5 text-[10px] font-medium text-cyan-400/90 transition hover:text-cyan-300"
          >
            {expanded ? t('show_less') : t('show_all', { n: ev.cities.length })}
          </button>
        )}
    </div>
  )
}

const LEGEND: Array<{ color: string; key: StringKey }> = [
  { color: 'bg-rose-500', key: 'status_active' },
  { color: 'bg-amber-500', key: 'status_early' },
  { color: 'bg-emerald-500', key: 'status_cleared' },
]

const FOOTER_LINKS: Array<{ key: StringKey; path: string }> = [
  { key: 'nav_about', path: '/about' },
  { key: 'nav_privacy', path: '/privacy' },
  { key: 'nav_terms', path: '/terms' },
  { key: 'nav_contact', path: '/contact' },
]

function FirmsPanel({ detections, on, onToggle }: { detections: FireDetection[]; on: boolean; onToggle: () => void }) {
  const { t } = useLang()
  const groups = on ? groupAnomalies(detections) : []
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-orange-500/25 bg-orange-500/5 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-orange-500">
          <FlameIcon className="size-3.5 drop-shadow" />
        </span>
        <h2 className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-orange-200">{t('firms_title')}</h2>
        <span className="ms-auto whitespace-nowrap text-[10px] text-slate-500">{detections.length} · {t('firms_24h')}</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={t('firms_toggle')}
          onClick={onToggle}
          className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? 'bg-orange-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? 'start-0.5' : 'end-0.5'}`} />
        </button>
      </div>

      {on ? (
        groups.length > 0 ? (
          <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pe-1">
            {groups.map((g) => (
              <AnomalyGroupCard key={g.key} g={g} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white/5 px-2.5 py-2 text-center text-[11px] text-slate-400">
            {t('firms_none')}
          </div>
        )
      ) : (
        <div className="text-[10px] text-slate-500">{t('firms_off')}</div>
      )}

      {on && (
        <p className="text-[9px] leading-relaxed text-slate-500">
          {t('firms_disclaimer')} · {FIRMS_CREDIT}
        </p>
      )}
    </section>
  )
}

function AnomalyGroupCard({ g }: { g: AnomalyGroup }) {
  const { t } = useLang()
  return (
    <div className="flex overflow-hidden rounded-lg border border-orange-500/20 bg-orange-500/5">
      <div className="w-1 shrink-0 bg-orange-400/80" />
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 break-words text-[12px] font-semibold text-orange-100">
            {t('firms_anomaly')}{g.label ? ` · ${g.label}` : ''}
          </span>
          <span className="ms-auto shrink-0 whitespace-nowrap text-[10px] text-slate-500">{anomalyAge(g.latestTs)}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          {g.count > 1 ? `${t('firms_detections', { n: g.count })} · ` : ''}
          {confLabel(g.topConf)}
          {g.maxFrp ? ` · ${g.maxFrp} MW` : ''}
        </div>
      </div>
    </div>
  )
}

function SidebarFooter({ lastAt, status }: { lastAt: number | null; status: FeedStatus }) {
  const { t } = useLang()
  return (
    <footer className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
      <a
        href="/historical"
        onClick={(e) => {
          e.preventDefault()
          navigate('/historical')
        }}
        className="text-[11px] font-medium text-sky-400 transition hover:text-sky-300"
      >
        {t('hist_stats')}
      </a>

      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {LEGEND.map((l) => (
            <div key={l.key} className="flex items-center gap-2">
              <span className={`h-2.5 w-6 shrink-0 rounded-full ${l.color}`} />
              <span className="text-[10px] text-slate-300">{t(l.key)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="flex w-6 shrink-0 justify-center text-orange-500">
              <FlameIcon className="size-3.5 drop-shadow" />
            </span>
            <span className="text-[10px] text-slate-300">{t('legend_firms')}</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-amber-100/90">
        <span className="font-bold text-amber-200">{t('disclaimer_bold')}</span> {t('disclaimer_text')}
        <span className="mt-1 block text-amber-100/60">{t('disclaimer_source')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
        {FOOTER_LINKS.map((link, i) => (
          <Fragment key={link.path}>
            {i > 0 && <span aria-hidden>·</span>}
            <button type="button" onClick={() => navigate(link.path)} className="transition hover:text-slate-300">
              {t(link.key)}
            </button>
          </Fragment>
        ))}
        <span aria-hidden>·</span>
        <button type="button" onClick={openCookieSettings} className="transition hover:text-slate-300">
          {t('nav_cookies')}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-600">
        <span>
          {t('rights')}
          {lastAt ? ` · ${t('updated', { time: new Date(lastAt).toLocaleTimeString('he-IL') })}` : ''}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-slate-400">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {t(STATUS_KEY[status])}
        </span>
      </div>
    </footer>
  )
}
