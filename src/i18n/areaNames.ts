import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { useLang } from './useLang'
import type { Lang } from './strings'

// Localized locality NAMES + REGION grouping. public/data/cities.json carries he/en/ar/ru names and
// an `area` integer (the Pikud HaOref alert REGION id) for all 1449 localities. We use it for two
// things: translate a locality name for non-Hebrew languages, and group an alert's cities into the
// named regions they hit (Gaza Envelope, Conflict Line, Jordan Valley, ...) like tzevaadom does.
// Lazy: cities.json (~422 KB) is fetched once, on first need; cached thereafter. Name fallback is the
// Hebrew name; regions are skipped until the file loads.
//
// REGIONS: the area-id -> region-name table. Names are oref's OWN official district labels (verified
// against oref.org.il/districts/cities_{heb,eng,arb,rus}.json, cross-checked with amitfin/oref_alert),
// with the leading "אזור"/"Area"/"منطقة"/"Район" prefix stripped and a few English labels clarified
// (Conflict Line, Gaza Envelope, Jordan Valley). he/ar/ru are oref-authoritative; en is oref + light edits.

type Names = { en: string; ar: string; ru: string }
let nameMap: Map<string, Names> | null = null
let areaMap: Map<string, number> | null = null
let loading = false
const listeners = new Set<() => void>()

const REGIONS: Record<number, Record<Lang, string>> = {
  1: { he: 'גליל עליון', en: 'Upper Galilee', ar: 'الجليل الأعلى', ru: 'Верхняя Галилея' },
  2: { he: 'דרום הנגב', en: 'Southern Negev', ar: 'جنوب النقب', ru: 'Южный Негев' },
  3: { he: 'שפלת יהודה', en: 'Judean Foothills', ar: 'شفلات يهودا', ru: 'Шфелат-Йехуда' },
  4: { he: 'גליל תחתון', en: 'Lower Galilee', ar: 'الجليل الأسفل', ru: 'Нижняя Галилея' },
  5: { he: 'מנשה', en: 'Menashe', ar: 'مناشيه', ru: 'Менаше' },
  6: { he: 'קו העימות', en: 'Conflict Line', ar: 'خط المواجهة', ru: 'Линия конфликта' },
  7: { he: 'לכיש', en: 'Lachish', ar: 'لخيش', ru: 'Лахиш' },
  9: { he: 'השרון', en: 'Sharon', ar: 'الشارون', ru: 'Шарон' },
  10: { he: 'גולן דרום', en: 'Southern Golan', ar: 'جنوب الجولان', ru: 'Южные Голаны' },
  11: { he: 'שומרון', en: 'Samaria', ar: 'شومرون', ru: 'Шомрон' },
  12: { he: 'ים המלח', en: 'Dead Sea', ar: 'البحر الميت', ru: 'Мёртвое море' },
  13: { he: 'עוטף עזה', en: 'Gaza Envelope', ar: 'غلاف غزة', ru: 'Отеф-Аза (Газа)' },
  14: { he: 'יהודה', en: 'Judea', ar: 'يهودا', ru: 'Йехуда' },
  15: { he: 'ואדי ערה', en: 'Wadi Ara', ar: 'وادي عارة', ru: 'Вади-Ара' },
  16: { he: 'מרכז הגליל', en: 'Central Galilee', ar: 'الجليل المركزي', ru: 'Центральная Галилея' },
  17: { he: 'מערב הנגב', en: 'Western Negev', ar: 'غرب النقب', ru: 'Западный Негев' },
  18: { he: 'דן', en: 'Dan', ar: 'دان', ru: 'Дан' },
  19: { he: 'המפרץ', en: 'Haifa Bay', ar: 'المفراتس', ru: 'Хайфский залив' }, // allow-personal: official oref region name; the national alert map must show the Haifa Bay region (requested)
  20: { he: 'ירקון', en: 'Yarkon', ar: 'اليركون', ru: 'Яркон' },
  21: { he: 'מערב לכיש', en: 'Western Lachish', ar: 'غرب لخيش', ru: 'Западный Лахиш' },
  22: { he: 'הכרמל', en: 'Carmel', ar: 'الكرمل', ru: 'Кармель' },
  23: { he: 'השפלה', en: 'Shfela', ar: 'هشفيلاه', ru: 'Шфела' },
  24: { he: 'מרכז הנגב', en: 'Central Negev', ar: 'النقب المركزي', ru: 'Центральный Негев' },
  25: { he: 'בקעת בית שאן', en: "Beit Shean Valley", ar: 'غور بيت شان', ru: 'Долина Бейт-Шеан' },
  26: { he: 'אילת', en: 'Eilat', ar: 'إيلات', ru: 'Эйлат' },
  27: { he: 'ערבה', en: 'Arava', ar: 'العرباه', ru: 'Арава' },
  28: { he: 'גולן צפון', en: 'Northern Golan', ar: 'شمال الجولان', ru: 'Северные Голаны' },
  29: { he: 'בקעת הירדן', en: 'Jordan Valley', ar: 'الأغوار', ru: 'Иорданская долина' },
  32: { he: 'ירושלים', en: 'Jerusalem', ar: 'أورشليم القدس', ru: 'Иерусалим' },
  34: { he: 'העמקים', en: 'Jezreel Valley', ar: 'هعماكيم', ru: 'Изреэльская долина' },
}

