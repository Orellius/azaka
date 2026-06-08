export type CityLabel = { label: string; names: string[]; lng: number; lat: number }

// Curated major cities to label on the map. Each matches one or more official alert-area names by
// prefix (areas split sub-city, e.g. "תל אביב - מרכז העיר"); the label anchors at the centroid of
// its matched areas and lights up when any of them enters an alert tier. Keeping this list short
// avoids clutter at country zoom; the per-area polygons still carry the full 1449.
const MAJOR: { label: string; prefix: string }[] = [
  { label: 'תל אביב', prefix: 'תל אביב' },
  { label: 'ירושלים', prefix: 'ירושלים' },
  { label: 'חיפה', prefix: 'חיפה' },
  { label: 'ראשון לציון', prefix: 'ראשון לציון' },
  { label: 'פתח תקווה', prefix: 'פתח תקווה' },
  { label: 'אשדוד', prefix: 'אשדוד' },
  { label: 'נתניה', prefix: 'נתניה' },
  { label: 'באר שבע', prefix: 'באר שבע' },
  { label: 'חולון', prefix: 'חולון' },
  { label: 'בני ברק', prefix: 'בני ברק' },
  { label: 'רמת גן', prefix: 'רמת גן' },
  { label: 'רחובות', prefix: 'רחובות' },
  { label: 'אשקלון', prefix: 'אשקלון' },
  { label: 'בת ים', prefix: 'בת ים' },
  { label: 'הרצליה', prefix: 'הרצליה' },
  { label: 'כפר סבא', prefix: 'כפר סבא' },
  { label: 'רעננה', prefix: 'רעננה' },
  { label: 'מודיעין', prefix: 'מודיעין' },
  { label: 'נתיבות', prefix: 'נתיבות' },
  { label: 'שדרות', prefix: 'שדרות' },
  { label: 'אילת', prefix: 'אילת' },
  { label: 'טבריה', prefix: 'טבריה' },
  { label: 'נצרת', prefix: 'נצרת' },
  { label: 'עכו', prefix: 'עכו' },
  { label: 'נהריה', prefix: 'נהריה' },
  { label: 'בית שמש', prefix: 'בית שמש' },
  { label: 'חדרה', prefix: 'חדרה' },
  { label: 'לוד', prefix: 'לוד' },
  { label: 'רמלה', prefix: 'רמלה' },
  { label: 'עפולה', prefix: 'עפולה' },
  { label: 'קריית שמונה', prefix: 'קריית שמונה' },
  { label: 'כרמיאל', prefix: 'כרמיאל' },
  { label: 'אריאל', prefix: 'אריאל' },
]

export function buildCityLabels(points: Map<string, { lng: number; lat: number }>): CityLabel[] {
  const out: CityLabel[] = []
  for (const { label, prefix } of MAJOR) {
    const names: string[] = []
    let sx = 0
    let sy = 0
    for (const [name, p] of points) {
      if (name.startsWith(prefix)) {
        names.push(name)
        sx += p.lng
        sy += p.lat
      }
    }
    if (names.length > 0) out.push({ label, names, lng: sx / names.length, lat: sy / names.length })
  }
  return out
}
