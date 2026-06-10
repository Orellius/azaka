import { useCallback, useState } from 'react'

// The user's saved areas (up to MAX_MY_AREAS), persisted across sessions. Picked from
// public/data/cities.json, matched to alerts by exact `name` (cities.json keys == areas.geojson names
// == oref alert area names, verified: 1448/1449 overlap). countdown is the OFFICIAL migun
// time-to-reach-shelter in seconds. One-time migration: the old single-area key (azaka_my_area) seeds
// the list and is removed. Public surface: useMyArea() returns [areas, addArea, removeArea];
// addArea dedupes by name and never grows past MAX_MY_AREAS (the UI enforces the cap too).

const KEY = 'azaka_my_areas'
const LEGACY_KEY = 'azaka_my_area'
export const MAX_MY_AREAS = 5

export type MyArea = { name: string; en?: string; countdown: number | null; lat: number; lng: number }

function parseArea(p: unknown): MyArea | null {
  const a = p as Partial<MyArea> | null
  if (a && typeof a.name === 'string' && typeof a.lat === 'number' && typeof a.lng === 'number') {
    return { name: a.name, en: a.en, countdown: a.countdown ?? null, lat: a.lat, lng: a.lng }
  }
  return null
}

function save(areas: MyArea[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(areas))
  } catch {
    // storage disabled: the choice still holds for this session
  }
}

function load(): MyArea[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const arr = JSON.parse(raw) as unknown
      if (!Array.isArray(arr)) return []
      return arr.map(parseArea).filter((a): a is MyArea => a !== null).slice(0, MAX_MY_AREAS)
    }
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const area = parseArea(JSON.parse(legacy))
      localStorage.removeItem(LEGACY_KEY)
      if (area) {
        save([area])
        return [area]
      }
    }
    return []
  } catch {
    return []
  }
}

export function useMyArea(): [MyArea[], (area: MyArea) => void, (name: string) => void] {
  const [areas, setAreas] = useState<MyArea[]>(load)

  const addArea = useCallback((area: MyArea) => {
    setAreas((prev) => {
      if (prev.length >= MAX_MY_AREAS || prev.some((a) => a.name === area.name)) return prev
      const next = [...prev, area]
      save(next)
      return next
    })
  }, [])

  const removeArea = useCallback((name: string) => {
    setAreas((prev) => {
      const next = prev.filter((a) => a.name !== name)
      if (next.length === prev.length) return prev
      save(next)
      return next
    })
  }, [])

  return [areas, addArea, removeArea]
}
