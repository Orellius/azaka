import { useCallback, useEffect, useRef, useState } from 'react'
import type { LiveAlert } from '../alerts/useAlertFeed'

// Opt-in voice readout of genuinely-new LIVE alerts via the Web Speech API. Speaks oref's VERBATIM
// Hebrew title plus the user's matched saved areas (or up to MAX_SPOKEN_CITIES city names). Fires
// ONLY on useAlertFeed's lastLiveAlert (the ws 'alert' path) — never the /history seed or the hello
// restore — and is independent of the alarm mute (azaka_alerts): its own azaka_voice pref, default
// OFF. A newer alert cancels anything still queued. No speechSynthesis => { supported: false }, UI
// hides the toggle. Public surface: useVoice(lastLiveAlert, savedNames) -> { supported, enabled,
// toggle }; utteranceText is exported pure for verification.

const PREF = 'azaka_voice'
const MAX_SPOKEN_CITIES = 5

const SUPPORTED =
  typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(PREF) === 'on' // default OFF — voice readout is opt-in
  } catch {
    return false
  }
}

function pickHebrewVoice(): SpeechSynthesisVoice | null {
  try {
    const voices = window.speechSynthesis.getVoices()
    return voices.find((v) => /^(he|iw)\b/i.test(v.lang ?? '')) ?? null // fallback: default voice
  } catch {
    return null
  }
}

export function utteranceText(a: LiveAlert, savedNames: string[]): string {
  const matched = savedNames.filter((name) => a.cities.includes(name))
  const places = matched.length > 0 ? matched : a.cities.slice(0, MAX_SPOKEN_CITIES)
  return [a.title, places.join(', ')].filter(Boolean).join('. ')
}

export function useVoice(lastLiveAlert: LiveAlert | null, savedNames: string[]) {
  const [enabled, setEnabled] = useState(loadEnabled)
  const enabledRef = useRef(enabled)
  const namesRef = useRef(savedNames)

  // refs mirror the latest enabled/savedNames so the live-alert effect never re-fires on a toggle
  useEffect(() => {
    enabledRef.current = enabled
    namesRef.current = savedNames
  })

  useEffect(() => {
    try {
      localStorage.setItem(PREF, enabled ? 'on' : 'off')
    } catch {
      // storage disabled: the toggle still holds for this session
    }
  }, [enabled])

  const toggle = useCallback(() => {
    setEnabled((v) => {
      const next = !v
      if (!next && SUPPORTED) window.speechSynthesis.cancel() // muting also silences an in-flight readout
      return next
    })
  }, [])

  // Speak once per genuinely-new live alert (a fresh lastLiveAlert reference per ws 'alert' message).
  useEffect(() => {
    if (!SUPPORTED || !lastLiveAlert || !enabledRef.current) return
    try {
      window.speechSynthesis.cancel() // a newer alert supersedes anything still queued
      const u = new SpeechSynthesisUtterance(utteranceText(lastLiveAlert, namesRef.current ?? []))
      u.lang = 'he-IL'
      const voice = pickHebrewVoice()
      if (voice) u.voice = voice
      window.speechSynthesis.speak(u)
    } catch {
      // voice failure must never block the visual alert / alarm / notification
    }
  }, [lastLiveAlert])

  return { supported: SUPPORTED, enabled, toggle }
}
