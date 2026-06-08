import { useEffect, useState } from 'react'
import { readConsent, subscribeCookieOpen, writeConsent, type Consent } from './consentStore'

// Cookie consent banner (RTL Hebrew). Persistence + the reopen bus live in ./cookieConsent so this file
// only exports a component. Two choices: accept all, or essential-only. The footer "Cookie Settings"
// link reopens this via openCookieSettings() to let the user change a prior choice.
export function CookieConsent() {
  const [open, setOpen] = useState(() => readConsent() === null)

  useEffect(() => subscribeCookieOpen(() => setOpen(true)), [])

  if (!open) return null

  const choose = (v: Consent) => {
    writeConsent(v)
    setOpen(false)
  }

  return (
    <div
      dir="rtl"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-50 flex justify-center p-3"
      role="dialog"
      aria-label="הגדרות עוגיות"
    >
      <div className="flex w-full max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1 text-[12px] leading-relaxed text-slate-300">
          <span className="font-semibold text-white">אנו משתמשים בעוגיות.</span> עוגיות חיוניות נדרשות לתפעול
          האתר. בהסכמתך נשתמש גם בעוגיות נוספות לשיפור השירות. ניתן לשנות בכל עת דרך «הגדרות עוגיות».
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose('essential')}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-200 transition hover:bg-white/10"
          >
            חיוני בלבד
          </button>
          <button
            type="button"
            onClick={() => choose('all')}
            className="rounded-lg bg-sky-600 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-sky-500"
          >
            אשר הכל
          </button>
        </div>
      </div>
    </div>
  )
}
