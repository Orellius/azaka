import { useEffect, useState, useSyncExternalStore } from 'react'
import { isAlertingNow, readConsent, subscribeAlerting, subscribeCookieOpen, writeConsent, type Consent } from './consentStore'
import { applyConsent } from '../analytics/track'
import { useLang } from '../i18n/useLang'

// Cookie consent banner (RTL Hebrew). Persistence + the reopen bus live in ./consentStore so this file
// only exports a component. Two choices: accept all, or essential-only. The footer "Cookie Settings"
// link reopens this via openCookieSettings() to let the user change a prior choice. applyConsent
// creates/expires the first-party azaka_vid statistics cookie to match the choice.
export function CookieConsent() {
  const { t } = useLang()
  const [open, setOpen] = useState(() => readConsent() === null)
  const alerting = useSyncExternalStore(subscribeAlerting, isAlertingNow)

  useEffect(() => subscribeCookieOpen(() => setOpen(true)), [])

  // suppressed during a live alert so it never stacks over the instruction/shelter cards (z-50 wins);
  // `open` is untouched, so the banner returns on its own once the event ends
  if (!open || alerting) return null

  const choose = (v: Consent) => {
    writeConsent(v)
    applyConsent(v)
    setOpen(false)
  }

  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex justify-center p-3"
      role="dialog"
      aria-label={t('nav_cookies')}
    >
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-white/[0.08] bg-surface/95 p-4 shadow-lg shadow-black/50 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-[0.75rem] leading-relaxed text-fg-muted">
          <span className="font-semibold text-fg">{t('cookie_bold')}</span> {t('cookie_text')}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="rounded-md border border-white/[0.08] bg-card px-3 py-2 text-[0.75rem] text-fg transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            {t('cookie_essential')}
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="rounded-md bg-fg px-4 py-2 text-[0.75rem] font-semibold text-black transition hover:bg-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
          >
            {t('cookie_accept_all')}
          </button>
        </div>
      </div>
    </div>
  )
}
