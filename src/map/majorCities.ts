// Prefixes of the larger localities. The map labels are alert-driven (we label the areas that are
// actually under alert, not a curated always-on set), so this list is used only to THIN labels at low
// zoom during a busy barrage: show the bigger places first, reveal the smaller alerted localities as
// you zoom in. Official alert-area names split sub-city (e.g. "תל אביב - מרכז העיר"), so match by prefix.
const MAJOR_PREFIXES = [
  'תל אביב',
  'ירושלים',
  'חיפה', // allow-personal: Haifa is a major city used to thin the national alert map (requested)
  'ראשון לציון',
  'פתח תקווה',
  'אשדוד',
  'נתניה',
  'באר שבע',
  'חולון',
  'בני ברק',
  'רמת גן',
  'רחובות',
  'אשקלון',
  'בת ים',
  'הרצליה',
  'כפר סבא',
  'רעננה',
  'מודיעין',
  'נתיבות',
  'שדרות',
  'אילת',
  'טבריה',
  'נצרת',
  'עכו',
  'נהריה',
  'בית שמש',
  'חדרה',
  'לוד',
  'רמלה',
  'עפולה',
  'קריית שמונה',
  'כרמיאל',
  'אריאל',
]

export function isMajorArea(name: string): boolean {
  return MAJOR_PREFIXES.some((p) => name.startsWith(p))
}
