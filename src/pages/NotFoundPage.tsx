import { useLang } from '../i18n/useLang'
import { usePageMeta } from '../seo/usePageMeta'
import { ArchiveShell, SpaLink } from './ArchiveShell'

// 404 view for any path App.tsx doesn't recognize. The static host can only answer 200, so the
// robots noindex meta (via usePageMeta) is what keeps unknown URLs out of the index — without it
// every garbage path rendered the map with 200 and Google folded the whole site (soft-404s).

export function NotFoundPage() {
  const { t } = useLang()
  usePageMeta(`404 — ${t('notfound_title')} | ${t('brand')}`, t('notfound_text'), { noindex: true })
  return (
    <ArchiveShell>
      <p className="text-[0.8125rem] font-semibold tracking-widest text-slate-500">404</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{t('notfound_title')}</h1>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-400">{t('notfound_text')}</p>
      <SpaLink
        href="/"
        className="mt-6 inline-block rounded-md border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-[0.8125rem] font-medium text-sky-300 transition hover:bg-sky-500/20"
      >
        {t('hist_live_map')}
      </SpaLink>
    </ArchiveShell>
  )
}
