import { useState } from 'react'
import { AreaPicker } from './AreaPicker'
import { MAX_MY_AREAS, type MyArea } from './useMyArea'
import type { PersonalTier } from './usePersonalAlert'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import type { StringKey } from '../i18n/strings'

// Sidebar control to manage the saved areas (up to MAX_MY_AREAS): one chip per area with its live
// status + a per-chip remove, and an "add area" button that opens the picker. Owns the picker-open
// state and renders the modal. Presentation + selection only; persistence lives in useMyArea, alert
// logic in usePersonalAlert (tierOf comes from the dashboard so each chip paints its own tier).

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
  areas,
  onAdd,
  onRemove,
  tierOf,
}: {
  areas: MyArea[]
  onAdd: (area: MyArea) => void
  onRemove: (name: string) => void
  tierOf: (name: string) => PersonalTier | null
}) {
  const { t } = useLang()
  const localizeArea = useAreaName()
  const [picking, setPicking] = useState(false)
  const atCap = areas.length >= MAX_MY_AREAS

  return (
    <>
      {areas.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {areas.map((area) => {
            const tier = tierOf(area.name)
            const status = tier ? STATUS[tier] : null
            return (
              <div key={area.name} className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-card px-3 py-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${status ? status.dot : 'bg-fg-faint'}`} />
                <PinIcon className="size-4 shrink-0 text-sky-400" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[0.8125rem] font-semibold text-fg">{localizeArea(area.name)}</div>
                  <div className={`text-[0.625rem] ${status ? status.txt : 'text-fg-muted'}`}>
                    {status ? t(status.key) : t('myarea_mine_no_alert')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(area.name)}
                  aria-label={`${t('myarea_remove')} · ${localizeArea(area.name)}`}
                  className="shrink-0 rounded-md px-1.5 py-1 text-fg-faint transition hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      {atCap ? (
        <div className="px-1 text-[0.625rem] text-fg-faint">{t('myarea_max')}</div>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="flex items-center gap-2 rounded-md border border-white/[0.08] bg-card px-3 py-2.5 text-start transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          <PinIcon className="size-4 shrink-0 text-sky-400" />
          <div className="leading-tight">
            <div className="text-[0.8125rem] font-semibold text-fg">
              {areas.length === 0 ? t('myarea_set_title') : t('myarea_add')}
            </div>
            <div className="text-[0.625rem] text-fg-muted">{areas.length === 0 ? t('myarea_set_sub') : t('myarea_max')}</div>
          </div>
        </button>
      )}

      {picking && (
        <AreaPicker
          onClose={() => setPicking(false)}
          onPick={(area) => {
            onAdd(area)
            setPicking(false)
          }}
        />
      )}
    </>
  )
}
