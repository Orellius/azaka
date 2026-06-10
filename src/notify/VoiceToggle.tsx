// Header speaker that turns the opt-in voice readout of alerts on/off. Sits next to AlertToggle in
// the always-visible panel header, same button style. State + persistence live in useVoice; this is
// presentation only. The dashboard hides it entirely when speechSynthesis is unsupported.
import { useLang } from '../i18n/useLang'

function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function SpeakerOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  )
}

export function VoiceToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const { t } = useLang()
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? t('voice_mute') : t('voice_unmute')}
      title={enabled ? t('voice_on') : t('voice_off')}
      onClick={onToggle}
      className={`flex h-8 w-8 items-center justify-center rounded-md border border-white/[0.08] bg-card transition hover:border-white/[0.14] hover:bg-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
        enabled ? 'text-emerald-400' : 'text-fg-faint hover:text-fg-muted'
      }`}
    >
      {enabled ? <SpeakerIcon className="size-4" /> : <SpeakerOffIcon className="size-4" />}
    </button>
  )
}
