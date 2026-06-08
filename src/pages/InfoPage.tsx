import { navigate } from '../router'
import { openCookieSettings } from '../consent/consentStore'
import { useLang } from '../i18n/useLang'
import type { Lang } from '../i18n/strings'

// Static content pages (About / Privacy / Terms / Contact) reachable from the sidebar footer. One shell
// renders content keyed by slug + language so the four pages share layout and the back-to-map link.
// The copy is accurate to what this app actually does (official-source alert mirror + NASA FIRMS
// overlay); the legal pages are honest starting text and should get a lawyer's review before launch.
// he + en are author-reviewed; ar + ru are machine-drafted and need native review (same as src/i18n).
// Public surface: <InfoPage slug="about" | "privacy" | "terms" | "contact" />.

export type InfoSlug = 'about' | 'privacy' | 'terms' | 'contact'

type Section = { h: string; p: string[] }
type Page = { title: string; intro: string; sections: Section[] }

const PAGES: Record<Lang, Record<InfoSlug, Page>> = {
  he: {
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
          p: ['המפה מציגה אנומליות תרמיות מלוויינים (NASA FIRMS / VIIRS). אנומליה תרמית מעידה על חום, לא על פגיעה, ומתעדכנת באיחור של עד כ-3 שעות. היא לעולם אינה מאשרת פגיעה.'],
        },
        {
          h: 'מה אזעקה אינה',
          p: ['השירות אינו תחליף להתרעות הרשמיות ואינו גורם רשמי. תמיד יש לפעול לפי הנחיות פיקוד העורף והאזעקה במרחב שלכם. אזעקה אינה מסמנת אזור כ«בטוח» לפי טיימר קצר, ואינה מפנה למקלט ספציפי (אין מאגר פתוח אמין של מקלטים ציבוריים).'],
        },
      ],
    },
    privacy: {
      title: 'מדיניות פרטיות',
      intro: 'אנו שואפים לאסוף מעט ככל האפשר. הדף מתאר אילו נתונים נוגעים לשימוש באתר.',
      sections: [
        { h: 'נתונים שאיננו אוספים', p: ['האתר אינו דורש הרשמה, אינו מבקש פרטים אישיים ואינו בונה פרופיל משתמש. בחירת האזור והשפה נשמרות במכשיר שלכם בלבד.'] },
        { h: 'עוגיות', p: ['אנו שומרים עוגיית העדפה אחת (azaka_consent) הזוכרת את בחירתך במסך העוגיות. זוהי עוגייה חיונית.', 'אם בעתיד יתווספו עוגיות אנליטיקה, הן ייטענו רק לאחר הסכמתך «אשר הכל», וניתן לבטל בכל עת דרך «הגדרות עוגיות».'] },
        { h: 'שירותי צד שלישי', p: ['מפת הרקע נטענת מ-CARTO/OpenStreetMap והגופנים מ-Google Fonts; ספקים אלה עשויים לרשום נתוני בקשה טכניים (כגון כתובת IP) כחלק מאספקת השירות.'] },
      ],
    },
    terms: {
      title: 'תנאי שימוש',
      intro: 'השירות ניתן כמידע משלים בלבד. קראו תנאים אלה לפני השימוש.',
      sections: [
        { h: 'לא תחליף להתרעה רשמית', p: ['אזעקה היא כלי מידע ואינה תחליף למערכות ההתרעה הרשמיות. ייתכנו עיכובים, שגיאות או חוסר זמינות. בכל מקרה יש לפעול לפי פיקוד העורף ולפי האזעקה הנשמעת במרחב שלכם.'] },
        { h: 'ללא אחריות', p: ['השירות מסופק «כפי שהוא» (AS IS), ללא אחריות מכל סוג. השימוש באחריות המשתמש בלבד, והמפעיל לא יישא באחריות לכל נזק הנובע מהסתמכות על המידע.'] },
        { h: 'קניין וייחוס', p: ['נתוני ההתרעות שייכים לפיקוד העורף. אנומליות תרמיות באדיבות NASA FIRMS (LANCE/EOSDIS). מפת הרקע © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'צור קשר',
      intro: 'לשאלות, דיווח על תקלה או בקשת הסרה, נשמח לשמוע.',
      sections: [
        { h: 'דוא״ל', p: ['ניתן לפנות בכתובת המופיעה למטה. (יש להחליף לכתובת הקשר הרשמית לפני העלייה לאוויר.)'] },
        { h: 'דיווח על אי-דיוק', p: ['מצאתם התרעה שגויה או חוסר התאמה למקור הרשמי? כתבו לנו עם השעה והאזור ונבדוק.'] },
      ],
    },
  },
  en: {
    about: {
      title: 'About',
      intro: 'Azaka is a live map of Pikud HaOref (Home Front Command) alerts, built around one principle: accuracy before features.',
      sections: [
        {
          h: 'Data source',
          p: [
            'Alerts are pulled from the official Home Front Command feed (oref.org.il) through an independent relay on an Israeli IP, and pushed to your browser in real time. No third party is in the alert path.',
            'Every alert is classified by Home Front Command’s verbatim title, not by a category number, and the official text is shown as-is.',
          ],
        },
        {
          h: 'Thermal-anomaly layer (NASA FIRMS)',
          p: ['The map can show satellite thermal anomalies (NASA FIRMS / VIIRS). A thermal anomaly indicates heat, not an impact, and lags up to ~3 hours. It never confirms a strike.'],
        },
        {
          h: 'What Azaka is not',
          p: ['This is not a substitute for the official alerts and is not an official body. Always follow Home Front Command guidance and the siren in your area. Azaka never marks an area “safe” on a short timer, and does not direct you to a specific shelter (there is no reliable open dataset of public shelters).'],
        },
      ],
    },
    privacy: {
      title: 'Privacy policy',
      intro: 'We aim to collect as little as possible. This page describes what data is involved in using the site.',
      sections: [
        { h: 'Data we do not collect', p: ['The site requires no sign-up, asks for no personal details, and builds no user profile. Your area and language choices are stored on your device only.'] },
        { h: 'Cookies', p: ['We store one preference cookie (azaka_consent) that remembers your choice on the cookie screen. It is an essential cookie.', 'If analytics cookies are ever added, they will load only after you choose “Accept all”, and you can opt out any time via “Cookie settings”.'] },
        { h: 'Third-party services', p: ['The basemap loads from CARTO/OpenStreetMap and the fonts from Google Fonts; these providers may log technical request data (such as your IP address) as part of delivering the service.'] },
      ],
    },
    terms: {
      title: 'Terms of use',
      intro: 'The service is provided as supplementary information only. Read these terms before use.',
      sections: [
        { h: 'Not a substitute for the official alert', p: ['Azaka is an information tool and is not a substitute for the official alerting systems. Delays, errors, or unavailability are possible. Always act according to Home Front Command and the siren sounded in your area.'] },
        { h: 'No warranty', p: ['The service is provided “AS IS”, without warranty of any kind. Use is at your own risk, and the operator is not liable for any damage arising from reliance on the information.'] },
        { h: 'Ownership and attribution', p: ['Alert data belongs to Home Front Command. Thermal anomalies courtesy of NASA FIRMS (LANCE/EOSDIS). Basemap © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'Contact',
      intro: 'For questions, a bug report, or a removal request, we would like to hear from you.',
      sections: [
        { h: 'Email', p: ['Reach us at the address below. (Replace with the official contact address before going live.)'] },
        { h: 'Report an inaccuracy', p: ['Found a wrong alert or a mismatch with the official source? Write to us with the time and the area and we will check.'] },
      ],
    },
  },
  ar: {
    about: {
      title: 'حول',
      intro: 'أزاكا خريطة مباشرة لتنبيهات قيادة الجبهة الداخلية، مبنية على مبدأ واحد: الدقة قبل الميزات.',
      sections: [
        {
          h: 'مصدر البيانات',
          p: [
            'تُسحب التنبيهات من التغذية الرسمية لقيادة الجبهة الداخلية (oref.org.il) عبر مُرحِّل مستقل بعنوان IP إسرائيلي، وتُبث إلى متصفحك مباشرة. لا يوجد طرف ثالث في مسار التنبيه.',
            'يُصنَّف كل تنبيه حسب العنوان الحرفي لقيادة الجبهة الداخلية، لا حسب رقم الفئة، ويُعرض النص الرسمي كما هو.',
          ],
        },
        {
          h: 'طبقة الشذوذات الحرارية (NASA FIRMS)',
          p: ['يمكن للخريطة عرض شذوذات حرارية من الأقمار الصناعية (NASA FIRMS / VIIRS). يدل الشذوذ الحراري على حرارة لا على إصابة، ويتأخر حتى نحو 3 ساعات. وهو لا يؤكد الإصابة أبدًا.'],
        },
        {
          h: 'ما ليست أزاكا',
          p: ['هذه الخدمة ليست بديلاً عن التنبيهات الرسمية وليست جهة رسمية. اتبع دائمًا توجيهات قيادة الجبهة الداخلية والإنذار في منطقتك. لا تضع أزاكا علامة «آمن» اعتمادًا على مؤقّت قصير، ولا توجّهك إلى ملجأ محدد (لا تتوفر بيانات مفتوحة موثوقة للملاجئ العامة).'],
        },
      ],
    },
    privacy: {
      title: 'سياسة الخصوصية',
      intro: 'نهدف إلى جمع أقل قدر ممكن. تصف هذه الصفحة البيانات المتعلقة باستخدام الموقع.',
      sections: [
        { h: 'بيانات لا نجمعها', p: ['لا يتطلب الموقع التسجيل، ولا يطلب تفاصيل شخصية، ولا يبني ملفًا للمستخدم. تُحفظ اختيارات المنطقة واللغة على جهازك فقط.'] },
        { h: 'ملفات تعريف الارتباط', p: ['نحفظ ملف تفضيل واحدًا (azaka_consent) يتذكر اختيارك في شاشة الكوكيز. وهو ملف أساسي.', 'إذا أُضيفت ملفات تحليلات مستقبلًا، فلن تُحمَّل إلا بعد اختيارك «قبول الكل»، ويمكنك الإلغاء في أي وقت عبر «إعدادات الكوكيز».'] },
        { h: 'خدمات الطرف الثالث', p: ['تُحمَّل خريطة الخلفية من CARTO/OpenStreetMap والخطوط من Google Fonts؛ وقد تسجّل هذه الجهات بيانات طلب تقنية (مثل عنوان IP) كجزء من تقديم الخدمة.'] },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      intro: 'تُقدَّم الخدمة كمعلومات تكميلية فقط. اقرأ هذه الشروط قبل الاستخدام.',
      sections: [
        { h: 'ليست بديلاً عن الإنذار الرسمي', p: ['أزاكا أداة معلومات وليست بديلاً عن أنظمة الإنذار الرسمية. قد تحدث تأخيرات أو أخطاء أو عدم توفر. تصرّف دائمًا وفق قيادة الجبهة الداخلية والإنذار الصادر في منطقتك.'] },
        { h: 'بلا ضمان', p: ['تُقدَّم الخدمة «كما هي» دون أي ضمان. الاستخدام على مسؤوليتك، والمشغّل غير مسؤول عن أي ضرر ناتج عن الاعتماد على المعلومات.'] },
        { h: 'الملكية والإسناد', p: ['بيانات التنبيهات ملك لقيادة الجبهة الداخلية. الشذوذات الحرارية بإذن من NASA FIRMS (LANCE/EOSDIS). خريطة الخلفية © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'اتصل بنا',
      intro: 'للأسئلة أو الإبلاغ عن خلل أو طلب إزالة، يسعدنا تواصلك.',
      sections: [
        { h: 'البريد الإلكتروني', p: ['تواصل معنا على العنوان أدناه. (استبدله بعنوان الاتصال الرسمي قبل الإطلاق.)'] },
        { h: 'الإبلاغ عن خطأ', p: ['وجدت تنبيهًا خاطئًا أو عدم تطابق مع المصدر الرسمي؟ راسلنا بالوقت والمنطقة وسنتحقق.'] },
      ],
    },
  },
  ru: {
    about: {
      title: 'О проекте',
      intro: 'Azaka — это карта оповещений Командования тыла в реальном времени, построенная на одном принципе: точность важнее функций.',
      sections: [
        {
          h: 'Источник данных',
          p: [
            'Оповещения берутся из официальной ленты Командования тыла (oref.org.il) через независимый ретранслятор с израильским IP и передаются в браузер в реальном времени. В пути оповещения нет третьих сторон.',
            'Каждое оповещение классифицируется по дословному заголовку Командования тыла, а не по номеру категории, и официальный текст показывается как есть.',
          ],
        },
        {
          h: 'Слой тепловых аномалий (NASA FIRMS)',
          p: ['Карта может показывать спутниковые тепловые аномалии (NASA FIRMS / VIIRS). Тепловая аномалия указывает на тепло, а не на удар, и запаздывает до ~3 часов. Она никогда не подтверждает удар.'],
        },
        {
          h: 'Чем Azaka не является',
          p: ['Это не замена официальных оповещений и не официальный орган. Всегда следуйте указаниям Командования тыла и сирене в вашем районе. Azaka не помечает район «безопасным» по короткому таймеру и не направляет к конкретному укрытию (надёжных открытых данных об общественных укрытиях нет).'],
        },
      ],
    },
    privacy: {
      title: 'Политика конфиденциальности',
      intro: 'Мы стремимся собирать как можно меньше. На этой странице описано, какие данные затрагивает использование сайта.',
      sections: [
        { h: 'Данные, которые мы не собираем', p: ['Сайт не требует регистрации, не запрашивает личные данные и не строит профиль пользователя. Выбор района и языка хранятся только на вашем устройстве.'] },
        { h: 'Cookie', p: ['Мы храним один cookie настроек (azaka_consent), запоминающий ваш выбор на экране cookie. Это необходимый cookie.', 'Если в будущем появятся аналитические cookie, они загрузятся только после выбора «Принять все», и отказаться можно в любой момент через «Настройки cookie».'] },
        { h: 'Сторонние сервисы', p: ['Подложка карты загружается с CARTO/OpenStreetMap, а шрифты — с Google Fonts; эти провайдеры могут записывать технические данные запроса (например, ваш IP-адрес) в рамках предоставления сервиса.'] },
      ],
    },
    terms: {
      title: 'Условия использования',
      intro: 'Сервис предоставляется только как дополнительная информация. Прочитайте эти условия перед использованием.',
      sections: [
        { h: 'Не замена официального оповещения', p: ['Azaka — это информационный инструмент, а не замена официальных систем оповещения. Возможны задержки, ошибки или недоступность. Всегда действуйте согласно Командованию тыла и сирене в вашем районе.'] },
        { h: 'Без гарантий', p: ['Сервис предоставляется «КАК ЕСТЬ», без каких-либо гарантий. Использование на ваш риск; оператор не несёт ответственности за ущерб от опоры на эту информацию.'] },
        { h: 'Права и атрибуция', p: ['Данные оповещений принадлежат Командованию тыла. Тепловые аномалии — NASA FIRMS (LANCE/EOSDIS). Подложка © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'Контакты',
      intro: 'По вопросам, сообщениям об ошибке или запросам на удаление — будем рады услышать вас.',
      sections: [
        { h: 'Эл. почта', p: ['Напишите нам по адресу ниже. (Замените на официальный контактный адрес перед запуском.)'] },
        { h: 'Сообщить о неточности', p: ['Нашли неверное оповещение или несоответствие официальному источнику? Напишите нам время и район — мы проверим.'] },
      ],
    },
  },
}

export function InfoPage({ slug }: { slug: InfoSlug }) {
  const { t, lang } = useLang()
  const page = PAGES[lang][slug]
  return (
    <div className="min-h-screen w-screen overflow-y-auto bg-slate-950 text-slate-200">
      <div className="mx-auto w-full max-w-2xl px-5 py-10">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-6 text-[13px] font-medium text-sky-400 transition hover:text-sky-300"
        >
          {t('info_back')}
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
            {t('nav_about')}
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/privacy')} className="transition hover:text-slate-300">
            {t('nav_privacy')}
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/terms')} className="transition hover:text-slate-300">
            {t('nav_terms')}
          </button>
          <span>·</span>
          <button type="button" onClick={() => navigate('/contact')} className="transition hover:text-slate-300">
            {t('nav_contact')}
          </button>
          <span>·</span>
          <button type="button" onClick={openCookieSettings} className="transition hover:text-slate-300">
            {t('nav_cookies')}
          </button>
        </div>
        <div className="mt-3 text-[11px] text-slate-600">
          {t('info_updated')} · {t('rights')}
        </div>
      </div>
    </div>
  )
}
