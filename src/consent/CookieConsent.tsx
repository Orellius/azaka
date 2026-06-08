import { useEffect, useState } from 'react'
import { readConsent, subscribeCookieOpen, writeConsent, type Consent } from './consentStore'
import { useLang } from '../i18n/useLang'

// Cookie consent banner (RTL Hebrew). Persistence + the reopen bus live in ./cookieConsent so this file
// only exports a component. Two choices: accept all, or essential-only. The footer "Cookie Settings"
// link reopens this via openCookieSettings() to let the user change a prior choice.
export function CookieConsent() {
  const { t } = useLang()
  const [open, setOpen] = useState(() => readConsent() === null)

  useEffect(() => subscribeCookieOpen(() => setOpen(true)), [])

  if (!open) return null

  const choose = (v: Consent) => {
    writeConsent(v)
    setOpen(false)
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex justify-center p-3"
      role="dialog"
      aria-label={t('nav_cookies')}
    >
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-[0.75rem] leading-relaxed text-slate-300">
          <span className="font-semibold text-white">{t('cookie_bold')}</span> {t('cookie_text')}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[0.75rem] text-slate-200 transition hover:bg-white/10"
          >
            {t('cookie_essential')}
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="rounded-lg bg-sky-600 px-4 py-2 text-[0.75rem] font-semibold text-white transition hover:bg-sky-500"
          >
            {t('cookie_accept_all')}
          </button>
        </div>
      </div>
    </div>
  )
}
