import { useState } from 'react'
import { useLang } from '../i18n/useLang'
import type { StringKey } from '../i18n/strings'

// "Where to take shelter" guidance: the HONEST answer to "nearest shelter".
// Israel publishes no reliable, openly-licensed national public-shelter dataset (the complete GovMap
// layer is proprietary; open data is a few cities only; a Jan-2026 State Comptroller audit found
// >11% of public shelters unfit and location != availability). Pointing a civilian at a specific
// shelter that may be locked or demolished is exactly the failure this app refuses. So instead of a
// fabricated pin we show the official Home Front Command protected-space hierarchy, which is always
// correct everywhere. During an alert this is the most important thing on the screen, so it forces
// open and turns vivid; the rest of the time it stays a calm, collapsible preparedness reference.

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

  // during an alert this is the primary instruction on screen: vivid + always expanded
  const shell = alerting
    ? 'border-sky-400/60 bg-sky-400/15 ring-1 ring-sky-400/30 shadow-lg shadow-sky-950/40'
    : 'border-sky-400/20 bg-sky-400/5'
  const expanded = alerting || open

  return (
    <section className={`shrink-0 overflow-hidden rounded-xl border transition ${shell}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        disabled={alerting}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent"
      >
        <ShieldIcon className={`size-5 shrink-0 ${alerting ? 'text-sky-200' : 'text-sky-300'}`} />
        <span className={`flex-1 text-[0.9375rem] font-bold ${alerting ? 'text-sky-50' : 'text-sky-100'}`}>{t('shelter_where_title')}</span>
        {!alerting && (
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
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <ol className="flex flex-col gap-2">
            {STEPS.map((key, i) => (
              <li key={key} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-slate-100">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-400/20 text-[0.6875rem] font-bold text-sky-200">
                  {i + 1}
                </span>
                <span className="min-w-0">{t(key)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 border-t border-white/10 pt-2.5 text-[0.6875rem] leading-relaxed text-slate-400">{t('shelter_note')}</p>
        </div>
      )}
    </section>
  )
}
