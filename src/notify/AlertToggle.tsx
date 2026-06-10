// Header bell that mutes/unmutes audible alerts + browser notifications. Sits in the always-visible
// panel header so it is reachable even when the mobile sheet is collapsed. State + persistence live in
// useNotifier; this is presentation only.
import { useLang } from '../i18n/useLang'

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  )
}

function BellOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13.73 21a1.94 1.94 0 0 1-3.46 0" />
      <path d="M18.63 13A17.9 17.9 0 0 1 18 8" />
      <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
      <path d="M18 8a6 6 0 0 0-9.33-5" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

export function AlertToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const { t } = useLang()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? t('notif_mute') : t('notif_unmute')}
      title={enabled ? t('alerts_on') : t('alerts_off')}
      onClick={onToggle}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-card transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
        enabled ? 'text-emerald-400' : 'text-fg-faint hover:text-fg-muted'
      }`}
    >
      {enabled ? <BellIcon className="size-4" /> : <BellOffIcon className="size-4" />}
    </button>
  )
}
