import type { ReactNode } from 'react'
import { navigate } from '../router'
import { useLang } from '../i18n/useLang'
import { withLocale } from '../i18n/locale'
import { useInOverlay } from '../overlayContext'

// Shared chrome for the indexable archive pages (/cities, /city/<name>, /alert/<id>): scrollable dark
// shell, back-to-map link, the amber unofficial-tool disclaimer, and a crawlable bottom nav of real
// anchors. Kept separate so the three pages stay content-only. NOT for InfoPage (it has its own shell).
// Public surface: <ArchiveShell>{content}</ArchiveShell> + <SpaLink href>{label}</SpaLink>.

// Real <a href> (crawlers follow it) that performs an SPA navigation when clicked in-app. The
// rendered href carries the current locale prefix so crawlers discover /en /ar /ru pages too.
export function SpaLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { lang } = useLang()
  return (
    <a
      href={withLocale(href, lang)}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </a>
  )
}

const NAV: Array<{ href: string; key: 'hist_live_map' | 'nav_cities' | 'hist_stats' | 'nav_api' | 'nav_platforms' | 'nav_about' }> = [
  { href: '/', key: 'hist_live_map' },
  { href: '/cities', key: 'nav_cities' },
  { href: '/historical', key: 'hist_stats' },
  { href: '/api', key: 'nav_api' },
  { href: '/platforms', key: 'nav_platforms' },
  { href: '/about', key: 'nav_about' },
]

export function ArchiveShell({ children }: { children: ReactNode }) {
  const { t } = useLang()
  // inside the RouteOverlay sheet: size to the sheet (not the viewport) and drop the back-to-map
  // link — the overlay's X / Escape / scrim already are that affordance
  const inOverlay = useInOverlay()
  return (
    <div className={`feed-scroll overflow-y-auto bg-surface text-fg ${inOverlay ? 'h-full w-full' : 'h-screen w-screen'}`}>
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        {!inOverlay && (
          <SpaLink href="/" className="mb-6 inline-block text-[0.8125rem] font-medium text-sky-400 transition hover:text-sky-300">
            {t('info_back')}
          </SpaLink>
        )}

        {children}

        {/* life-safety disclaimer: stays amber + high-salience by design */}
        <div className="mt-10 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-amber-100/90">
          <span className="font-bold text-amber-200">{t('disclaimer_bold')}</span> {t('disclaimer_text')}
          <span className="mt-1 block text-amber-100/60">{t('disclaimer_source')}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-5 text-[0.6875rem] text-fg-faint">
          {NAV.map((l, i) => (
            <span key={l.href} className="flex items-center gap-x-3">
              {i > 0 && <span aria-hidden>·</span>}
              <SpaLink href={l.href} className="transition hover:text-fg">
                {t(l.key)}
              </SpaLink>
            </span>
          ))}
        </div>
        <div className="mt-3 text-[0.6875rem] text-fg-faint">{t('rights')}</div>
      </div>
    </div>
  )
}
