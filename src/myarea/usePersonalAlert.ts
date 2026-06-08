import { useState } from 'react'
import type { LiveAlert } from '../alerts/useAlertFeed'

// Derive the user's PERSONAL alert state from the shared area sets + the live-alert signal.
// Public surface: usePersonalAlert(myName, active, early, cleared, lastLiveAlert) returns the personal
// alert or null. tier mirrors how the area is painted (active/early/cleared). startTs anchors the
// shelter countdown to the moment the siren sounded for THIS area; it is known only when a live alert
// this session named the area. An area restored on page load (hello/seed) has an unknown start, so
// startTs stays null and the banner shows an urgent no-countdown state rather than OVERcounting the
// time-to-shelter (overcounting is the unsafe direction). No setState-in-effect: state is adjusted
// during render via React's "reset state when an input changes" pattern.

export type PersonalTier = 'active' | 'early' | 'cleared'
export type PersonalAlert = { tier: PersonalTier; startTs: number | null }

export function usePersonalAlert(
  myName: string | null,
  active: Set<string>,
  early: Set<string>,
  cleared: Set<string>,
  lastLiveAlert: LiveAlert | null,
): PersonalAlert | null {
  const tier: PersonalTier | null =
    myName && active.has(myName)
      ? 'active'
      : myName && early.has(myName)
        ? 'early'
        : myName && cleared.has(myName)
          ? 'cleared'
          : null

  const [startTs, setStartTs] = useState<number | null>(null)
  const [seen, setSeen] = useState<LiveAlert | null>(null)

  // a new live alert naming my area (re)starts the shelter countdown from its timestamp
  if (lastLiveAlert !== seen) {
    setSeen(lastLiveAlert)
    if (lastLiveAlert && myName && lastLiveAlert.cities.includes(myName)) setStartTs(lastLiveAlert.ts)
  }
  // once the alert is no longer active/early/cleared for my area, forget the anchor
  if (tier === null && startTs !== null) setStartTs(null)

  if (!tier) return null
  return { tier, startTs: tier === 'cleared' ? null : startTs }
}
