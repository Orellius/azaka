import { useState } from 'react'
import { AreaPicker } from './AreaPicker'
import type { MyArea } from './useMyArea'
import type { PersonalTier } from './usePersonalAlert'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import type { StringKey } from '../i18n/strings'

// Sidebar control to pick / change / clear the home area. Owns the picker-open state and renders the
// modal. Presentation + selection only; persistence lives in useMyArea, alert logic in usePersonalAlert.

const STATUS: Record<PersonalTier, { dot: string; txt: string; key: StringKey }> = {
  active: { dot: 'bg-rose-500', txt: 'text-rose-300', key: 'status_active' },
  early: { dot: 'bg-amber-500', txt: 'text-amber-300', key: 'status_early' },
  cleared: { dot: 'bg-emerald-500', txt: 'text-emerald-300', key: 'status_cleared' },
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function MyAreaControl({
  myArea,
  onChange,
  tier,
}: {
  myArea: MyArea | null
  onChange: (area: MyArea | null) => void
  tier: PersonalTier | null
}) {
  const { t } = useLang()
  const localizeArea = useAreaName()
  const [picking, setPicking] = useState(false)
  const status = tier ? STATUS[tier] : null

  return (
    <>
      {myArea ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status ? status.dot : 'bg-slate-500'}`} />
          <PinIcon className="size-4 shrink-0 text-sky-300/80" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold text-white">{localizeArea(myArea.name)}</div>
            <div className={`text-[10px] ${status ? status.txt : 'text-slate-400'}`}>
              {status ? t(status.key) : t('myarea_mine_no_alert')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium text-sky-300 transition hover:bg-white/10"
          >
            {t('myarea_change')}
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('myarea_remove')}
            className="shrink-0 rounded-lg px-1.5 py-1 text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2.5 text-start transition hover:bg-sky-400/20"
        >
          <PinIcon className="size-4 shrink-0 text-sky-300" />
          <div className="leading-tight">
            <div className="text-[13px] font-semibold text-sky-100">{t('myarea_set_title')}</div>
            <div className="text-[10px] text-sky-200/70">{t('myarea_set_sub')}</div>
          </div>
        </button>
      )}

      {picking && (
        <AreaPicker
          onClose={() => setPicking(false)}
          onPick={(area) => {
            onChange(area)
            setPicking(false)
          }}
        />
      )}
    </>
  )
}
