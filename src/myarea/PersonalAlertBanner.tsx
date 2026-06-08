import { useEffect, useState } from 'react'
import type { MyArea } from './useMyArea'
import type { PersonalAlert, PersonalTier } from './usePersonalAlert'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'

// Full-width PERSONAL alert banner: the single biggest jump from "national map" to "warns ME".
// Shows when the user's chosen area is under alert, with a live ticking shelter countdown.
// HONESTY (non-negotiable): the countdown is the official time-to-REACH-shelter (migun seconds), NOT
// a time-to-impact and NOT a "safe now" timer. When it reaches 0 we say "you should be inside, wait
// for instructions"; we never say it is safe to leave. If the alert was restored on page load (start
// time unknown), we show an urgent enter-now state instead of a fresh countdown that would overcount.

const SKIN: Record<PersonalTier, { wrap: string; pill: string; accent: string }> = {
  active: {
    wrap: 'border-rose-400/60 bg-gradient-to-b from-rose-600/95 to-rose-700/95',
    pill: 'bg-rose-950/40 text-rose-50',
    accent: 'text-rose-100',
  },
  early: {
    wrap: 'border-amber-300/60 bg-gradient-to-b from-amber-500/95 to-amber-600/95',
    pill: 'bg-amber-950/30 text-amber-50',
    accent: 'text-amber-50',
  },
  cleared: {
    wrap: 'border-emerald-300/60 bg-gradient-to-b from-emerald-600/95 to-emerald-700/95',
    pill: 'bg-emerald-950/30 text-emerald-50',
    accent: 'text-emerald-50',
  },
}
const LABEL_KEY = { active: 'pb_active', early: 'pb_early', cleared: 'pb_cleared' } as const

function fmt(sec: number): string {
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }
  return `${sec}`
}

export function PersonalAlertBanner({ area, personal }: { area: MyArea; personal: PersonalAlert }) {
  const { t } = useLang()
  const localizeArea = useAreaName()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const skin = SKIN[personal.tier]
  const total = area.countdown
  const elapsed = personal.startTs != null ? Math.floor((now - personal.startTs) / 1000) : null
  const left = total != null && elapsed != null ? Math.max(0, total - elapsed) : null
  const reached = left === 0

  return (
    <div
      className={`pointer-events-auto absolute inset-x-0 top-0 z-30 mx-auto flex max-w-3xl items-center gap-3 rounded-b-2xl border-x border-b px-4 py-3 shadow-2xl ${skin.wrap}`}
      role="alert"
      aria-live="assertive"
    >
      <span className="relative flex h-3 w-3 shrink-0">
        {personal.tier !== 'cleared' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
        )}
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-white/80">{t(LABEL_KEY[personal.tier])}</span>
        </div>
        <div className="truncate text-xl font-extrabold leading-tight text-white">{localizeArea(area.name)}</div>
        {personal.tier === 'cleared' ? (
          <div className={`mt-0.5 text-[0.75rem] ${skin.accent}`}>{t('pb_cleared_msg')}</div>
        ) : left == null ? (
          <div className={`mt-0.5 text-[0.8125rem] font-semibold ${skin.accent}`}>{t('pb_enter_now')}</div>
        ) : reached ? (
          <div className={`mt-0.5 text-[0.75rem] font-semibold ${skin.accent}`}>{t('pb_reached')}</div>
        ) : (
          <div className={`mt-0.5 text-[0.6875rem] ${skin.accent}`}>{t('pb_countdown')}</div>
        )}
      </div>

      {personal.tier !== 'cleared' && left != null && !reached && (
        <div className={`flex shrink-0 flex-col items-center rounded-xl px-3 py-1.5 ${skin.pill}`}>
          <span className="text-2xl font-black tabular-nums leading-none text-white">{fmt(left)}</span>
          <span className="mt-0.5 text-[0.5625rem] font-medium text-white/70">{left >= 60 ? t('unit_min') : t('unit_sec')}</span>
        </div>
      )}
    </div>
  )
}
