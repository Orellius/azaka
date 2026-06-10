// First-party anonymous page-view log + aggregation for the relay, mirroring history.ts: each year
// lives in its own file (relay/data/analytics-YYYY.jsonl). A hit is one pageview; `vid` is the
// consented first-party visitor cookie (hits without it count toward views only, never visitors).
// No IPs or user agents are ever stored; country comes from Cloudflare's cf-ipcountry header.
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'

const DATA_DIR = 'relay/data'
mkdirSync(DATA_DIR, { recursive: true })

export type Hit = { ts: number; vid?: string; path?: string; c?: string; lang?: string }

const yearFile = (year: number) => `${DATA_DIR}/analytics-${year}.jsonl`

export function recordHit(h: Hit) {
  try {
    appendFileSync(yearFile(new Date(h.ts).getFullYear()), JSON.stringify(h) + '\n')
  } catch (err) {
    console.error('[analytics]', (err as Error).message)
  }
}

function readAllHits(): Hit[] {
  try {
    return readdirSync(DATA_DIR)
      .map((f) => /^analytics-(\d{4})\.jsonl$/.exec(f))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b)
      .flatMap((year) => {
        const f = yearFile(year)
        if (!existsSync(f)) return []
        return readFileSync(f, 'utf8')
          .trim()
          .split('\n')
          .filter(Boolean)
          .map((l) => {
            try {
              return JSON.parse(l) as Hit
            } catch {
              return null
            }
          })
          .filter((x): x is Hit => x !== null)
      })
  } catch {
    return []
  }
}

const localDay = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const topN = (counts: Record<string, number>, n: number): Record<string, number> =>
  Object.fromEntries(
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n),
  )

export type Analytics = {
  totals: { views: number; visitors: number }
  today: { views: number; visitors: number }
  byDay: Record<string, { views: number; visitors: number }>
  byCountry: Record<string, number>
  byPath: Record<string, number>
  byLang: Record<string, number>
}

export function computeAnalytics(): Analytics {
  const hits = readAllHits()
  const today = localDay(Date.now())
  const cutoff = localDay(Date.now() - 29 * 86_400_000) // last 30 days incl. today; YYYY-MM-DD compares lexically

  const allVids = new Set<string>()
  const todayVids = new Set<string>()
  let todayViews = 0
  const dayViews: Record<string, number> = {}
  const dayVids: Record<string, Set<string>> = {}
  const byCountry: Record<string, number> = {}
  const byPath: Record<string, number> = {}
  const byLang: Record<string, number> = {}

  for (const h of hits) {
    if (h.vid) allVids.add(h.vid)
    const day = localDay(h.ts ?? 0)
    if (day === today) {
      todayViews++
      if (h.vid) todayVids.add(h.vid)
    }
    if (day >= cutoff) {
      dayViews[day] = (dayViews[day] ?? 0) + 1
      if (h.vid) (dayVids[day] ??= new Set()).add(h.vid)
    }
    if (h.c) byCountry[h.c] = (byCountry[h.c] ?? 0) + 1
    if (h.path) byPath[h.path] = (byPath[h.path] ?? 0) + 1
    if (h.lang) byLang[h.lang] = (byLang[h.lang] ?? 0) + 1
  }

  const byDay = Object.fromEntries(
    Object.entries(dayViews)
      .sort()
      .map(([day, views]) => [day, { views, visitors: dayVids[day]?.size ?? 0 }]),
  )

  return {
    totals: { views: hits.length, visitors: allVids.size },
    today: { views: todayViews, visitors: todayVids.size },
    byDay,
    byCountry: topN(byCountry, 10),
    byPath: topN(byPath, 10),
    byLang,
  }
}
