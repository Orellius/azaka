import { useCallback, useState } from 'react'

// The user's chosen home area, persisted across sessions. Picked once from public/data/cities.json,
// matched to alerts by exact `name` (cities.json keys == areas.geojson names == oref alert area names,
// verified: 1448/1449 overlap). countdown is the OFFICIAL migun time-to-reach-shelter in seconds.
// Public surface: useMyArea() returns [myArea, setMyArea]; setMyArea(null) clears the choice.

const KEY = 'azaka_my_area'

export type MyArea = { name: string; en?: string; countdown: number | null; lat: number; lng: number }

function load(): MyArea | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<MyArea>
    if (p && typeof p.name === 'string' && typeof p.lat === 'number' && typeof p.lng === 'number') {
      return { name: p.name, en: p.en, countdown: p.countdown ?? null, lat: p.lat, lng: p.lng }
    }
    return null
  } catch {
    return null
  }
}

export function useMyArea(): [MyArea | null, (area: MyArea | null) => void] {
  const [myArea, setState] = useState<MyArea | null>(load)
  const setMyArea = useCallback((area: MyArea | null) => {
    setState(area)
    try {
      if (area) localStorage.setItem(KEY, JSON.stringify(area))
      else localStorage.removeItem(KEY)
    } catch {
      // storage disabled: the choice still holds for this session
    }
  }, [])
  return [myArea, setMyArea]
}
