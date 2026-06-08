import type { Lang } from '../i18n/strings'

export type CityLabel = { label: Record<Lang, string>; names: string[]; lng: number; lat: number }

// Curated major cities to label on the map. Each matches one or more official alert-area names by
// prefix (areas split sub-city, e.g. "תל אביב - מרכז העיר"); the label anchors at the centroid of
// its matched areas and lights up when any of them enters an alert tier. Keeping this list short
// avoids clutter at country zoom; the per-area polygons still carry the full 1449. Labels are
// per-language; ar/ru are machine-drafted (see src/i18n) and want a native review before launch.
const MAJOR: { he: string; en: string; ar: string; ru: string; prefix: string }[] = [
  { he: 'תל אביב', en: 'Tel Aviv', ar: 'تل أبيب', ru: 'Тель-Авив', prefix: 'תל אביב' },
  { he: 'ירושלים', en: 'Jerusalem', ar: 'القدس', ru: 'Иерусалим', prefix: 'ירושלים' },
  { he: 'חיפה', en: 'Haifa', ar: 'حيفا', ru: 'Хайфа', prefix: 'חיפה' }, // allow-personal: Haifa is a major city the national alert map must label (requested)
  { he: 'ראשון לציון', en: 'Rishon LeZion', ar: 'ريشون لتسيون', ru: 'Ришон-ле-Цион', prefix: 'ראשון לציון' },
  { he: 'פתח תקווה', en: 'Petah Tikva', ar: 'بيتح تكفا', ru: 'Петах-Тиква', prefix: 'פתח תקווה' },
  { he: 'אשדוד', en: 'Ashdod', ar: 'أشدود', ru: 'Ашдод', prefix: 'אשדוד' },
  { he: 'נתניה', en: 'Netanya', ar: 'نتانيا', ru: 'Нетания', prefix: 'נתניה' },
  { he: 'באר שבע', en: "Be'er Sheva", ar: 'بئر السبع', ru: 'Беэр-Шева', prefix: 'באר שבע' },
  { he: 'חולון', en: 'Holon', ar: 'حولون', ru: 'Холон', prefix: 'חולון' },
  { he: 'בני ברק', en: 'Bnei Brak', ar: 'بني براك', ru: 'Бней-Брак', prefix: 'בני ברק' },
  { he: 'רמת גן', en: 'Ramat Gan', ar: 'رمات غان', ru: 'Рамат-Ган', prefix: 'רמת גן' },
  { he: 'רחובות', en: 'Rehovot', ar: 'رحوفوت', ru: 'Реховот', prefix: 'רחובות' },
  { he: 'אשקלון', en: 'Ashkelon', ar: 'عسقلان', ru: 'Ашкелон', prefix: 'אשקלון' },
  { he: 'בת ים', en: 'Bat Yam', ar: 'بات يام', ru: 'Бат-Ям', prefix: 'בת ים' },
  { he: 'הרצליה', en: 'Herzliya', ar: 'هرتسليا', ru: 'Герцлия', prefix: 'הרצליה' },
  { he: 'כפר סבא', en: 'Kfar Saba', ar: 'كفار سابا', ru: 'Кфар-Сава', prefix: 'כפר סבא' },
  { he: 'רעננה', en: "Ra'anana", ar: 'رعنانا', ru: 'Раанана', prefix: 'רעננה' },
  { he: 'מודיעין', en: "Modi'in", ar: 'موديعين', ru: 'Модиин', prefix: 'מודיעין' },
  { he: 'נתיבות', en: 'Netivot', ar: 'نتيفوت', ru: 'Нетивот', prefix: 'נתיבות' },
  { he: 'שדרות', en: 'Sderot', ar: 'سديروت', ru: 'Сдерот', prefix: 'שדרות' },
  { he: 'אילת', en: 'Eilat', ar: 'إيلات', ru: 'Эйлат', prefix: 'אילת' },
  { he: 'טבריה', en: 'Tiberias', ar: 'طبريا', ru: 'Тверия', prefix: 'טבריה' },
  { he: 'נצרת', en: 'Nazareth', ar: 'الناصرة', ru: 'Назарет', prefix: 'נצרת' },
  { he: 'עכו', en: 'Acre', ar: 'عكا', ru: 'Акко', prefix: 'עכו' },
  { he: 'נהריה', en: 'Nahariya', ar: 'نهاريا', ru: 'Нагария', prefix: 'נהריה' },
  { he: 'בית שמש', en: 'Beit Shemesh', ar: 'بيت شيمش', ru: 'Бейт-Шемеш', prefix: 'בית שמש' },
  { he: 'חדרה', en: 'Hadera', ar: 'الخضيرة', ru: 'Хадера', prefix: 'חדרה' },
  { he: 'לוד', en: 'Lod', ar: 'اللد', ru: 'Лод', prefix: 'לוד' },
  { he: 'רמלה', en: 'Ramla', ar: 'الرملة', ru: 'Рамла', prefix: 'רמלה' },
  { he: 'עפולה', en: 'Afula', ar: 'العفولة', ru: 'Афула', prefix: 'עפולה' },
  { he: 'קריית שמונה', en: 'Kiryat Shmona', ar: 'كريات شمونة', ru: 'Кирьят-Шмона', prefix: 'קריית שמונה' },
  { he: 'כרמיאל', en: 'Karmiel', ar: 'كرمئيل', ru: 'Кармиэль', prefix: 'כרמיאל' },
  { he: 'אריאל', en: 'Ariel', ar: 'أريئيل', ru: 'Ариэль', prefix: 'אריאל' },
]

export function buildCityLabels(points: Map<string, { lng: number; lat: number }>): CityLabel[] {
  const out: CityLabel[] = []
  for (const { he, en, ar, ru, prefix } of MAJOR) {
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
    if (names.length > 0) out.push({ label: { he, en, ar, ru }, names, lng: sx / names.length, lat: sy / names.length })
  }
  return out
}
