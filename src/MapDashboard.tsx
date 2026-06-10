import { useEffect, useState } from 'react'
import { AlertMap } from './map/AlertMap'
import { useAlertFeed, type FeedEvent, type FeedStatus } from './alerts/useAlertFeed'
import { AlertIcon } from './alerts/AlertIcon'
import { useNotifier } from './notify/useNotifier'
import { AlertToggle } from './notify/AlertToggle'
import { useMyArea } from './myarea/useMyArea'
import { usePersonalAlert } from './myarea/usePersonalAlert'
import { PersonalAlertBanner } from './myarea/PersonalAlertBanner'
import { MyAreaControl } from './myarea/MyAreaControl'
import { WhereToShelter } from './shelter/WhereToShelter'
import { openCookieSettings, setAlertingNow } from './consent/consentStore'
import { navigate } from './router'
import { useLang } from './i18n/useLang'
import { useAreaName, useRegions } from './i18n/areaNames'
import { LangChips } from './i18n/LangChips'
import { usePageMeta } from './seo/usePageMeta'
import type { StringKey } from './i18n/strings'

// Dashboard shell: full-bleed alert map + a dark-glass command panel. The panel is a tzevaadom-style
// FEED: one card per alert event, grouping all of its areas. Colour by severity: red active / amber
// early / green ended. oref's verbatim title/desc shows at top while an alert is live; a translated
// guidance aid sits beside it. UI strings come from useLang (he/en/ar/ru); place names + oref text are
// never translated. All state comes from useAlertFeed.
const STATUS_DOT: Record<string, string> = { live: 'bg-emerald-400', connecting: 'bg-amber-400', error: 'bg-rose-500' }
const STATUS_KEY: Record<string, StringKey> = { live: 'status_live', connecting: 'status_connecting', error: 'status_error' }
// severity colors are SEMANTIC and stay; containers are neutral surfaces with a colored start-border
const SEV: Record<FeedEvent['severity'], { bar: string; txt: string; border: string; accent: string }> = {
  active: { bar: 'bg-rose-500', txt: 'text-rose-400', border: 'border-rose-500/50', accent: 'border-s-rose-500' },
  special: { bar: 'bg-rose-500', txt: 'text-rose-400', border: 'border-rose-500/50', accent: 'border-s-rose-500' },
  early: { bar: 'bg-amber-500', txt: 'text-amber-400', border: 'border-amber-500/50', accent: 'border-s-amber-500' },
  cleared: { bar: 'bg-emerald-500', txt: 'text-emerald-400', border: 'border-emerald-500/50', accent: 'border-s-emerald-500' },
}
// hex equivalents for the MapLibre snapshot highlight (paint props need hex, not Tailwind classes)
const SEV_HEX: Record<FeedEvent['severity'], string> = {
  active: '#ff2532',
  special: '#ff2532',
  early: '#f59e0b',
  cleared: '#10b981',
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="flex flex-col items-end leading-tight">
      <span className="text-[0.8125rem] font-bold tabular-nums text-fg">
        {now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="text-[0.5625rem] font-semibold tabular-nums text-fg">
        {now.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
      </span>
    </span>
  )
}

export function MapDashboard() {
  const { t, tGuide, lang, tThreat } = useLang()
  usePageMeta(t('home_meta_title'), t('home_meta_desc')) // per-locale title + canonical/hreflang for / and /en /ar /ru
  const regionsOf = useRegions()
  const { activeAreas, earlyAreas, clearedAreas, status, lastAt, instruction, events, lastLiveAlert } = useAlertFeed()
  const [myArea, setMyArea] = useMyArea()
  const notifier = useNotifier(lastLiveAlert, myArea?.name ?? null)
  const personal = usePersonalAlert(myArea?.name ?? null, activeAreas, earlyAreas, clearedAreas, lastLiveAlert)
  const [snapshot, setSnapshot] = useState<FeedEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false) // mobile: feed dropdown collapsed by default (tap the hamburger); desktop ignores it
  const [panelOpen, setPanelOpen] = useState(true) // desktop: sidebar expanded by default; edge drawer-handle toggles it
  const [stackOpen, setStackOpen] = useState(false) // mobile: alert stack starts as a compact peek bar so the painted map stays visible

  const alerting = activeAreas.size > 0
  const warning = earlyAreas.size > 0
  // render-phase reset (no setState-in-effect): every new event starts with the stack compact and the
  // feed sheet closed, so the map's painted areas are what the user sees first on a phone
  const [wasAlerting, setWasAlerting] = useState(false)
  if ((alerting || warning) !== wasAlerting) {
    setWasAlerting(alerting || warning)
    if (alerting || warning) {
      setStackOpen(false)
      setSheetOpen(false)
    }
  }
  // cookie banner suppression while an alert is live (consent can wait, safety can't)
  useEffect(() => {
    setAlertingNow(alerting || warning)
    return () => setAlertingNow(false)
  }, [alerting, warning])
  const activeRegions = regionsOf([...activeAreas, ...earlyAreas])
  const headDot = alerting ? 'bg-rose-500' : warning ? 'bg-amber-500' : clearedAreas.size > 0 ? 'bg-emerald-500' : 'bg-fg-faint'
  const lowered = !!(myArea && personal) // the personal banner owns the very top; push top-anchored chrome below it

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <AlertMap
        activeAreas={activeAreas}
        earlyAreas={earlyAreas}
        clearedAreas={clearedAreas}
        snapshot={snapshot ? snapshot.cities : null}
        snapshotColor={snapshot ? SEV_HEX[snapshot.severity] : undefined}
      />

      {/* Brand chip over the map; yields its corner to the alert instruction stack during an event */}
      {!(alerting || warning) && (
        <a
          href="/"
          className="absolute top-3 end-3 z-10 flex max-w-[calc(100vw-1.5rem)] items-center gap-2.5 rounded-lg border border-white/[0.08] bg-surface/90 px-3.5 py-2 shadow-lg shadow-black/30"
        >
          <img src="/favicon.svg" alt="" className="h-7 w-7 shrink-0" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate whitespace-nowrap text-[0.8125rem] font-semibold leading-tight text-fg">
              אזעקה — ממסר עצמאי להתרעות פיקוד העורף
            </span>
            <span className="truncate whitespace-nowrap text-[0.625rem] leading-tight text-fg-faint">
              ללא זיקה לפיקוד העורף · מציגים את ההתרעות הרשמיות בלבד
            </span>
          </span>
        </a>
      )}

      {myArea && personal && <PersonalAlertBanner area={myArea} personal={personal} />}

      <div className="pointer-events-none absolute inset-0 p-4">
        {snapshot && <SnapshotBanner event={snapshot} onClose={() => setSnapshot(null)} lowered={lowered} />}

        {/* Active-alert STACK over the map, outside the panel: the "what to do now" instruction with
            the "where to shelter" guidance beneath it. Bottom toast on phones (the panel lives at the
            top now), top + inline-end (left in RTL, opposite the panel) on desktop. Both appear together
            during an active/early alert and vanish when everything is green. */}
        {(alerting || warning) && !stackOpen && (
          /* Mobile peek bar: the verbatim oref title stays visible (safety: never hidden), one line of
             the official instruction, one tap away from the full stack. Desktop always shows the stack. */
          <button
            type="button"
            onClick={() => setStackOpen(true)}
            aria-expanded={false}
            role="alert"
            className="pointer-events-auto fixed inset-x-3 bottom-3 z-20 rounded-xl border border-rose-500/60 bg-rose-950/95 px-3.5 py-2.5 text-start shadow-2xl backdrop-blur-md sm:hidden"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-bold text-rose-50">
                {instruction?.title || t('shelter_where_title')}
              </span>
              <svg className="size-4 shrink-0 text-rose-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m18 15-6-6-6 6" />
              </svg>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[0.75rem] text-rose-100/90">
              <span className="min-w-0 flex-1 truncate">
                {instruction?.desc || t('areas_active', { n: activeAreas.size })}
              </span>
              <span className="shrink-0 font-semibold text-rose-200">{t('stack_expand')}</span>
            </div>
          </button>
        )}
        {(alerting || warning) && (
          <div
            className={`feed-scroll pointer-events-auto fixed inset-x-3 bottom-3 z-20 max-h-[60vh] flex-col gap-2 overflow-y-auto sm:flex sm:inset-x-auto sm:bottom-auto sm:end-4 sm:max-h-[calc(100vh-2rem)] sm:w-80 sm:max-w-[calc(100vw-23rem)] xl:max-w-[calc(100vw-27rem)] ${lowered ? 'sm:top-28' : 'sm:top-4'} ${stackOpen ? 'flex' : 'hidden'}`}
          >
            <button
              type="button"
              onClick={() => setStackOpen(false)}
              aria-expanded
              className="pointer-events-auto flex items-center gap-1.5 self-end rounded-full border border-white/20 bg-surface/90 px-3 py-1 text-[0.6875rem] font-medium text-fg shadow-lg backdrop-blur-sm sm:hidden"
            >
              {t('stack_collapse')}
              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {instruction && (instruction.title || instruction.desc) && (
              <div className="rounded-xl border border-rose-500/60 bg-rose-950/95 px-3.5 py-3 shadow-2xl backdrop-blur-md" role="alert">
                {instruction.title && <div className="text-[0.9375rem] font-bold text-rose-50">{instruction.title}</div>}
                {lang !== 'he' && tThreat(instruction.key) && (
                  <div className="text-[0.75rem] font-semibold text-rose-200/90">{tThreat(instruction.key)}</div>
                )}
                {instruction.desc && <div className="mt-0.5 text-[0.8125rem] text-rose-100/95">{instruction.desc}</div>}
                {activeRegions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {activeRegions.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-md border border-rose-200/30 bg-rose-500/30 px-1.5 py-0.5 text-[0.625rem] font-semibold text-rose-50"
                      >
                        {r.name}
                        {r.count > 1 ? ` · ${r.count}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {instruction.remain === 'tenmin' && (
                  <div className="mt-1 text-[0.75rem] text-rose-100/80">{tGuide('tenmin')}</div>
                )}
                <div className="mt-1 text-[0.6875rem] text-rose-200/80">{t('areas_active', { n: activeAreas.size })}</div>
                {instruction.remain === 'release' && (
                  <div className="mt-1.5 text-[0.6875rem] font-semibold text-amber-200">{t('wait_release')}</div>
                )}
              </div>
            )}
            <WhereToShelter alerting={alerting || warning} />
          </div>
        )}
        {/* Mobile: a slim top bar that drops the feed DOWN like a notification shade (tap the hamburger).
            Desktop (sm:): the familiar floating side card with the body always shown. */}
        {/* Desktop drawer: the collapse handle is a child of the panel, glued to its map-facing edge;
            when collapsed, a twin handle sits flush at the same screen edge to reopen it */}
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label={t('sheet_expand')}
          aria-expanded={false}
          aria-hidden={panelOpen}
          tabIndex={panelOpen ? -1 : 0}
          className={`fixed start-0 top-[4.5rem] z-20 hidden h-14 w-7 items-center justify-center rounded-e-lg border border-s-0 border-white/[0.08] bg-surface text-fg-muted shadow-lg shadow-black/30 transition-opacity duration-200 hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 sm:flex ${panelOpen ? 'pointer-events-none opacity-0' : 'pointer-events-auto opacity-100 delay-200'}`}
        >
          <svg className="size-4 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        <div
          className={`pointer-events-auto fixed inset-x-0 z-20 flex flex-col rounded-b-lg border-b border-white/[0.08] bg-surface shadow-lg shadow-black/50 transition-[transform,opacity] duration-300 ease-out sm:relative sm:me-auto sm:w-80 sm:max-w-[88vw] sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:rounded-lg sm:border xl:w-96 ${lowered ? 'top-24' : 'top-0'} sm:top-auto ${panelOpen ? '' : 'sm:pointer-events-none sm:-translate-x-[110%] sm:opacity-0 rtl:sm:translate-x-[110%]'}`}
        >
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label={t('sheet_collapse')}
            aria-expanded
            className="absolute start-full top-14 hidden h-14 w-7 items-center justify-center rounded-e-lg border border-s-0 border-white/[0.08] bg-surface text-fg-muted shadow-lg shadow-black/30 transition hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 sm:flex"
          >
            <svg className="size-4 rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <header className="flex shrink-0 items-center gap-3 p-3 sm:p-4 sm:pb-3">
            <span className="relative flex h-3.5 w-3.5">
              {(alerting || warning) && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${headDot} opacity-75`} />
              )}
              <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${headDot}`} />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight text-fg">{t('brand')}</div>
              <div className="text-[0.6875rem] text-fg-muted">{t('brand_sub')}</div>
            </div>
            <div className="ms-auto flex items-center gap-2">
              <LiveClock />
              <AlertToggle enabled={notifier.enabled} onToggle={notifier.toggle} />
              <button
                type="button"
                onClick={() => setSheetOpen((v) => !v)}
                aria-label={sheetOpen ? t('sheet_collapse') : t('sheet_expand')}
                aria-expanded={sheetOpen}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-card text-fg transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 sm:hidden"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {sheetOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
                </svg>
              </button>
            </div>
          </header>

          <div
            className={`feed-scroll flex min-h-0 flex-col gap-3 overflow-y-auto px-3 transition-[max-height,opacity,padding] duration-300 ease-out sm:max-h-none sm:flex-1 sm:overflow-hidden sm:px-4 sm:pb-4 sm:pt-0 sm:opacity-100 ${sheetOpen ? 'max-h-[72vh] pb-3 opacity-100' : 'max-h-0 pb-0 opacity-0'}`}
          >
          <LangChips />

          {notifier.enabled && notifier.perm === 'default' && (
            <button
              type="button"
              onClick={() => void notifier.requestPermission()}
              className="rounded-md border border-white/[0.08] bg-card px-3 py-1.5 text-start text-[0.6875rem] font-medium text-sky-300 transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {t('notif_enable')}
            </button>
          )}
          {notifier.enabled && notifier.perm === 'denied' && (
            <div className="rounded-md border border-white/[0.08] bg-card px-3 py-1.5 text-[0.625rem] text-fg-muted">
              {t('notif_denied')}
            </div>
          )}

          <MyAreaControl myArea={myArea} onChange={setMyArea} tier={personal?.tier ?? null} />

          {events.length === 0 ? (
            <div className="rounded-md border border-white/[0.08] bg-card px-3 py-3 text-center text-sm text-fg-muted">
              {t('feed_empty')}
            </div>
          ) : (
            <div className="feed-scroll flex max-h-[28rem] min-h-0 flex-col gap-2.5 overflow-y-auto pe-1 sm:max-h-none sm:flex-1">
              {events.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  active={snapshot?.id === ev.id}
                  onSelect={() => {
                    setSnapshot(ev)
                    setSheetOpen(false) // mobile: close the dropdown so the map snapshot is visible (no-op on desktop)
                  }}
                />
              ))}
            </div>
          )}

          <div className="sm:mt-auto">
            <SidebarFooter lastAt={lastAt} status={status} />
          </div>
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
      className={`pointer-events-auto absolute left-1/2 z-10 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-lg border bg-surface px-3 py-2 shadow-lg shadow-black/50 transition-opacity duration-200 ${lowered ? 'top-40 sm:top-24' : 'top-16 sm:top-4'} ${sev.border} ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${sev.bar}`} />
      <div className="min-w-0 text-[0.75rem] tabular-nums text-fg">
        <span className={`font-semibold ${sev.txt}`}>{t('snap_label')}</span>
        {' · '}
        {event.severity === 'cleared' ? t('status_cleared') : event.title || t('alert_generic')} · {t('areas_n', { n: event.cities.length })} ·{' '}
        {new Date(event.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
      </div>
      <button
        type="button"
        onClick={close}
        aria-label={t('snap_close')}
        className="shrink-0 rounded-md text-fg-faint transition hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      >
        ✕
      </button>
    </div>
  )
}

function EventCard({ ev, active, onSelect }: { ev: FeedEvent; active: boolean; onSelect: () => void }) {
  const { t, lang, tThreat, tAgo } = useLang()
  const localizeArea = useAreaName()
  const regionsOf = useRegions()
  const c = SEV[ev.severity]
  const [expanded, setExpanded] = useState(false)
  const time = new Date(ev.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const long = ev.cities.length > 12 // collapse long lists; the card stays clickable for the map snapshot
  // translated threat-type aid beside oref's verbatim Hebrew title (shown only for non-Hebrew readers)
  const threat = tThreat(ev.key ?? (ev.severity === 'cleared' ? 'update' : undefined))
  // named oref regions this event hits (Gaza Envelope, Conflict Line, ...), busiest first
  const regions = regionsOf(ev.cities)
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
      className={`w-full shrink-0 cursor-pointer rounded-md border border-s-2 bg-card px-3 py-2.5 text-start transition hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${c.accent} ${active ? 'border-cyan-400/70 ring-1 ring-cyan-400/40' : 'border-white/[0.08]'}`}
    >
      <div className="flex items-center gap-2">
        <AlertIcon ev={ev} className={`size-4 shrink-0 ${c.txt}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-[0.8125rem] font-semibold leading-tight ${c.txt}`}>
            {ev.severity === 'cleared' ? t('status_cleared') : ev.title || t('alert_generic')}
          </div>
          {lang !== 'he' && ev.severity !== 'cleared' && threat && threat !== ev.title && (
            <div className="text-[0.625rem] font-medium text-fg-muted">{threat}</div>
          )}
        </div>
      </div>
      {regions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {regions.map((r) => (
            <span
              key={r.id}
              className="rounded border border-white/[0.08] bg-card-hover px-1.5 py-0.5 text-[0.625rem] font-medium text-fg-muted"
            >
              {r.name}
              {r.count > 1 ? ` · ${r.count}` : ''}
            </span>
          ))}
        </div>
      )}
      <div className="mt-1 text-[0.625rem] tabular-nums text-fg-faint">
        <span className="font-medium text-fg">
          {tAgo(ev.ts)} · {time}
        </span>{' '}
        · {t('areas_n', { n: ev.cities.length })}
      </div>
        <div
          className={`mt-1.5 break-words text-[0.6875rem] font-medium leading-relaxed text-fg ${long && !expanded ? 'line-clamp-3' : ''}`}
        >
          {ev.cities.map(localizeArea).join(', ')}
        </div>
        {long && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="mt-1.5 rounded text-[0.625rem] font-medium text-cyan-400/90 transition hover:text-cyan-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
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
  { key: 'nav_cities', path: '/cities' },
  { key: 'nav_api', path: '/api' },
  { key: 'nav_platforms', path: '/platforms' },
  { key: 'nav_about', path: '/about' },
  { key: 'nav_privacy', path: '/privacy' },
  { key: 'nav_terms', path: '/terms' },
  { key: 'nav_contact', path: '/contact' },
  { key: 'nav_accessibility', path: '/accessibility' },
]

function SidebarFooter({ lastAt, status }: { lastAt: number | null; status: FeedStatus }) {
  const { t } = useLang()
  return (
    <footer className="flex flex-col gap-2 border-t border-white/10 pt-2.5">
      <a
        href="/historical"
        onClick={(e) => {
          e.preventDefault()
          navigate('/historical')
        }}
        className="rounded text-[0.6875rem] font-medium text-sky-400 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      >
        {t('hist_stats')}
      </a>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {LEGEND.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 shrink-0 rounded-full ${l.color}`} />
            <span className="text-[0.625rem] text-fg-muted">{t(l.key)}</span>
          </div>
        ))}
      </div>

      {/* life-safety disclaimer: stays amber + high-salience by design, only the radius follows the system */}
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[0.625rem] leading-snug text-amber-100/90">
        <span className="font-bold text-amber-200">{t('disclaimer_bold')}</span> {t('disclaimer_text')}
        <span className="mt-1 block text-amber-100/60">{t('disclaimer_source')}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.625rem] text-fg-muted">
        {/* separator glued to its link in one nowrap span, so a wrap never strands a dot on its own line */}
        {FOOTER_LINKS.map((link) => (
          <span key={link.path} className="flex items-center gap-x-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => navigate(link.path)}
              className="rounded transition hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {t(link.key)}
            </button>
            <span aria-hidden className="text-fg-faint">
              ·
            </span>
          </span>
        ))}
        <button
          type="button"
          onClick={openCookieSettings}
          className="rounded transition hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          {t('nav_cookies')}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 text-[0.625rem] text-fg-faint">
        <span className="tabular-nums">
          {t('rights')} ·{' '}
          <a
            href="https://orellius.ai"
            target="_blank"
            rel="noopener"
            className="rounded transition hover:text-fg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            orellius.ai · Orel Ohayon{/* allow-personal: public footer credit explicitly requested by Orel */}
          </a>
          {lastAt ? ` · ${t('updated', { time: new Date(lastAt).toLocaleTimeString('he-IL') })}` : ''}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-fg-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {t(STATUS_KEY[status])}
        </span>
      </div>
    </footer>
  )
}
