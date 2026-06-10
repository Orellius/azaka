import { useCallback, useEffect, useRef, useState } from 'react'
import type { AlertKind, LiveAlert } from '../alerts/useAlertFeed'
import { useLang } from '../i18n/useLang'

type T = ReturnType<typeof useLang>['t']

// Audible-alarm + browser-Notification layer for genuinely-new LIVE alerts.
// Public surface: useNotifier(lastLiveAlert, myAreaName) returns { enabled, toggle, perm, requestPermission }.
// Why this file (vs inlining in MapDashboard): keeps the browser-autoplay + Notification-permission
// dance (gesture-gated AudioContext, opt-in permission) out of the dashboard's render path.
// NOT responsible for: deciding what counts as "live". That is useAlertFeed's lastLiveAlert (set only
// on the websocket 'alert' path, never on the /history seed). We just react to it once per alert.
// SAFETY: default ON (this is a siren app); the user can mute, persisted across sessions. We never
// request Notification permission on load, only on an explicit user gesture (the toggle).

const PREF = 'azaka_alerts'
type Perm = NotificationPermission | 'unsupported'

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(PREF) !== 'off' // default ON; only an explicit 'off' mutes
  } catch {
    return true
  }
}

function currentPerm(): Perm {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

// Synthesize the alarm with the Web Audio API (no bundled audio asset; works offline). Distinct
// shapes: active/special is a 3-cycle rising-falling air-raid wail; early is a gentle two-tone chime.
function playAlarm(ctx: AudioContext, kind: AlertKind) {
  const now = ctx.currentTime
  if (kind === 'early') {
    ;[880, 1175].forEach((freq, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      const t = now + i * 0.42
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.36)
    })
    return
  }
  const cycles = 3
  const dur = 0.85
  for (let i = 0; i < cycles; i++) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sawtooth'
    const t = now + i * dur
    o.frequency.setValueAtTime(520, t)
    o.frequency.linearRampToValueAtTime(1100, t + dur * 0.5)
    o.frequency.linearRampToValueAtTime(520, t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.06)
    g.gain.setValueAtTime(0.3, t + dur - 0.12)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur)
  }
}

function showNotification(a: LiveAlert, myAreas: string[] | undefined, t: T) {
  const mine = !!myAreas && myAreas.some((name) => a.cities.includes(name))
  const heading = mine ? t('notif_in_area') : a.kind === 'early' ? t('notif_early_head') : t('notif_active_head')
  const shown = a.cities.slice(0, 6).join(', ')
  const more = a.cities.length > 6 ? ` ${t('notif_more', { n: a.cities.length - 6 })}` : ''
  try {
    const n = new Notification(heading, {
      body: `${a.title || t('alert_generic')} · ${shown}${more}`,
      tag: 'azaka-alert', // collapse a barrage into one updating notification, not 600
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      lang: 'he',
      dir: 'rtl',
      requireInteraction: a.kind !== 'early', // a red alert stays until dismissed; an early warning auto-dismisses
    })
    n.onclick = () => {
      window.focus()
      n.close()
    }
  } catch {
    // some browsers reject Notification options; non-fatal
  }
}

export function useNotifier(lastLiveAlert: LiveAlert | null, myAreaNames?: string[]) {
  const { t } = useLang()
  const [enabled, setEnabled] = useState(loadEnabled)
  const [perm, setPerm] = useState<Perm>(currentPerm)
  const ctxRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(enabled)
  const myAreasRef = useRef(myAreaNames)
  const tRef = useRef<T>(t)

  // mirror the latest enabled/myAreas/t into refs so the live-alert effect can read them without
  // re-subscribing (a ref write during render is disallowed; this syncs after each commit instead)
  useEffect(() => {
    enabledRef.current = enabled
    myAreasRef.current = myAreaNames
    tRef.current = t
  })

  const ensureCtx = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) ctxRef.current = new AC()
    } catch {
      // no Web Audio (very old browser): notifications still work
    }
    return ctxRef.current
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(PREF, enabled ? 'on' : 'off')
    } catch {
      // storage disabled: the toggle still holds for this session
    }
  }, [enabled])

  // Browser autoplay policy blocks audio until a user gesture. With default-ON we cannot play on load,
  // so arm the AudioContext on the first interaction anywhere, making a later alarm audible.
  useEffect(() => {
    if (!enabled) return
    const arm = () => ensureCtx()?.resume?.()
    window.addEventListener('pointerdown', arm, { once: true })
    window.addEventListener('keydown', arm, { once: true })
    return () => {
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [enabled, ensureCtx])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    try {
      setPerm(await Notification.requestPermission())
    } catch {
      // ignore: some browsers throw on the legacy callback signature
    }
  }, [])

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v
      if (next) {
        ensureCtx()?.resume?.() // this click is the gesture that unlocks audio
        if (currentPerm() === 'default') void requestPermission()
      }
      return next
    })
  }, [ensureCtx, requestPermission])

  // Fire once per genuinely-new live alert. Reads enabled/myArea via refs so toggling the switch or
  // changing the area never replays the previous alarm; only a new lastLiveAlert reference does.
  useEffect(() => {
    if (!lastLiveAlert || !enabledRef.current) return
    const ctx = ensureCtx()
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume?.()
      try {
        playAlarm(ctx, lastLiveAlert.kind)
      } catch {
        // audio failed (no gesture yet / suspended): the visual + notification still fire
      }
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      showNotification(lastLiveAlert, myAreasRef.current, tRef.current)
    }
  }, [lastLiveAlert, ensureCtx])

  return { enabled, toggle, perm, requestPermission }
}
