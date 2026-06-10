import { navigate } from '../router'
import { openCookieSettings } from '../consent/consentStore'
import { useLang } from '../i18n/useLang'
import type { Lang } from '../i18n/strings'

// Static content pages (About / Privacy / Terms / Contact) reachable from the sidebar footer. One shell
// renders content keyed by slug + language so the four pages share layout and the back-to-map link.
// The copy is accurate to what this app actually does (official-source alert mirror); the legal pages
// are honest starting text and should get a lawyer's review before launch.
// he + en are author-reviewed; ar + ru are machine-drafted and need native review (same as src/i18n).
// Public surface: <InfoPage slug="about" | "privacy" | "terms" | "contact" | "accessibility" />.

export type InfoSlug = 'about' | 'privacy' | 'terms' | 'contact' | 'accessibility'

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
        { h: 'עוגיות', p: ['אנו שומרים עוגיית העדפה אחת (azaka_consent) הזוכרת את בחירתך במסך העוגיות. זוהי עוגייה חיונית.', 'רק לאחר בחירת «אשר הכל» נשמרת גם עוגיית סטטיסטיקה אנונימית מטעמנו (azaka_vid): מזהה אקראי שסופר ביקורים באתר, ללא פרופיל אישי וללא שירותי אנליטיקה של צד שלישי. ניתן לבטל בכל עת דרך «הגדרות עוגיות» והעוגייה תימחק. ללא הסכמה נספרות צפיות במצטבר בלבד, ללא כל מזהה.'] },
        { h: 'שירותי צד שלישי', p: ['מפת הרקע נטענת מ-CARTO/OpenStreetMap והגופנים מ-Google Fonts; ספקים אלה עשויים לרשום נתוני בקשה טכניים (כגון כתובת IP) כחלק מאספקת השירות.'] },
      ],
    },
    terms: {
      title: 'תנאי שימוש',
      intro: 'השירות ניתן כמידע משלים בלבד. קראו תנאים אלה לפני השימוש.',
      sections: [
        { h: 'לא תחליף להתרעה רשמית', p: ['אזעקה היא כלי מידע ואינה תחליף למערכות ההתרעה הרשמיות. ייתכנו עיכובים, שגיאות או חוסר זמינות. בכל מקרה יש לפעול לפי פיקוד העורף ולפי האזעקה הנשמעת במרחב שלכם.'] },
        { h: 'ללא אחריות', p: ['השירות מסופק «כפי שהוא» (AS IS), ללא אחריות מכל סוג. השימוש באחריות המשתמש בלבד, והמפעיל לא יישא באחריות לכל נזק הנובע מהסתמכות על המידע.'] },
        { h: 'קניין וייחוס', p: ['נתוני ההתרעות שייכים לפיקוד העורף. מפת הרקע © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'צור קשר',
      intro: 'לשאלות, דיווח על תקלה או בקשת הסרה, נשמח לשמוע.',
      sections: [
        { h: 'דוא״ל', p: ['ניתן לפנות אלינו בכתובת המופיעה למטה.'] },
        { h: 'דיווח על אי-דיוק', p: ['מצאתם התרעה שגויה או חוסר התאמה למקור הרשמי? כתבו לנו עם השעה והאזור ונבדוק.'] },
      ],
    },
    accessibility: {
      title: 'הצהרת נגישות',
      intro: 'אזעקה היא שירות חירום ציבורי, ואנו רואים בהנגשתו לכלל הציבור, כולל אנשים עם מוגבלות, חלק מהמשימה עצמה.',
      sections: [
        { h: 'התאמה לתקנות', p: ['האתר שואף לעמוד בתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013, ובתקן הישראלי ת"י 5568 המבוסס על הנחיות WCAG 2.0 ברמה AA.'] },
        { h: 'תכונות נגישות באתר', p: ['כפתור הנגישות הצף מאפשר: התאמת גודל טקסט (שלוש דרגות), ניגודיות גבוהה, הדגשת קישורים ועצירת אנימציות. ההעדפות נשמרות במכשיר שלכם.', 'בנוסף: ניווט מלא במקלדת, תוויות לקוראי מסך, תמיכה מלאה בכיווניות (RTL/LTR) וארבע שפות: עברית, אנגלית, ערבית ורוסית.'] },
        { h: 'שיפור מתמיד ופניות', p: ['הנגשת האתר היא תהליך מתמשך ואנו ממשיכים לשפר. נתקלתם בבעיית נגישות? נשמח לדיווח דרך עמוד «צור קשר» ונטפל בהקדם.', 'ההצהרה עודכנה: 10 ביוני 2026.'] },
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
        { h: 'Cookies', p: ['We store one preference cookie (azaka_consent) that remembers your choice on the cookie screen. It is an essential cookie.', 'Only after you choose “Accept all” do we also set a first-party anonymous-statistics cookie (azaka_vid): a random identifier that counts visits to the site, with no personal profiling and no third-party analytics. You can revoke it any time via “Cookie settings” and the cookie is deleted. Without consent, page views are counted as anonymous totals only, with no identifier.'] },
        { h: 'Third-party services', p: ['The basemap loads from CARTO/OpenStreetMap and the fonts from Google Fonts; these providers may log technical request data (such as your IP address) as part of delivering the service.'] },
      ],
    },
    terms: {
      title: 'Terms of use',
      intro: 'The service is provided as supplementary information only. Read these terms before use.',
      sections: [
        { h: 'Not a substitute for the official alert', p: ['Azaka is an information tool and is not a substitute for the official alerting systems. Delays, errors, or unavailability are possible. Always act according to Home Front Command and the siren sounded in your area.'] },
        { h: 'No warranty', p: ['The service is provided “AS IS”, without warranty of any kind. Use is at your own risk, and the operator is not liable for any damage arising from reliance on the information.'] },
        { h: 'Ownership and attribution', p: ['Alert data belongs to Home Front Command. Basemap © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'Contact',
      intro: 'For questions, a bug report, or a removal request, we would like to hear from you.',
      sections: [
        { h: 'Email', p: ['Reach us at the address below.'] },
        { h: 'Report an inaccuracy', p: ['Found a wrong alert or a mismatch with the official source? Write to us with the time and the area and we will check.'] },
      ],
    },
    accessibility: {
      title: 'Accessibility statement',
      intro: 'Azaka is a public emergency surface, and making it usable by everyone, including people with disabilities, is part of the mission itself.',
      sections: [
        { h: 'Conformance', p: ['The site aims to conform to the Israeli accessibility regulations (Equal Rights for Persons with Disabilities Regulations (Service Accessibility Adjustments), 5773-2013) and Israeli Standard IS 5568, based on the WCAG 2.0 guidelines at level AA.'] },
        { h: 'Accessibility features', p: ['The floating accessibility button offers: adjustable text size (three steps), high contrast, link underlining, and reduced motion. Preferences are saved on your device.', 'In addition: full keyboard navigation, screen-reader labels, full RTL/LTR support, and four languages: Hebrew, English, Arabic, and Russian.'] },
        { h: 'Continuous improvement and feedback', p: ['Accessibility is an ongoing effort and we keep improving. Encountered an accessibility issue? Please report it via the Contact page and we will address it promptly.', 'Statement updated: 10 June 2026.'] },
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
        { h: 'ملفات تعريف الارتباط', p: ['نحفظ ملف تفضيل واحدًا (azaka_consent) يتذكر اختيارك في شاشة الكوكيز. وهو ملف أساسي.', 'فقط بعد اختيار «قبول الكل» نحفظ أيضًا ملف إحصاءات مجهولًا خاصًا بنا (azaka_vid): معرّف عشوائي يَعُدّ زيارات الموقع، دون أي ملف شخصي ودون خدمات تحليلات من طرف ثالث. يمكنك التراجع في أي وقت عبر «إعدادات الكوكيز» وسيُحذف الملف. وبدون الموافقة تُحسب المشاهدات كأرقام إجمالية مجهولة فقط، دون أي معرّف.'] },
        { h: 'خدمات الطرف الثالث', p: ['تُحمَّل خريطة الخلفية من CARTO/OpenStreetMap والخطوط من Google Fonts؛ وقد تسجّل هذه الجهات بيانات طلب تقنية (مثل عنوان IP) كجزء من تقديم الخدمة.'] },
      ],
    },
    terms: {
      title: 'شروط الاستخدام',
      intro: 'تُقدَّم الخدمة كمعلومات تكميلية فقط. اقرأ هذه الشروط قبل الاستخدام.',
      sections: [
        { h: 'ليست بديلاً عن الإنذار الرسمي', p: ['أزاكا أداة معلومات وليست بديلاً عن أنظمة الإنذار الرسمية. قد تحدث تأخيرات أو أخطاء أو عدم توفر. تصرّف دائمًا وفق قيادة الجبهة الداخلية والإنذار الصادر في منطقتك.'] },
        { h: 'بلا ضمان', p: ['تُقدَّم الخدمة «كما هي» دون أي ضمان. الاستخدام على مسؤوليتك، والمشغّل غير مسؤول عن أي ضرر ناتج عن الاعتماد على المعلومات.'] },
        { h: 'الملكية والإسناد', p: ['بيانات التنبيهات ملك لقيادة الجبهة الداخلية. خريطة الخلفية © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'اتصل بنا',
      intro: 'للأسئلة أو الإبلاغ عن خلل أو طلب إزالة، يسعدنا تواصلك.',
      sections: [
        { h: 'البريد الإلكتروني', p: ['تواصل معنا على العنوان أدناه.'] },
        { h: 'الإبلاغ عن خطأ', p: ['وجدت تنبيهًا خاطئًا أو عدم تطابق مع المصدر الرسمي؟ راسلنا بالوقت والمنطقة وسنتحقق.'] },
      ],
    },
    accessibility: {
      title: 'إعلان إمكانية الوصول',
      intro: 'أزاكا خدمة طوارئ عامة، ونعتبر إتاحتها للجميع، بمن فيهم الأشخاص ذوو الإعاقة، جزءًا من المهمة نفسها.',
      sections: [
        { h: 'التوافق مع الأنظمة', p: ['يسعى الموقع إلى التوافق مع أنظمة إمكانية الوصول الإسرائيلية (أنظمة مساواة حقوق الأشخاص ذوي الإعاقة، إتاحة الخدمة، 2013) والمعيار الإسرائيلي 5568 المبني على إرشادات WCAG 2.0 بمستوى AA.'] },
        { h: 'ميزات إمكانية الوصول', p: ['يتيح زر إمكانية الوصول العائم: تعديل حجم النص (ثلاث درجات)، تباينًا عاليًا، تسطير الروابط، وإيقاف الحركة. تُحفظ التفضيلات على جهازك.', 'إضافة إلى ذلك: تنقّل كامل بلوحة المفاتيح، تسميات لقارئات الشاشة، دعم كامل للاتجاهين RTL/LTR، وأربع لغات: العبرية والإنجليزية والعربية والروسية.'] },
        { h: 'تحسين مستمر وملاحظات', p: ['إتاحة الموقع عملية مستمرة ونواصل التحسين. واجهت مشكلة في إمكانية الوصول؟ يسعدنا إبلاغنا عبر صفحة «اتصل بنا» وسنعالجها سريعًا.', 'آخر تحديث للإعلان: 10 يونيو 2026.'] },
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
        { h: 'Cookie', p: ['Мы храним один cookie настроек (azaka_consent), запоминающий ваш выбор на экране cookie. Это необходимый cookie.', 'Только после выбора «Принять все» мы также устанавливаем собственный cookie анонимной статистики (azaka_vid): случайный идентификатор, который считает посещения сайта, без личного профилирования и без сторонней аналитики. Отозвать согласие можно в любой момент через «Настройки cookie», и cookie будет удалён. Без согласия просмотры считаются только как анонимные суммарные числа, без идентификатора.'] },
        { h: 'Сторонние сервисы', p: ['Подложка карты загружается с CARTO/OpenStreetMap, а шрифты — с Google Fonts; эти провайдеры могут записывать технические данные запроса (например, ваш IP-адрес) в рамках предоставления сервиса.'] },
      ],
    },
    terms: {
      title: 'Условия использования',
      intro: 'Сервис предоставляется только как дополнительная информация. Прочитайте эти условия перед использованием.',
      sections: [
        { h: 'Не замена официального оповещения', p: ['Azaka — это информационный инструмент, а не замена официальных систем оповещения. Возможны задержки, ошибки или недоступность. Всегда действуйте согласно Командованию тыла и сирене в вашем районе.'] },
        { h: 'Без гарантий', p: ['Сервис предоставляется «КАК ЕСТЬ», без каких-либо гарантий. Использование на ваш риск; оператор не несёт ответственности за ущерб от опоры на эту информацию.'] },
        { h: 'Права и атрибуция', p: ['Данные оповещений принадлежат Командованию тыла. Подложка © OpenStreetMap © CARTO.'] },
      ],
    },
    contact: {
      title: 'Контакты',
      intro: 'По вопросам, сообщениям об ошибке или запросам на удаление — будем рады услышать вас.',
      sections: [
        { h: 'Эл. почта', p: ['Напишите нам по адресу ниже.'] },
        { h: 'Сообщить о неточности', p: ['Нашли неверное оповещение или несоответствие официальному источнику? Напишите нам время и район — мы проверим.'] },
      ],
    },
    accessibility: {
      title: 'Заявление о доступности',
      intro: 'Azaka является публичным сервисом экстренного оповещения, и его доступность для всех, включая людей с инвалидностью, мы считаем частью самой задачи.',
      sections: [
        { h: 'Соответствие нормам', p: ['Сайт стремится соответствовать израильским нормам доступности (Правила равноправия людей с инвалидностью (доступность услуг), 2013) и израильскому стандарту IS 5568, основанному на руководствах WCAG 2.0 уровня AA.'] },
        { h: 'Функции доступности', p: ['Плавающая кнопка доступности позволяет: менять размер текста (три ступени), включать высокую контрастность, подчёркивание ссылок и остановку анимаций. Настройки сохраняются на вашем устройстве.', 'Кроме того: полная навигация с клавиатуры, метки для программ чтения с экрана, полная поддержка RTL/LTR и четыре языка: иврит, английский, арабский, русский.'] },
        { h: 'Постоянное улучшение и обратная связь', p: ['Доступность сайта остаётся непрерывным процессом, и мы продолжаем её улучшать. Столкнулись с проблемой доступности? Сообщите нам через страницу «Контакты», и мы оперативно её устраним.', 'Заявление обновлено: 10 июня 2026.'] },
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
          className="mb-6 text-[0.8125rem] font-medium text-sky-400 transition hover:text-sky-300"
        >
          {t('info_back')}
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-white">{page.title}</h1>
        <p className="mt-2 text-[0.875rem] leading-relaxed text-slate-300">{page.intro}</p>

        <div className="mt-7 flex flex-col gap-6">
          {page.sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-[0.9375rem] font-semibold text-white">{s.h}</h2>
              {s.p.map((para, i) => (
                <p key={i} className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-400">
                  {para}
                </p>
              ))}
            </section>
          ))}

          {slug === 'contact' && (
            <a
              href="mailto:support@orellius.ai"
              className="w-fit rounded-lg bg-fg px-4 py-2 text-[0.8125rem] font-semibold text-surface transition hover:opacity-90"
            >
              support@orellius.ai
            </a>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-5 text-[0.6875rem] text-slate-500">
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
          <button type="button" onClick={() => navigate('/accessibility')} className="transition hover:text-slate-300">
            {t('nav_accessibility')}
          </button>
          <span>·</span>
          <button type="button" onClick={openCookieSettings} className="transition hover:text-slate-300">
            {t('nav_cookies')}
          </button>
        </div>
        <div className="mt-3 text-[0.6875rem] text-slate-600">
          {t('info_updated')} · {t('rights')} ·{' '}
          <a href="https://orellius.ai" target="_blank" rel="noopener" className="transition hover:text-slate-400">
            Orel Ohayon{/* allow-personal: public footer credit explicitly requested by Orel */}
          </a>
        </div>
      </div>
    </div>
  )
}
