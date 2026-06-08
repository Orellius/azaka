import { useEffect, useSyncExternalStore } from 'react'
import { useLang } from './useLang'
import type { Lang } from './strings'

// Localized locality/area NAMES. The feed, personal banner, map popup, and history all show oref area
// names, which are Hebrew. public/data/cities.json carries he/en/ar/ru for all 1449 localities, so for
// a non-Hebrew language we translate the name itself. Lazy: cities.json (~422 KB) is fetched only when
// a non-Hebrew language is active, so Hebrew users never pay for it. Falls back to the Hebrew name for
// any area not in the file (or before it loads).

type Names = { en: string; ar: string; ru: string }
let nameMap: Map<string, Names> | null = null
let loading = false
const listeners = new Set<() => void>()

function ensureLoaded() {
  if (nameMap || loading) return
  loading = true
  fetch('/data/cities.json')
    .then((r) => r.json())
    .then((d: { cities: Record<string, { en?: string; ar?: string; ru?: string }> }) => {
      const m = new Map<string, Names>()
      for (const [he, rec] of Object.entries(d.cities)) {
        m.set(he, { en: rec.en ?? he, ar: rec.ar ?? he, ru: rec.ru ?? he })
      }
      nameMap = m
      listeners.forEach((fn) => fn())
    })
    .catch(() => {
      loading = false // let a later mount retry
    })
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function getSnapshot() {
  return nameMap
}

export function localizeArea(name: string, lang: Lang): string {
  if (lang === 'he' || !nameMap) return name
  const rec = nameMap.get(name)
  return rec ? rec[lang] : name
}

// Hook returning a localizer for area names. Triggers the lazy load for non-Hebrew languages and
// re-renders the caller once the names arrive.
export function useAreaName(): (name: string) => string {
  const { lang } = useLang()
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    if (lang !== 'he') ensureLoaded()
  }, [lang])
  return (name: string) => localizeArea(name, lang)
}
