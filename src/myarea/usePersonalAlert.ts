import { useState } from 'react'
import type { LiveAlert } from '../alerts/useAlertFeed'
import type { MyArea } from './useMyArea'

// Derive the user's PERSONAL alert state from the shared area sets + the live-alert signal, across
// ALL saved areas. tier is the most severe across the saved areas (active > early > cleared); the
// triggering `area` shown is, within that tier, the one with the SMALLEST official migun countdown
// (most urgent; unknown countdown sorts last). Per-area startTs anchors the shelter countdown to the
// moment a live alert this session named THAT area; areas restored on page load (hello/seed) have an
// unknown start, so their anchor stays unset and the banner shows an urgent no-countdown state rather
// than OVERcounting the time-to-shelter (overcounting is the unsafe direction). No setState-in-effect:
// state is adjusted during render via React's "reset state when an input changes" pattern.
// Public surface: usePersonalAlert(areas, active, early, cleared, lastLiveAlert) -> PersonalAlert |
// null; areaTier(name, active, early, cleared) is the shared per-area tier lookup (chips use it too).

export type PersonalTier = 'active' | 'early' | 'cleared'
export type PersonalAlert = { tier: PersonalTier; startTs: number | null; area: MyArea; alertedCount: number }

const TIER_RANK: Record<PersonalTier, number> = { active: 0, early: 1, cleared: 2 }

export function areaTier(
  name: string,
  active: Set<string>,
  early: Set<string>,
  cleared: Set<string>,
): PersonalTier | null {
  return active.has(name) ? 'active' : early.has(name) ? 'early' : cleared.has(name) ? 'cleared' : null
}

export function usePersonalAlert(
  areas: MyArea[],
  active: Set<string>,
  early: Set<string>,
  cleared: Set<string>,
  lastLiveAlert: LiveAlert | null,
): PersonalAlert | null {
  const alerted = areas.flatMap((area) => {
    const tier = areaTier(area.name, active, early, cleared)
    return tier ? [{ area, tier }] : []
  })

  // per-area countdown anchors, set ONLY when a live alert this session names that area
  const [anchors, setAnchors] = useState<ReadonlyMap<string, number>>(new Map())
  const [seen, setSeen] = useState<LiveAlert | null>(null)

  // a new live alert naming saved areas (re)starts their shelter countdowns from its timestamp
  if (lastLiveAlert !== seen) {
    setSeen(lastLiveAlert)
    if (lastLiveAlert) {
      const named = areas.filter((a) => lastLiveAlert.cities.includes(a.name))
      if (named.length > 0) {
        const next = new Map(anchors)
        for (const a of named) next.set(a.name, lastLiveAlert.ts)
        setAnchors(next)
      }
    }
  }
  // once an area is no longer active/early/cleared (or no longer saved), forget its anchor
  const stale = [...anchors.keys()].filter((name) => !alerted.some((x) => x.area.name === name))
  if (stale.length > 0) {
    const next = new Map(anchors)
    for (const name of stale) next.delete(name)
    setAnchors(next)
  }

  if (alerted.length === 0) return null
  const best = alerted.reduce((a, b) => {
    if (TIER_RANK[a.tier] !== TIER_RANK[b.tier]) return TIER_RANK[b.tier] < TIER_RANK[a.tier] ? b : a
    return (b.area.countdown ?? Infinity) < (a.area.countdown ?? Infinity) ? b : a
  })
  const startTs = best.tier === 'cleared' ? null : (anchors.get(best.area.name) ?? null)
  return { tier: best.tier, startTs, area: best.area, alertedCount: alerted.length }
}
