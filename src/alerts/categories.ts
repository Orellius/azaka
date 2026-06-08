// Authoritative Pikud HaOref alert categories. Ids + english keys verified from oref's own
// alertCategories.json (2026-06-08). Severity, remain-policy and the is-threat / is-drill flags are
// grounded in official oref life-safety guidance (verified via research, sources in project memory).
// SAFETY RULE: human-readable text shown to a user MUST prefer the alert's verbatim title/desc from
// the feed; this table is for CLASSIFICATION (colour, filtering, when-safe), never for paraphrasing.
// Shared single source of truth: imported by both the relay and the client so they cannot diverge.

export type Severity = 'active' | 'early' | 'special' | 'cleared' | 'info' | 'drill'

// How the app may EVER indicate it is safe to leave the protected space for this threat:
//  'tenmin'  - rockets/UAV: remain >= 10 min AND the feed no longer lists the area (oref guidance)
//  'release' - ballistic / terror / nonconventional: NEVER auto-clear; explicit official end only
//  'none'    - not a sheltering threat (memorial siren, drill, the all-clear update itself)
export type RemainPolicy = 'tenmin' | 'release' | 'none'

export type Category = {
  id: number
  key: string
  he: string
  severity: Severity
  isThreat: boolean
  remain: RemainPolicy
}

export const CATEGORIES: Record<number, Category> = {
  1: { id: 1, key: 'missilealert', he: 'ירי רקטות וטילים', severity: 'active', isThreat: true, remain: 'tenmin' },
  2: { id: 2, key: 'uav', he: 'חדירת כלי טיס עוין', severity: 'active', isThreat: true, remain: 'tenmin' },
  3: { id: 3, key: 'nonconventional', he: 'אירוע בלתי שגרתי', severity: 'special', isThreat: true, remain: 'release' },
  4: { id: 4, key: 'warning', he: 'התרעה', severity: 'early', isThreat: true, remain: 'tenmin' },
  5: { id: 5, key: 'memorialday1', he: 'צפירת יום הזיכרון', severity: 'info', isThreat: false, remain: 'none' },
  6: { id: 6, key: 'memorialday2', he: 'צפירת יום הזיכרון', severity: 'info', isThreat: false, remain: 'none' },
  7: { id: 7, key: 'earthquakealert1', he: 'התרעת רעידת אדמה', severity: 'special', isThreat: true, remain: 'release' },
  8: { id: 8, key: 'earthquakealert2', he: 'רעידת אדמה', severity: 'special', isThreat: true, remain: 'release' },
  9: { id: 9, key: 'cbrne', he: 'חשש לחומרים מסוכנים', severity: 'special', isThreat: true, remain: 'release' },
  10: { id: 10, key: 'terrorattack', he: 'חדירת מחבלים', severity: 'special', isThreat: true, remain: 'release' },
  11: { id: 11, key: 'tsunami', he: 'התרעת צונאמי', severity: 'special', isThreat: true, remain: 'release' },
  12: { id: 12, key: 'hazmat', he: 'חומרים מסוכנים', severity: 'special', isThreat: true, remain: 'release' },
  13: { id: 13, key: 'update', he: 'האירוע הסתיים', severity: 'cleared', isThreat: false, remain: 'none' },
  14: { id: 14, key: 'flash', he: 'התקרבו למרחב מוגן', severity: 'early', isThreat: true, remain: 'tenmin' },
  15: { id: 15, key: 'missilealertdrill', he: 'תרגיל - ירי רקטות', severity: 'drill', isThreat: false, remain: 'none' },
  16: { id: 16, key: 'uavdrill', he: 'תרגיל - כלי טיס', severity: 'drill', isThreat: false, remain: 'none' },
  17: { id: 17, key: 'nonconventionaldrill', he: 'תרגיל - בלתי שגרתי', severity: 'drill', isThreat: false, remain: 'none' },
}

// oref category ids 15-28 are all drills (verified). Anything outside the known table is treated as a
// real threat (fail-safe: over-warn rather than miss a new threat type) by returning null to the caller.
export function categoryOf(cat: string | number): Category | null {
  const n = typeof cat === 'number' ? cat : parseInt(cat, 10)
  if (Number.isNaN(n)) return null
  if (CATEGORIES[n]) return CATEGORIES[n]
  if (n >= 15 && n <= 28) return { id: n, key: 'drill', he: 'תרגיל', severity: 'drill', isThreat: false, remain: 'none' }
  return null
}

export type Classification = { severity: Severity; key: string; he: string; remain: RemainPolicy; isThreat: boolean }

// SAFETY-CRITICAL: classify a LIVE oref alert by its verbatim `title` (and `desc`), NOT by `cat`.
// The live Alerts.json `cat` numbering differs from alertCategories.json (verified 2026-06-08: live
// cat 10 carries "האירוע הסתיים" = all-clear, not terrorattack), so `cat` is unreliable for the live
// feed. The Hebrew title is oref's own threat name and is unambiguous. Order matters: end + drill +
// memorial are checked before any threat keyword. Unrecognized-but-present => fail-safe over-warn.
export function classifyAlert(title: string, desc = ''): Classification {
  const t = (title || '').trim()
  const all = `${t} ${desc || ''}`
  const has = (s: string) => all.includes(s)

  if (t.includes('האירוע הסתיים') || has('יכולים לצאת') || has('הודעת שחרור'))
    return { severity: 'cleared', key: 'update', he: 'האירוע הסתיים', remain: 'none', isThreat: false }
  if (has('תרגיל')) return { severity: 'drill', key: 'drill', he: 'תרגיל', remain: 'none', isThreat: false }
  if (has('יום הזיכרון')) return { severity: 'info', key: 'memorialday', he: 'צפירת יום הזיכרון', remain: 'none', isThreat: false }
  if (t.includes('התקרבו')) return { severity: 'early', key: 'flash', he: 'התקרבו למרחב מוגן', remain: 'tenmin', isThreat: true }
  if (has('רקטות') || has('טילים')) return { severity: 'active', key: 'missilealert', he: 'ירי רקטות וטילים', remain: 'tenmin', isThreat: true }
  if (has('כלי טיס') || has('מל"ט') || has('כטב"ם') || has('כלי טיס עוין'))
    return { severity: 'active', key: 'uav', he: 'חדירת כלי טיס עוין', remain: 'tenmin', isThreat: true }
  if (has('מחבלים')) return { severity: 'special', key: 'terrorattack', he: 'חדירת מחבלים', remain: 'release', isThreat: true }
  if (has('חומרים מסוכנים') || has('בלתי שגרתי') || has('בלתי קונבנציונלי'))
    return { severity: 'special', key: 'nonconventional', he: 'אירוע חומרים מסוכנים', remain: 'release', isThreat: true }
  if (has('רעידת אדמה')) return { severity: 'special', key: 'earthquake', he: 'רעידת אדמה', remain: 'release', isThreat: true }
  if (has('צונאמי')) return { severity: 'special', key: 'tsunami', he: 'התרעת צונאמי', remain: 'release', isThreat: true }
  // present but unrecognized: never silently drop a possible real threat
  return { severity: 'active', key: 'unknown', he: t || 'התרעה', remain: 'release', isThreat: true }
}
