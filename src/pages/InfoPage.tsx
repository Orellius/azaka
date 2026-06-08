import { navigate } from '../router'
import { openCookieSettings } from '../consent/consentStore'

// Static content pages (About / Privacy / Terms / Contact) reachable from the sidebar footer. One shell
// renders content keyed by slug so the four pages share layout, RTL, and the back-to-map link. The copy
// is accurate to what this app actually does (official-source alert mirror + NASA FIRMS overlay); the
// legal pages are honest starting text and should get a lawyer's review before launch. Public surface:
// <InfoPage slug="about" | "privacy" | "terms" | "contact" />.
const LAST_UPDATED = '8 ביוני 2026'

export type InfoSlug = 'about' | 'privacy' | 'terms' | 'contact'

type Section = { h: string; p: string[] }
type Page = { title: string; intro: string; sections: Section[] }

const PAGES: Record<InfoSlug, Page> = {
  about: {
    title: 'אודות',
    intro: 'אזעקה היא מפה חיה של התרעות פיקוד העורף, הבנויה סביב עיקרון אחד: דיוק לפני תכונות.',
    sections: [
      {
        h: 'מקור הנתונים',
        p: [
          'ההתרעות נשאבות מהפיד הרשמי של פיקוד העורף (oref.org.il) דרך ממסר עצמאי בעל כתובת IP ישראלית, ומשודרות לדפדפן בזמן אמת. אין צד שלישי בנתיב ההתרעה.',
          'כל התרעה מסווגת לפי הכותרת המילולית של פיקוד העורף, לא לפי מספר הקטגוריה, והטקסט הרשמי מוצג כלשונו.',
        ],
      },
      {
        h: 'שכבת אנומליות תרמיות (NASA FIRMS)',
        p: [
          'המפה מציגה אנומליות תרמיות מלוויינים (NASA FIRMS / VIIRS). אנומליה תרמית מעידה על חום, לא על פגיעה, ומתעדכנת באיחור של עד כ-3 שעות. היא לעולם אינה מאשרת פגיעה.',
        ],
      },
      {
        h: 'מה אזעקה אינה',
        p: [
          'השירות אינו תחליף להתרעות הרשמיות ואינו גורם רשמי. תמיד יש לפעול לפי הנחיות פיקוד העורף והאזעקה במרחב שלכם. אזעקה אינה מסמנת אזור כ«בטוח» לפי טיימר קצר.',
        ],
      },
    ],
  },
  privacy: {
    title: 'מדיניות פרטיות',
    intro: 'אנו שואפים לאסוף מעט ככל האפשר. הדף מתאר אילו נתונים נוגעים לשימוש באתר.',
    sections: [
      {
        h: 'נתונים שאיננו אוספים',
        p: ['האתר אינו דורש הרשמה, אינו מבקש פרטים אישיים ואינו בונה פרופיל משתמש.'],
      },
      {
        h: 'עוגיות',
        p: [
          'אנו שומרים עוגיית העדפה אחת (azaka_consent) הזוכרת את בחירתך במסך העוגיות. זוהי עוגייה חיונית.',
          'אם בעתיד יתווספו עוגיות אנליטיקה, הן ייטענו רק לאחר הסכמתך «אשר הכל», וניתן לבטל בכל עת דרך «הגדרות עוגיות».',
        ],
      },
      {
        h: 'שירותי צד שלישי',
        p: [
          'מפת הרקע נטענת מ-CARTO/OpenStreetMap והגופנים מ-Google Fonts; ספקים אלה עשויים לרשום נתוני בקשה טכניים (כגון כתובת IP) כחלק מאספקת השירות.',
        ],
      },
    ],
  },
  terms: {
    title: 'תנאי שימוש',
    intro: 'השירות ניתן כמידע משלים בלבד. קראו תנאים אלה לפני השימוש.',
    sections: [
      {
        h: 'לא תחליף להתרעה רשמית',
        p: [
          'אזעקה היא כלי מידע ואינה תחליף למערכות ההתרעה הרשמיות. ייתכנו עיכובים, שגיאות או חוסר זמינות. בכל מקרה יש לפעול לפי פיקוד העורף ולפי האזעקה הנשמעת במרחב שלכם.',
        ],
      },
      {
        h: 'ללא אחריות',
        p: [
          'השירות מסופק «כפי שהוא» (AS IS), ללא אחריות מכל סוג. השימוש באחריות המשתמש בלבד, והמפעיל לא יישא באחריות לכל נזק הנובע מהסתמכות על המידע.',
        ],
      },
      {
        h: 'קניין וייחוס',
        p: [
          'נתוני ההתרעות שייכים לפיקוד העורף. אנומליות תרמיות באדיבות NASA FIRMS (LANCE/EOSDIS). מפת הרקע © OpenStreetMap © CARTO.',
        ],
      },
    ],
  },
  contact: {
    title: 'צור קשר',
    intro: 'לשאלות, דיווח על תקלה או בקשת הסרה, נשמח לשמוע.',
    sections: [
      {
        h: 'דוא״ל',
        p: ['ניתן לפנות בכתובת המופיעה למטה. (יש להחליף לכתובת הקשר הרשמית לפני העלייה לאוויר.)'],
      },
      {
        h: 'דיווח על אי-דיוק',
        p: ['מצאתם התרעה שגויה או חוסר התאמה למקור הרשמי? כתבו לנו עם השעה והאזור ונבדוק.'],
      },
    ],
  },
}

export function InfoPage({ slug }: { slug: InfoSlug }) {
  const page = PAGES[slug]
  return (
    <div dir="rtl" className="min-h-screen w-screen overflow-y-auto bg-slate-950 text-slate-200">
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-[13px] font-medium text-sky-400 transition hover:text-sky-300"
        >
          → חזרה למפה
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-white">{page.title}</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-slate-300">{page.intro}</p>

        <div className="mt-7 flex flex-col gap-6">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[15px] font-semibold text-white">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-1.5 text-[13px] leading-relaxed text-slate-400">
                  {para}
                </p>
              ))}
            </section>
          ))}

          {slug === 'contact' && (
            <a
              href="mailto:contact@example.com"
              className="w-fit rounded-lg bg-sky-600 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-sky-500"
            >
              contact@example.com
            </a>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 text-[11px] text-slate-500">
          <button type="button" onClick={() => navigate('/about')} className="transition hover:text-slate-300">
            אודות
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/privacy')} className="transition hover:text-slate-300">
            פרטיות
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/terms')} className="transition hover:text-slate-300">
            תנאי שימוש
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/contact')} className="transition hover:text-slate-300">
            צור קשר
          </button>
          <span>·</span>
          <button type="button" onClick={openCookieSettings} className="transition hover:text-slate-300">
            הגדרות עוגיות
          </button>
        </div>
        <div className="mt-3 text-[11px] text-slate-600">
          עודכן: {LAST_UPDATED} · אזעקה · כל הזכויות שמורות ©
        </div>
      </div>
    </div>
  )
}
