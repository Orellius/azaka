import type { ReactNode } from 'react'
import { navigate } from '../router'
import { useLang } from '../i18n/useLang'

// Shared chrome for the indexable archive pages (/cities, /city/<name>, /alert/<id>): scrollable dark
// shell, back-to-map link, the amber unofficial-tool disclaimer, and a crawlable bottom nav of real
// anchors. Kept separate so the three pages stay content-only. NOT for InfoPage (it has its own shell).
// Public surface: <ArchiveShell>{content}</ArchiveShell> + <SpaLink href>{label}</SpaLink>.

// Real <a href> (crawlers follow it) that performs an SPA navigation when clicked in-app.
export function SpaLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
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
  return (
    <div className="feed-scroll h-screen w-screen overflow-y-auto bg-slate-950 text-slate-200">
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <SpaLink href="/" className="mb-6 inline-block text-[0.8125rem] font-medium text-sky-400 transition hover:text-sky-300">
          {t('info_back')}
        </SpaLink>

        {children}

        {/* life-safety disclaimer: stays amber + high-salience by design */}
        <div className="mt-10 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[0.6875rem] leading-relaxed text-amber-100/90">
          <span className="font-bold text-amber-200">{t('disclaimer_bold')}</span> {t('disclaimer_text')}
          <span className="mt-1 block text-amber-100/60">{t('disclaimer_source')}</span>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 text-[0.6875rem] text-slate-500">
          {NAV.map((l, i) => (
            <span key={l.href} className="flex items-center gap-x-3">
              {i > 0 && <span aria-hidden>·</span>}
              <SpaLink href={l.href} className="transition hover:text-slate-300">
                {t(l.key)}
              </SpaLink>
            </span>
          ))}
        </div>
        <div className="mt-3 text-[0.6875rem] text-slate-600">{t('rights')}</div>
      </div>
    </div>
  )
}
