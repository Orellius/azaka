import { useState } from 'react'
import { apply, DEFAULT_PREFS, loadPrefs, savePrefs, type A11yPrefs } from './a11yStore'
import { navigate } from '../router'
import { useLang } from '../i18n/useLang'

// Floating accessibility widget (IS 5568 / WCAG 2.0 AA aid): text-size cycle, high contrast,
// underline links, stop animations, reset, and a link to the /accessibility statement page.
// Logical positioning (start/bottom) so it sits correctly in both RTL and LTR; z-40 keeps it
// UNDER the cookie banner (z-50) and bottom-16 keeps it clear of the map attribution strip.
// Prefs persist via a11yStore; the CSS lives in index.css under the a11y-* classes.

const TEXT_STEPS = ['100%', '112%', '125%'] as const

function A11yIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="6.8" r="1.5" fill="currentColor" stroke="none" />
      <path d="M6.8 9.6c3.4 1 7 1 10.4 0" />
      <path d="M12 10.4v3.4" />
      <path d="m12 13.8-2.2 5" />
      <path d="m12 13.8 2.2 5" />
    </svg>
  )
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-start text-[0.75rem] text-fg transition hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
    >
      <span>{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? 'bg-fg' : 'bg-white/[0.14]'}`} aria-hidden>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${on ? 'start-3.5 bg-black' : 'start-0.5 bg-fg-muted'}`} />
      </span>
    </button>
  )
}

export function AccessibilityWidget() {
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const [prefs, setPrefs] = useState<A11yPrefs>(loadPrefs)

  const update = (p: A11yPrefs) => {
    setPrefs(p)
    savePrefs(p)
    apply(p)
  }

  return (
    <div
      className="fixed bottom-16 start-3 z-40"
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      {open && (
        <div
          role="group"
          aria-label={t('a11y_title')}
          className="absolute bottom-full start-0 mb-2 flex w-60 flex-col gap-0.5 rounded-lg border border-white/[0.08] bg-surface p-2 shadow-lg shadow-black/50"
        >
          <div className="px-2 pb-1.5 pt-1 text-[0.6875rem] font-semibold text-fg-muted">{t('a11y_title')}</div>
          <button
            type="button"
            onClick={() => update({ ...prefs, text: ((prefs.text + 1) % 3) as A11yPrefs['text'] })}
            className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-start text-[0.75rem] text-fg transition hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
          >
            <span>{t('a11y_text_size')}</span>
            <span className="tabular-nums text-fg-muted" dir="ltr">
              {TEXT_STEPS[prefs.text]}
            </span>
          </button>
          <ToggleRow label={t('a11y_contrast')} on={prefs.contrast} onToggle={() => update({ ...prefs, contrast: !prefs.contrast })} />
          <ToggleRow label={t('a11y_links')} on={prefs.links} onToggle={() => update({ ...prefs, links: !prefs.links })} />
          <ToggleRow label={t('a11y_motion')} on={prefs.motion} onToggle={() => update({ ...prefs, motion: !prefs.motion })} />
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-white/[0.08] px-2 pt-2">
            <button
              type="button"
              onClick={() => update(DEFAULT_PREFS)}
              className="rounded-md px-1.5 py-1 text-[0.6875rem] text-fg-faint transition hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {t('a11y_reset')}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/accessibility')
              }}
              className="rounded-md px-1.5 py-1 text-[0.6875rem] font-medium text-sky-400 transition hover:bg-card-hover hover:text-sky-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
            >
              {t('a11y_statement')}
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={t('a11y_title')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-surface text-fg shadow-lg shadow-black/50 transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      >
        <A11yIcon className="size-5" />
      </button>
    </div>
  )
}
