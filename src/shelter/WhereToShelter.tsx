import { useState } from 'react'
import { useLang } from '../i18n/useLang'
import type { StringKey } from '../i18n/strings'

// "Where to take shelter" guidance: the HONEST answer to "nearest shelter".
// Israel publishes no reliable, openly-licensed national public-shelter dataset (the complete GovMap
// layer is proprietary; open data is a few cities only; a Jan-2026 State Comptroller audit found
// >11% of public shelters unfit and location != availability). Pointing a civilian at a specific
// shelter that may be locked or demolished is exactly the failure this app refuses. So instead of a
// fabricated pin we show the official Home Front Command protected-space hierarchy, which is always
// correct everywhere. Defaults open during an alert. Collapsible the rest of the time (preparedness).

const STEPS: StringKey[] = ['shelter_step_room', 'shelter_step_stairwell', 'shelter_step_interior', 'shelter_step_outdoors', 'shelter_step_driving']

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  )
}

export function WhereToShelter({ alerting }: { alerting: boolean }) {
  const { t } = useLang()
  const [open, setOpen] = useState(alerting) // open automatically when loaded during an alert

  return (
    <section className="overflow-hidden rounded-xl border border-sky-400/20 bg-sky-400/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-start transition hover:bg-white/5"
      >
        <ShieldIcon className="size-4 shrink-0 text-sky-300" />
        <span className="flex-1 text-[0.8125rem] font-semibold text-sky-100">{t('shelter_where_title')}</span>
        <svg
          className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <ol className="flex flex-col gap-1.5">
            {STEPS.map((key, i) => (
              <li key={key} className="flex gap-2 text-[0.75rem] leading-relaxed text-slate-200">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-400/15 text-[0.625rem] font-bold text-sky-300">
                  {i + 1}
                </span>
                <span className="min-w-0">{t(key)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-2.5 border-t border-white/10 pt-2 text-[0.625rem] leading-relaxed text-slate-500">{t('shelter_note')}</p>
        </div>
      )}
    </section>
  )
}
