import { useState, type ReactNode } from 'react'
import { usePageMeta } from '../seo/usePageMeta'
import { useLang } from '../i18n/useLang'
import type { StringKey } from '../i18n/strings'
import { ArchiveShell, SpaLink } from './ArchiveShell'

// /platforms — every way to get Azaka alerts (tzevaadom.co.il/systems-style grid): website, Telegram
// channel + bot, free API, embeddable widget (iframe snippet + copy button + live preview), and an
// honest "web push in development" card. Reuses ArchiveShell for chrome/disclaimer/nav. NOT
// responsible for: the widget itself (src/pages/EmbedWidget.tsx) or API docs (/api). Test strategy:
// build/lint + exercising the copy button and preview iframe in a browser.

const EMBED_SNIPPET = `<iframe src="https://azaka.orellius.ai/embed" width="100%" height="420" style="border:0" title="אזעקה — התרעות בזמן אמת"></iframe>`

const icon = (path: ReactNode) => (
  <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
)
const ICONS = {
  site: icon(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>),
  channel: icon(<path d="M3 11l18-7-4 16-6.5-4.5L8 18l-.5-5z" />),
  bot: icon(<><rect x="5" y="8" width="14" height="11" rx="2" /><path d="M12 8V4M8 4h8" /><circle cx="9.5" cy="13" r="0.5" /><circle cx="14.5" cy="13" r="0.5" /></>),
  api: icon(<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13 5l-2 14" />),
  embed: icon(<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M3 8h18M9 12l-2 2 2 2M15 12l2 2-2 2" /></>),
  push: icon(<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10 18a2 2 0 0 0 4 0" />),
}

function Card({ icon, name, desc, children }: { icon: ReactNode; name: string; desc: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-card p-4">
      <div className="flex items-center gap-2.5 text-sky-300">
        {icon}
        <h2 className="text-[0.9375rem] font-semibold text-white">{name}</h2>
      </div>
      <p className="text-[0.8125rem] leading-relaxed text-fg-muted">{desc}</p>
      <div className="mt-auto pt-1">{children}</div>
    </div>
  )
}

const linkCls =
  'inline-block rounded-md border border-white/[0.08] bg-card px-3 py-1.5 text-[0.75rem] font-semibold text-sky-300 transition hover:bg-card-hover hover:text-sky-200'

function CopySnippet() {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard
      .writeText(EMBED_SNIPPET)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }
  return (
    <div dir="ltr" className="relative">
      <pre className="overflow-x-auto rounded-md border border-white/[0.08] bg-card p-3 pe-20 text-left text-[0.6875rem] leading-relaxed text-fg-muted">
        <code>{EMBED_SNIPPET}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute end-2 top-2 rounded-md border border-white/[0.08] bg-card-hover px-2.5 py-1 text-[0.6875rem] font-semibold text-fg transition hover:bg-white/[0.14]"
      >
        {copied ? t('embed_copied') : t('embed_copy')}
      </button>
    </div>
  )
}

export function PlatformsPage() {
  const { t } = useLang()
  usePageMeta(t('platforms_meta_title'), t('platforms_meta_desc'))
  const tg = (name: StringKey, desc: StringKey, handle: string, url: string, ic: ReactNode) => (
    <Card icon={ic} name={t(name)} desc={t(desc)}>
      <a href={url} target="_blank" rel="noopener" className={linkCls} dir="ltr">
        {handle}
      </a>
    </Card>
  )
  return (
    <ArchiveShell>
      <h1 className="text-xl font-bold text-white">{t('platforms_title')}</h1>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-fg-muted">{t('platforms_sub')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card icon={ICONS.site} name={t('plat_site_name')} desc={t('plat_site_desc')}>
          <SpaLink href="/" className={linkCls}>
            azaka.orellius.ai
          </SpaLink>
        </Card>

        {tg('plat_tg_channel_name', 'plat_tg_channel_desc', '@azaka_alerts', 'https://t.me/azaka_alerts', ICONS.channel)}
        {tg('plat_tg_bot_name', 'plat_tg_bot_desc', '@azakaalertsbot', 'https://t.me/azakaalertsbot', ICONS.bot)}

        <Card icon={ICONS.api} name={t('plat_api_name')} desc={t('plat_api_desc')}>
          <SpaLink href="/api" className={linkCls}>
            {t('nav_api')}
          </SpaLink>
        </Card>

        <Card icon={ICONS.push} name={t('plat_push_name')} desc={t('plat_push_desc')}>
          <span className="inline-block rounded-md border border-white/[0.08] bg-card px-3 py-1.5 text-[0.75rem] font-semibold text-fg-faint">
            {t('plat_push_soon')}
          </span>
        </Card>
      </div>

      {/* the embed card spans full width: snippet + live preview need the room */}
      <div className="mt-4 flex flex-col gap-3 rounded-lg border border-white/[0.08] bg-card p-4">
        <div className="flex items-center gap-2.5 text-sky-300">
          {ICONS.embed}
          <h2 className="text-[0.9375rem] font-semibold text-white">{t('plat_embed_name')}</h2>
        </div>
        <p className="text-[0.8125rem] leading-relaxed text-fg-muted">{t('plat_embed_desc')}</p>
        <CopySnippet />
        <div className="text-[0.6875rem] font-medium text-fg-faint">{t('embed_preview')}</div>
        <iframe src="/embed" height={420} className="w-full rounded-md border border-white/[0.08]" title="אזעקה — התרעות בזמן אמת" />
      </div>
    </ArchiveShell>
  )
}