function ensureLoaded() {
  if (nameMap || loading) return
  loading = true
  fetch('/data/cities.json')
    .then((r) => r.json())
    .then((d: { cities: Record<string, { en?: string; ar?: string; ru?: string; area?: number }> }) => {
      const names = new Map<string, Names>()
      const areas = new Map<string, number>()
      for (const [he, rec] of Object.entries(d.cities)) {
        names.set(he, { en: rec.en ?? he, ar: rec.ar ?? he, ru: rec.ru ?? he })
        if (typeof rec.area === 'number') areas.set(he, rec.area)
      }
      nameMap = names
      areaMap = areas
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

export type RegionHit = { id: number; name: string; count: number }

// Group an alert's localities into the named oref regions they hit, busiest first.
export function regionsFor(cities: string[], lang: Lang): RegionHit[] {
  if (!areaMap) return []
  const counts = new Map<number, number>()
  for (const c of cities) {
    const id = areaMap.get(c)
    if (id != null && REGIONS[id]) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return [...counts.entries()].map(([id, count]) => ({ id, name: REGIONS[id][lang], count })).sort((a, b) => b.count - a.count)
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

// Hook returning the region grouping for a city list. Needs cities.json for every language (to know
// which region a city is in), so it always triggers the load.
export function useRegions(): (cities: string[]) => RegionHit[] {
  const { lang } = useLang()
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  useEffect(() => {
    ensureLoaded()
  }, [])
  return (cities: string[]) => regionsFor(cities, lang)
}

export type RegionLabel = { id: number; name: string; lng: number; lat: number }

// Static region-name labels for the map: one per oref region, anchored at the centroid of its member
// areas (averaged from the polygon centroids the caller passes in, since cities.json has no coords).
// These give persistent orientation ("עוטף עזה", "Gaza Envelope", ...) under the alert-driven pills.
export function useRegionCentroids(areaPoints: Map<string, { lng: number; lat: number }>): RegionLabel[] {
  const { lang } = useLang()
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot) // recompute once cities.json (areaMap) arrives
  useEffect(() => {
    ensureLoaded()
  }, [])
  return useMemo(() => {
    if (!snap || !areaMap || areaPoints.size === 0) return [] // snap (nameMap) is set with areaMap; gates until loaded
    const acc = new Map<number, { sx: number; sy: number; n: number }>()
    for (const [name, p] of areaPoints) {
      const id = areaMap.get(name)
      if (id == null || !REGIONS[id]) continue
      const a = acc.get(id) ?? { sx: 0, sy: 0, n: 0 }
      a.sx += p.lng
      a.sy += p.lat
      a.n += 1
      acc.set(id, a)
    }
    return [...acc.entries()].map(([id, a]) => ({ id, name: REGIONS[id][lang], lng: a.sx / a.n, lat: a.sy / a.n }))
  }, [areaPoints, lang, snap])
}
