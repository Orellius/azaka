import { useAlertFeed, type FeedEvent } from '../alerts/useAlertFeed'
import { useLang, setLang } from '../i18n/useLang'
import { LANGS, type StringKey } from '../i18n/strings'

// /embed — the embeddable live-alert widget (iframe target for third-party sites). Renders WITHOUT
// the app chrome: no map, no sidebar, no cookie banner, no a11y widget (App.tsx early-returns this
// route) and fires no analytics beacon (trackPageview guards on /embed). Sets NO cookies; ?lang=
// presets the UI language once on mount (no language chips). NOT responsible for: notifications,
// my-area, or any interactivity beyond the backlink. Test strategy: build/lint + /test/alert in a
// browser at 300px width.

// severity colors mirror MapDashboard's SEV semantics (red active/special, amber early). Defined
// locally — importing from MapDashboard would drag the MapLibre bundle into this chrome-less route.
const SEV: Record<FeedEvent['severity'], { dot: string; txt: string; accent: string }> = {
  active: { dot: 'bg-rose-500', txt: 'text-rose-400', accent: 'border-s-rose-500' },
  special: { dot: 'bg-rose-500', txt: 'text-rose-400', accent: 'border-s-rose-500' },
  early: { dot: 'bg-amber-500', txt: 'text-amber-400', accent: 'border-s-amber-500' },
  cleared: { dot: 'bg-emerald-500', txt: 'text-emerald-400', accent: 'border-s-emerald-500' },
}
const STATUS_DOT: Record<string, string> = { live: 'bg-emerald-400', connecting: 'bg-amber-400', error: 'bg-rose-500' }
const STATUS_KEY: Record<string, StringKey> = { live: 'status_live', connecting: 'status_connecting', error: 'status_error' }
const MAX_CARDS = 6

// ?lang=he|en|ar|ru presets the widget language, read ONCE at load before React mounts (no flash of
// the wrong language, no setState-in-effect). Pathname-guarded: this module ships in the main bundle
// and evaluates on every route, but only /embed may hijack the visitor's saved language choice.
if (window.location.pathname === '/embed') {
  const q = new URLSearchParams(window.location.search).get('lang')
  const match = LANGS.find((l) => l.code === q)
  if (match) setLang(match.code)
}

export function EmbedWidget() {
  const { t, tAgo } = useLang()
  const { activeAreas, earlyAreas, status, events } = useAlertFeed()

  const alerting = activeAreas.size > 0 || earlyAreas.size > 0
  const liveEvents = events.filter((e) => e.severity !== 'cleared').slice(0, MAX_CARDS)
  const lastTs = liveEvents[0]?.ts // last real alert (not an all-clear card) for the calm state
  const headDot = activeAreas.size > 0 ? 'bg-rose-500' : earlyAreas.size > 0 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="flex min-h-dvh w-full flex-col bg-surface text-fg">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-3 py-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {alerting && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${headDot} opacity-75`} />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${headDot}`} />
        </span>
        <span className="text-[0.8125rem] font-semibold leading-tight">{t('brand')}</span>
        <span className="min-w-0 truncate text-[0.6875rem] text-fg-muted">{t('brand_sub')}</span>
      </header>

      <main className="feed-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {alerting && liveEvents.length > 0 ? (
          liveEvents.map((ev) => {
            const c = SEV[ev.severity]
            return (
              <div key={ev.id} className={`shrink-0 rounded-md border border-s-2 border-white/[0.08] bg-card px-3 py-2 ${c.accent}`}>
                <div className={`text-[0.8125rem] font-semibold leading-tight ${c.txt}`}>
                  {ev.title || t('alert_generic')}
                </div>
                <div className="mt-1 text-[0.6875rem] tabular-nums text-fg-muted">
                  {t('areas_n', { n: ev.cities.length })} · {tAgo(ev.ts)} ·{' '}
                  {new Date(ev.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )
          })
        ) : alerting ? (
          // hello-restore edge: areas are active but no event card was seeded yet
          <div className="rounded-md border border-s-2 border-white/[0.08] border-s-rose-500 bg-card px-3 py-2 text-[0.8125rem] font-semibold text-rose-400">
            {t('areas_active', { n: activeAreas.size + earlyAreas.size })}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-4 text-center">
            <span className="flex items-center gap-2 text-[0.875rem] font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {t('feed_empty')}
            </span>
            {lastTs && (
              <span className="text-[0.6875rem] tabular-nums text-fg-muted">
                {t('city_last')}: {tAgo(lastTs)}
              </span>
            )}
          </div>
        )}
      </main>

      {/* life-safety disclaimer, compact: stays amber + visible by design */}
      <div className="shrink-0 px-3 pb-1.5 text-[0.5625rem] leading-snug text-amber-200/80">
        <span className="font-bold">{t('disclaimer_bold')}</span> {t('disclaimer_text')}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/[0.08] px-3 py-1.5 text-[0.625rem]">
        <a
          href="https://azaka.orellius.ai"
          target="_blank"
          rel="noopener"
          className="rounded font-medium text-sky-400 transition hover:text-sky-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          {t('brand')} · azaka.orellius.ai
        </a>
        <span className="flex shrink-0 items-center gap-1.5 text-fg-faint">
          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status]}`} />
          {t(STATUS_KEY[status])}
        </span>
      </footer>
    </div>
  )
}
