import { ArchiveShell, SpaLink } from './ArchiveShell'
import { openCookieSettings } from '../consent/consentStore'
import { useLang } from '../i18n/useLang'
import { usePageMeta } from '../seo/usePageMeta'
import type { StringKey } from '../i18n/strings'

// Site index ("menu"): every page in one place, reached from the map's bottom status chip. Exists so
// the dashboard panel carries zero navigation (max rows for alerts) while all pages stay one tap away
// and crawlable (real anchors via SpaLink). Public surface: <MenuPage />.

const GROUPS: Array<{ h: StringKey; items: Array<{ key: StringKey; path: string }> }> = [
  {
    h: 'menu_live',
    items: [
      { key: 'menu_map', path: '/' },
      { key: 'nav_cities', path: '/cities' },
      { key: 'hist_stats', path: '/historical' },
    ],
  },
  {
    h: 'menu_platforms',
    items: [
      { key: 'nav_platforms', path: '/platforms' },
      { key: 'nav_api', path: '/api' },
    ],
  },
  {
    h: 'menu_info',
    items: [
      { key: 'nav_about', path: '/about' },
      { key: 'nav_accessibility', path: '/accessibility' },
      { key: 'nav_privacy', path: '/privacy' },
      { key: 'nav_terms', path: '/terms' },
      { key: 'nav_contact', path: '/contact' },
    ],
  },
]

export function MenuPage() {
  const { t } = useLang()
  usePageMeta(t('menu_meta_title'), t('menu_meta_desc'))
  return (
    <ArchiveShell>
      <h1 className="text-2xl font-bold tracking-tight text-white">{t('nav_menu')}</h1>
      <div className="mt-7 flex flex-col gap-7">
        {GROUPS.map((g) => (
          <section key={g.h}>
            <h2 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-fg-faint">{t(g.h)}</h2>
            <div className="mt-2 flex flex-col overflow-hidden rounded-lg border border-white/[0.08]">
              {g.items.map((item) => (
                <SpaLink
                  key={item.path}
                  href={item.path}
                  className="border-b border-white/[0.08] bg-card px-4 py-3 text-[0.875rem] text-fg transition last:border-b-0 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
                >
                  {t(item.key)}
                </SpaLink>
              ))}
            </div>
          </section>
        ))}
        <button
          type="button"
          onClick={openCookieSettings}
          className="w-fit rounded-lg border border-white/[0.08] bg-card px-4 py-2 text-[0.8125rem] text-fg-muted transition hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          {t('nav_cookies')}
        </button>
      </div>
    </ArchiveShell>
  )
}
