// UI string dictionary for the emergency surface (dashboard, personal banner, map popup, picker).
// SAFETY: this translates the APP CHROME and a GUIDANCE aid only. oref's verbatim Hebrew alert
// title/desc is ALWAYS shown as-is (see classifyAlert + the instruction panel); the translated
// guidance line sits beside it, never replaces it. Place names are never translated.
//
// LANGUAGE STATUS: he + en are author-reviewed. **ar + ru are machine-drafted and MUST get a
// native / professional review before production** (a mistranslated life-safety instruction is
// dangerous). They are wired so the chips work end to end; flag them at launch, do not assume final.

export type Lang = 'he' | 'en' | 'ar' | 'ru'
export const LANGS: { code: Lang; label: string }[] = [
  { code: 'he', label: 'עברית' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
]
export const RTL_LANGS: Lang[] = ['he', 'ar']

type Entry = Record<Lang, string>

export const STRINGS = {
  brand_sub: {
    he: 'התרעות פיקוד העורף · חי',
    en: 'Home Front Command alerts · live',
    ar: 'تنبيهات قيادة الجبهة الداخلية · مباشر',
    ru: 'Оповещения Командования тыла · в реальном времени',
  },
  status_live: { he: 'מחובר', en: 'Connected', ar: 'متصل', ru: 'Подключено' },
  status_connecting: { he: 'מתחבר…', en: 'Connecting…', ar: 'جارٍ الاتصال…', ru: 'Подключение…' },
  status_error: { he: 'שגיאת חיבור', en: 'Connection error', ar: 'خطأ في الاتصال', ru: 'Ошибка соединения' },

  notif_enable: {
    he: 'אפשרו התראות דפדפן כדי לקבל התרעה גם כשהלשונית ברקע',
    en: 'Enable browser notifications to be alerted even when the tab is in the background',
    ar: 'فعّل إشعارات المتصفح لتصلك التنبيهات حتى عندما تكون علامة التبويب في الخلفية',
    ru: 'Включите уведомления браузера, чтобы получать оповещения даже когда вкладка в фоне',
  },
  notif_denied: {
    he: 'התראות הדפדפן חסומות. צליל ההתרעה עדיין יישמע. ניתן לאפשר התראות בהגדרות הדפדפן.',
    en: 'Browser notifications are blocked. The alarm sound still plays. You can enable notifications in your browser settings.',
    ar: 'إشعارات المتصفح محظورة. سيظل صوت الإنذار يعمل. يمكنك تفعيل الإشعارات من إعدادات المتصفح.',
    ru: 'Уведомления браузера заблокированы. Звук тревоги всё равно прозвучит. Включить их можно в настройках браузера.',
  },
  alerts_on: { he: 'התרעות קוליות פעילות', en: 'Audible alerts on', ar: 'التنبيهات الصوتية مفعّلة', ru: 'Звуковые оповещения включены' },
  alerts_off: { he: 'התרעות מושתקות', en: 'Alerts muted', ar: 'التنبيهات صامتة', ru: 'Оповещения отключены' },

  // My Area
  myarea_set_title: { he: 'הגדירו את האזור שלכם', en: 'Set your area', ar: 'حدّد منطقتك', ru: 'Укажите ваш район' },
  myarea_set_sub: {
    he: 'קבלו התרעה אישית כשהאזור שלכם בהתרעה',
    en: 'Get a personal alert when your area is under alert',
    ar: 'احصل على تنبيه شخصي عندما تكون منطقتك تحت الإنذار',
    ru: 'Получайте личное оповещение, когда ваш район под тревогой',
  },
  myarea_mine_no_alert: { he: 'האזור שלי · אין התרעה כעת', en: 'My area · no alert now', ar: 'منطقتي · لا يوجد إنذار الآن', ru: 'Мой район · сейчас нет тревоги' },
  myarea_change: { he: 'שינוי', en: 'Change', ar: 'تغيير', ru: 'Изменить' },
  myarea_remove: { he: 'הסרת האזור שלי', en: 'Remove my area', ar: 'إزالة منطقتي', ru: 'Удалить мой район' },

  // status labels (shared by map popup, my-area chip)
  status_active: { he: 'בהתרעה פעילה', en: 'Active alert', ar: 'إنذار نشط', ru: 'Активная тревога' },
  status_early: { he: 'התרעה מקדימה', en: 'Early warning', ar: 'إنذار مبكر', ru: 'Раннее предупреждение' },
  status_cleared: { he: 'האירוע הסתיים', en: 'All clear', ar: 'انتهى الحدث', ru: 'Отбой' },
  status_idle: { he: 'אין התרעה כעת', en: 'No alert now', ar: 'لا يوجد إنذار الآن', ru: 'Сейчас нет тревоги' },

  // Area picker
  picker_title: { he: 'בחירת האזור שלך', en: 'Choose your area', ar: 'اختر منطقتك', ru: 'Выберите ваш район' },
  picker_sub: {
    he: 'נשמר במכשיר. נשתמש בו רק כדי להתריע כשהאזור שלך בהתרעה.',
    en: 'Saved on your device. Used only to alert you when your area is under alert.',
    ar: 'يُحفظ على جهازك. يُستخدم فقط لتنبيهك عندما تكون منطقتك تحت الإنذار.',
    ru: 'Хранится на вашем устройстве. Используется только для оповещения, когда ваш район под тревогой.',
  },
  picker_search: { he: 'חיפוש עיר או יישוב…', en: 'Search a city or town…', ar: 'ابحث عن مدينة أو بلدة…', ru: 'Поиск города или посёлка…' },
  picker_loading: { he: 'טוען רשימת יישובים…', en: 'Loading localities…', ar: 'جارٍ تحميل قائمة المناطق…', ru: 'Загрузка списка населённых пунктов…' },
  picker_failed: {
    he: 'טעינת רשימת היישובים נכשלה. נסו שוב מאוחר יותר.',
    en: 'Failed to load the locality list. Try again later.',
    ar: 'فشل تحميل قائمة المناطق. حاول مرة أخرى لاحقًا.',
    ru: 'Не удалось загрузить список. Повторите попытку позже.',
  },
  picker_none: { he: 'לא נמצאו יישובים תואמים', en: 'No matching localities', ar: 'لا توجد مناطق مطابقة', ru: 'Совпадений не найдено' },
  close: { he: 'סגירה', en: 'Close', ar: 'إغلاق', ru: 'Закрыть' },
  shelter_secs: { he: '{n} שנ׳ למרחב מוגן', en: '{n}s to shelter', ar: '{n} ث للملجأ', ru: '{n} с до укрытия' },
  immediate: { he: 'מיידי', en: 'Immediate', ar: 'فوري', ru: 'Немедленно' },

  // Instruction panel
  areas_active: { he: '{n} אזורים בהתרעה פעילה', en: '{n} areas under active alert', ar: '{n} منطقة تحت إنذار نشط', ru: '{n} районов под активной тревогой' },
  wait_release: {
    he: 'המתינו להודעת שחרור רשמית · אין זמן יציאה קבוע מראש',
    en: 'Wait for an official all-clear · there is no fixed time to leave',
    ar: 'انتظر إعلان الإلغاء الرسمي · لا يوجد وقت خروج محدد مسبقًا',
    ru: 'Ждите официального отбоя · фиксированного времени выхода нет',
  },

  // Feed
  feed_empty: { he: 'אין התרעות פעילות', en: 'No active alerts', ar: 'لا توجد إنذارات نشطة', ru: 'Активных тревог нет' },
  areas_n: { he: '{n} אזורים', en: '{n} areas', ar: '{n} منطقة', ru: '{n} районов' },
  alert_generic: { he: 'התרעה', en: 'Alert', ar: 'إنذار', ru: 'Тревога' },
  rel_now: { he: 'עכשיו', en: 'now', ar: 'الآن', ru: 'сейчас' },
  rel_1min: { he: 'לפני דקה', en: '1 min ago', ar: 'قبل دقيقة', ru: '1 мин назад' },
  rel_min: { he: 'לפני {n} דקות', en: '{n} min ago', ar: 'قبل {n} دقيقة', ru: '{n} мин назад' },
  rel_1hr: { he: 'לפני שעה', en: '1 hr ago', ar: 'قبل ساعة', ru: '1 ч назад' },
  rel_hr: { he: 'לפני {n} שעות', en: '{n} hr ago', ar: 'قبل {n} ساعة', ru: '{n} ч назад' },
  show_all: { he: 'הצג את כל {n} האזורים', en: 'Show all {n} areas', ar: 'عرض كل المناطق ({n})', ru: 'Показать все {n} районов' },
  show_less: { he: 'הצג פחות', en: 'Show less', ar: 'عرض أقل', ru: 'Свернуть' },

  // Personal banner
  pb_active: { he: 'התרעה פעילה באזור שלך', en: 'Active alert in your area', ar: 'إنذار نشط في منطقتك', ru: 'Активная тревога в вашем районе' },
  pb_early: { he: 'התרעה מקדימה באזור שלך', en: 'Early warning in your area', ar: 'إنذار مبكر في منطقتك', ru: 'Раннее предупреждение в вашем районе' },
  pb_cleared: { he: 'האירוע באזורך הסתיים', en: 'All clear in your area', ar: 'انتهى الحدث في منطقتك', ru: 'Отбой в вашем районе' },
  pb_cleared_msg: {
    he: 'פעלו לפי הנחיות פיקוד העורף. אין לעזוב את המרחב המוגן עד להודעת שחרור רשמית.',
    en: 'Follow Home Front Command guidance. Do not leave the protected space until an official all-clear.',
    ar: 'اتبع توجيهات قيادة الجبهة الداخلية. لا تغادر المساحة المحمية حتى صدور إعلان الإلغاء الرسمي.',
    ru: 'Следуйте указаниям Командования тыла. Не покидайте защищённое помещение до официального отбоя.',
  },
  pb_enter_now: { he: 'היכנסו מיד למרחב המוגן', en: 'Enter the protected space now', ar: 'ادخل المساحة المحمية الآن', ru: 'Немедленно пройдите в защищённое помещение' },
  pb_reached: {
    he: 'עליכם להיות במרחב המוגן. המתינו להנחיות פיקוד העורף.',
    en: 'You should be in the protected space. Wait for Home Front Command instructions.',
    ar: 'يجب أن تكون في المساحة المحمية. انتظر تعليمات قيادة الجبهة الداخلية.',
    ru: 'Вы должны быть в защищённом помещении. Ждите указаний Командования тыла.',
  },
  pb_countdown: {
    he: 'זמן להגעה למרחב מוגן · אינו זמן לפגיעה',
    en: 'Time to reach shelter · not time to impact',
    ar: 'وقت الوصول إلى الملجأ · ليس وقت الإصابة',
    ru: 'Время добраться до укрытия · не время до удара',
  },
  unit_min: { he: 'דקות', en: 'min', ar: 'دقائق', ru: 'мин' },
  unit_sec: { he: 'שניות', en: 'sec', ar: 'ثوانٍ', ru: 'сек' },

  // Snapshot banner
  snap_label: { he: 'תצוגת היסטוריה', en: 'History view', ar: 'عرض السجل', ru: 'Просмотр истории' },
  snap_close: { he: 'סגור תצוגת היסטוריה', en: 'Close history view', ar: 'إغلاق عرض السجل', ru: 'Закрыть просмотр истории' },

  // FIRMS
  firms_title: { he: 'אנומליות תרמיות', en: 'Thermal anomalies', ar: 'شذوذات حرارية', ru: 'Тепловые аномалии' },
  firms_24h: { he: '24 שע׳', en: '24h', ar: '24 س', ru: '24 ч' },
  firms_toggle: { he: 'הצג אנומליות תרמיות על המפה', en: 'Show thermal anomalies on the map', ar: 'إظهار الشذوذات الحرارية على الخريطة', ru: 'Показать тепловые аномалии на карте' },
  firms_none: { he: 'אין אנומליות ב-24 השעות האחרונות', en: 'No anomalies in the last 24 hours', ar: 'لا توجد شذوذات في آخر 24 ساعة', ru: 'Аномалий за последние 24 часа нет' },
  firms_off: { he: 'שכבת האנומליות כבויה', en: 'Anomaly layer is off', ar: 'طبقة الشذوذات متوقفة', ru: 'Слой аномалий выключен' },
  firms_disclaimer: {
    he: 'שריפה אפשרית סמוך לאזור · מתעכב עד ~3 שעות, אינו מאשר פגיעה',
    en: 'Possible fire near the area · lags up to ~3 hours, does not confirm a strike',
    ar: 'حريق محتمل قرب المنطقة · يتأخر حتى ~3 ساعات، لا يؤكد إصابة',
    ru: 'Возможный пожар рядом · задержка до ~3 часов, не подтверждает удар',
  },
  firms_anomaly: { he: 'אנומליה תרמית', en: 'Thermal anomaly', ar: 'شذوذ حراري', ru: 'Тепловая аномалия' },
  firms_detections: { he: '{n} זיהויים', en: '{n} detections', ar: '{n} رصد', ru: '{n} обнаружений' },

  // Footer / legend / disclaimer
  hist_stats: { he: 'סטטיסטיקה היסטורית', en: 'Historical statistics', ar: 'إحصائيات تاريخية', ru: 'Историческая статистика' },
  legend_firms: { he: 'אנומליה תרמית (NASA FIRMS)', en: 'Thermal anomaly (NASA FIRMS)', ar: 'شذوذ حراري (NASA FIRMS)', ru: 'Тепловая аномалия (NASA FIRMS)' },
  disclaimer_bold: { he: 'אינו תחליף להתרעה רשמית.', en: 'Not a substitute for the official alert.', ar: 'ليس بديلاً عن الإنذار الرسمي.', ru: 'Не заменяет официальное оповещение.' },
  disclaimer_text: {
    he: 'פעלו תמיד לפי ההנחיות הנשמעות במרחב שלכם.',
    en: 'Always follow the instructions sounded in your area.',
    ar: 'اتبع دائمًا التعليمات الصادرة في منطقتك.',
    ru: 'Всегда следуйте указаниям, звучащим в вашем районе.',
  },
  disclaimer_source: {
    he: 'מקור: פיקוד העורף (oref.org.il) דרך ממסר עצמאי.',
    en: 'Source: Home Front Command (oref.org.il) via an independent relay.',
    ar: 'المصدر: قيادة الجبهة الداخلية (oref.org.il) عبر مُرحِّل مستقل.',
    ru: 'Источник: Командование тыла (oref.org.il) через независимый ретранслятор.',
  },
  rights: { he: '© אזעקה · כל הזכויות שמורות', en: '© Azaka · all rights reserved', ar: '© أزاكا · جميع الحقوق محفوظة', ru: '© Azaka · все права защищены' },
  updated: { he: 'עדכון: {time}', en: 'Updated: {time}', ar: 'تحديث: {time}', ru: 'Обновлено: {time}' },
  nav_about: { he: 'אודות', en: 'About', ar: 'حول', ru: 'О проекте' },
  nav_privacy: { he: 'פרטיות', en: 'Privacy', ar: 'الخصوصية', ru: 'Конфиденциальность' },
  nav_terms: { he: 'תנאי שימוש', en: 'Terms', ar: 'الشروط', ru: 'Условия' },
  nav_contact: { he: 'צור קשר', en: 'Contact', ar: 'اتصل بنا', ru: 'Контакты' },
  nav_cookies: { he: 'הגדרות עוגיות', en: 'Cookie settings', ar: 'إعدادات الكوكيز', ru: 'Настройки cookie' },

  // Map popup
  map_shelter_time: { he: 'זמן הגעה למרחב מוגן', en: 'Time to reach shelter', ar: 'وقت الوصول إلى الملجأ', ru: 'Время до укрытия' },

  // sheet collapse
  sheet_collapse: { he: 'כיווץ הפאנל', en: 'Collapse panel', ar: 'طيّ اللوحة', ru: 'Свернуть панель' },
  sheet_expand: { he: 'הרחבת הפאנל', en: 'Expand panel', ar: 'توسيع اللوحة', ru: 'Развернуть панель' },

  // Where to shelter (official Home Front Command protected-space guidance; honest, no specific pins)
  shelter_where_title: { he: 'לאן נכנסים?', en: 'Where to take shelter', ar: 'إلى أين تحتمي؟', ru: 'Куда укрыться' },
  shelter_step_room: {
    he: 'ממ"ד, ממ"ק או מקלט ציבורי — היכנסו אליו.',
    en: 'A protected room (mamad), protected space (mamak), or public shelter (miklat) — go there.',
    ar: 'غرفة محمية (ممد) أو مساحة محمية (ممك) أو ملجأ عام — توجّه إليه.',
    ru: 'Защищённая комната (мамад), защищённое помещение (мамак) или общественное укрытие — идите туда.',
  },
  shelter_step_stairwell: {
    he: 'אין מרחב מוגן? היכנסו לחדר המדרגות הפנימי, הרחק מהקומה העליונה.',
    en: 'No protected space? Enter the building’s interior stairwell, away from the top floor.',
    ar: 'لا توجد مساحة محمية؟ ادخل بئر الدرج الداخلي، بعيدًا عن الطابق العلوي.',
    ru: 'Нет защищённого помещения? Зайдите во внутренний лестничный пролёт, подальше от верхнего этажа.',
  },
  shelter_step_interior: {
    he: 'אין חדר מדרגות? חדר פנימי עם מעט קירות וחלונות חיצוניים, וסגרו את הדלת.',
    en: 'No stairwell? An interior room with the fewest outer walls and windows; close the door.',
    ar: 'لا يوجد درج؟ غرفة داخلية بأقل عدد من الجدران والنوافذ الخارجية، وأغلق الباب.',
    ru: 'Нет лестницы? Внутренняя комната с минимумом наружных стен и окон; закройте дверь.',
  },
  shelter_step_outdoors: {
    he: 'בשטח פתוח? שכבו על הקרקע וחפו על הראש; היכנסו למבנה קרוב אם אפשר.',
    en: 'Outdoors? Lie on the ground and cover your head; enter a nearby building if you can.',
    ar: 'في العراء؟ استلقِ على الأرض وغطِّ رأسك؛ وادخل مبنى قريبًا إن أمكن.',
    ru: 'На улице? Лягте на землю и закройте голову; зайдите в ближайшее здание, если можете.',
  },
  shelter_step_driving: {
    he: 'נוהגים? עצרו בצד, צאו מהרכב ושכבו על הקרקע עם הגנה על הראש.',
    en: 'Driving? Pull over, get out, and lie down covering your head; shelter in a building if one is near.',
    ar: 'تقود؟ توقّف جانبًا، اخرج من السيارة واستلقِ مع حماية رأسك؛ واحتمِ بمبنى إن وُجد قريبًا.',
    ru: 'За рулём? Остановитесь, выйдите и лягте, прикрыв голову; укройтесь в здании, если оно рядом.',
  },
  shelter_note: {
    he: 'הנחיה כללית של פיקוד העורף. מיקומי מקלטים ציבוריים אינם זמינים כמידע פתוח אמין; פנו למרחב המוגן הקרוב המוכר לכם.',
    en: 'General Home Front Command guidance. Public-shelter locations are not available as reliable open data; go to the nearest protected space you know.',
    ar: 'إرشادات عامة من قيادة الجبهة الداخلية. مواقع الملاجئ العامة غير متوفرة كبيانات مفتوحة موثوقة؛ توجّه إلى أقرب مساحة محمية تعرفها.',
    ru: 'Общие указания Командования тыла. Расположение общественных укрытий недоступно как надёжные открытые данные; идите к ближайшему известному вам защищённому месту.',
  },

  // FIRMS popup details
  firms_confidence: { he: 'ודאות', en: 'Confidence', ar: 'الثقة', ru: 'Достоверность' },
  conf_high: { he: 'גבוהה', en: 'High', ar: 'عالية', ru: 'Высокая' },
  conf_medium: { he: 'בינונית', en: 'Medium', ar: 'متوسطة', ru: 'Средняя' },
  conf_low: { he: 'נמוכה', en: 'Low', ar: 'منخفضة', ru: 'Низкая' },
  conf_unknown: { he: 'לא ידועה', en: 'Unknown', ar: 'غير معروفة', ru: 'Неизвестна' },
  firms_intensity: { he: 'עוצמה (FRP)', en: 'Intensity (FRP)', ar: 'الشدة (FRP)', ru: 'Интенсивность (FRP)' },
  firms_satellite: { he: 'לוויין', en: 'Satellite', ar: 'قمر صناعي', ru: 'Спутник' },
  firms_near: { he: 'סמוך ל', en: 'near', ar: 'قرب', ru: 'рядом с' },

  // Notifications (browser Notification text)
  notif_in_area: { he: '🚨 התרעה באזור שלך', en: '🚨 Alert in your area', ar: '🚨 إنذار في منطقتك', ru: '🚨 Тревога в вашем районе' },
  notif_early_head: { he: 'התרעה מקדימה · פיקוד העורף', en: 'Early warning · Home Front Command', ar: 'إنذار مبكر · قيادة الجبهة الداخلية', ru: 'Раннее предупреждение · Командование тыла' },
  notif_active_head: { he: 'אזעקה · צבע אדום', en: 'Air-raid · Red Alert', ar: 'إنذار · لون أحمر', ru: 'Воздушная тревога · Красный' },
  notif_more: { he: 'ועוד {n}', en: 'and {n} more', ar: 'و{n} أخرى', ru: 'и ещё {n}' },
  notif_mute: { he: 'השתקת התרעות קוליות', en: 'Mute audible alerts', ar: 'كتم التنبيهات الصوتية', ru: 'Отключить звуковые оповещения' },
  notif_unmute: { he: 'הפעלת התרעות קוליות', en: 'Enable audible alerts', ar: 'تفعيل التنبيهات الصوتية', ru: 'Включить звуковые оповещения' },

  // Cookie consent
  cookie_bold: { he: 'אנו משתמשים בעוגיות.', en: 'We use cookies.', ar: 'نستخدم ملفات تعريف الارتباط.', ru: 'Мы используем cookie.' },
  cookie_text: {
    he: 'עוגיות חיוניות נדרשות לתפעול האתר. בהסכמתך נשתמש גם בעוגיות נוספות לשיפור השירות. ניתן לשנות בכל עת דרך «הגדרות עוגיות».',
    en: 'Essential cookies are required to run the site. With your consent we will also use additional cookies to improve the service. You can change this any time via “Cookie settings”.',
    ar: 'ملفات تعريف الارتباط الأساسية مطلوبة لتشغيل الموقع. بموافقتك سنستخدم أيضًا ملفات إضافية لتحسين الخدمة. يمكنك التغيير في أي وقت عبر «إعدادات الكوكيز».',
    ru: 'Основные cookie необходимы для работы сайта. С вашего согласия мы также будем использовать дополнительные cookie для улучшения сервиса. Изменить можно в любое время через «Настройки cookie».',
  },
  cookie_essential: { he: 'חיוני בלבד', en: 'Essential only', ar: 'الأساسية فقط', ru: 'Только основные' },
  cookie_accept_all: { he: 'אשר הכל', en: 'Accept all', ar: 'قبول الكل', ru: 'Принять все' },

  // Historical page
  hist_live_map: { he: 'מפה חיה', en: 'Live map', ar: 'خريطة مباشرة', ru: 'Карта в реальном времени' },
  hist_subtitle: { he: 'לוג התרעות פיקוד העורף', en: 'Home Front Command alert log', ar: 'سجل تنبيهات قيادة الجبهة الداخلية', ru: 'Журнал оповещений Командования тыла' },
  hist_all: { he: 'הכל', en: 'All', ar: 'الكل', ru: 'Все' },
  hist_no_data: { he: 'אין נתונים', en: 'No data', ar: 'لا توجد بيانات', ru: 'Нет данных' },
  hist_loading: { he: 'טוען נתונים…', en: 'Loading data…', ar: 'جارٍ تحميل البيانات…', ru: 'Загрузка данных…' },
  hist_relay_error: {
    he: 'לא ניתן להתחבר לממסר. ודאו ש-bun relay/server.ts פועל.',
    en: 'Cannot connect to the relay. Make sure bun relay/server.ts is running.',
    ar: 'تعذّر الاتصال بالمُرحِّل. تأكّد من تشغيل bun relay/server.ts.',
    ru: 'Не удаётся подключиться к ретранслятору. Убедитесь, что bun relay/server.ts запущен.',
  },
  hist_card_alerts: { he: 'התרעות', en: 'Alerts', ar: 'إنذارات', ru: 'Тревоги' },
  hist_card_sirens: { he: 'אזעקות (סך יישובים)', en: 'Sirens (total localities)', ar: 'صفّارات (إجمالي المناطق)', ru: 'Сирены (всего населённых пунктов)' },
  hist_card_unique: { he: 'יישובים ייחודיים', en: 'Unique localities', ar: 'مناطق فريدة', ru: 'Уникальные нас. пункты' },
  hist_card_range: { he: 'טווח תאריכים', en: 'Date range', ar: 'النطاق الزمني', ru: 'Период' },
  hist_panel_hour: { he: 'התרעות לפי שעה ביממה', en: 'Alerts by hour of day', ar: 'الإنذارات حسب ساعة اليوم', ru: 'Тревоги по часам суток' },
  hist_panel_day: { he: 'התרעות לפי יום', en: 'Alerts by day', ar: 'الإنذارات حسب اليوم', ru: 'Тревоги по дням' },
  hist_panel_types: { he: 'סוגי התרעות', en: 'Alert types', ar: 'أنواع الإنذارات', ru: 'Типы тревог' },
  hist_panel_size: { he: 'גודל אירוע (מספר יישובים)', en: 'Event size (localities)', ar: 'حجم الحدث (عدد المناطق)', ru: 'Масштаб события (нас. пункты)' },
  hist_panel_cities: { he: 'יישובים מובילים', en: 'Top localities', ar: 'أكثر المناطق', ru: 'Топ населённых пунктов' },
  hist_panel_recent: { he: 'אירועים אחרונים', en: 'Recent events', ar: 'أحدث الأحداث', ru: 'Недавние события' },
  hist_size_1: { he: 'יישוב 1', en: '1 locality', ar: 'منطقة واحدة', ru: '1 нас. пункт' },
  hist_localities_n: { he: '{n} יישובים', en: '{n} localities', ar: '{n} منطقة', ru: '{n} нас. пунктов' },
  hist_other: { he: 'אחר', en: 'Other', ar: 'أخرى', ru: 'Другое' },
  hist_source: {
    he: 'מקור: פיקוד העורף (oref.org.il) · הלוג נשמר ומתעדכן אוטומטית · ארכיון לפי שנה',
    en: 'Source: Home Front Command (oref.org.il) · log saved and auto-updated · archived by year',
    ar: 'المصدر: قيادة الجبهة الداخلية (oref.org.il) · يُحفظ السجل ويُحدَّث تلقائيًا · أرشيف سنوي',
    ru: 'Источник: Командование тыла (oref.org.il) · журнал сохраняется и обновляется · архив по годам',
  },

  // Info pages chrome
  info_back: { he: 'חזרה למפה', en: 'Back to map', ar: 'العودة إلى الخريطة', ru: 'Назад к карте' },
  info_updated: { he: 'עודכן: 8 ביוני 2026', en: 'Updated: 8 June 2026', ar: 'آخر تحديث: 8 يونيو 2026', ru: 'Обновлено: 8 июня 2026' },
} satisfies Record<string, Entry>

export type StringKey = keyof typeof STRINGS

// Translated THREAT-TYPE name keyed by classifyAlert's `key`. Shown as a secondary aid beside oref's
// verbatim Hebrew title (never instead of it) so a non-Hebrew reader knows WHAT the alert is. ar/ru
// need native review before production. Unknown keys resolve to '' so the caller can skip the line.
export const THREAT: Record<string, Entry> = {
  missilealert: { he: 'ירי רקטות וטילים', en: 'Rocket and missile fire', ar: 'إطلاق صواريخ وقذائف', ru: 'Ракетный обстрел' },
  uav: { he: 'חדירת כלי טיס עוין', en: 'Hostile aircraft intrusion', ar: 'اختراق طائرة معادية', ru: 'Вторжение вражеского БПЛА' },
  terrorattack: { he: 'חדירת מחבלים', en: 'Terrorist infiltration', ar: 'تسلل مخربين', ru: 'Проникновение террористов' },
  nonconventional: { he: 'אירוע חומרים מסוכנים', en: 'Hazardous-materials event', ar: 'حادث مواد خطرة', ru: 'Происшествие с опасными веществами' },
  earthquake: { he: 'רעידת אדמה', en: 'Earthquake', ar: 'زلزال', ru: 'Землетрясение' },
  tsunami: { he: 'התרעת צונאמי', en: 'Tsunami warning', ar: 'تحذير تسونامي', ru: 'Предупреждение о цунами' },
  flash: { he: 'התקרבו למרחב מוגן', en: 'Move toward a protected space', ar: 'اقترب من مساحة محمية', ru: 'Пройдите к защищённому помещению' },
  update: { he: 'האירוע הסתיים', en: 'All clear', ar: 'انتهى الحدث', ru: 'Отбой' },
  unknown: { he: 'התרעה', en: 'Alert', ar: 'إنذار', ru: 'Тревога' },
}

// Translated GUIDANCE aid keyed by remain-policy. Shown beside (never instead of) oref's verbatim text.
export const GUIDANCE: Record<'tenmin' | 'release', Entry> = {
  tenmin: {
    he: 'היכנסו למרחב המוגן ושהו בו 10 דקות.',
    en: 'Enter the protected space and remain there for 10 minutes.',
    ar: 'ادخل المساحة المحمية وابقَ فيها 10 دقائق.',
    ru: 'Пройдите в защищённое помещение и оставайтесь там 10 минут.',
  },
  release: {
    he: 'המתינו להודעת שחרור רשמית של פיקוד העורף.',
    en: 'Wait for an official all-clear from Home Front Command.',
    ar: 'انتظر إعلان الإلغاء الرسمي من قيادة الجبهة الداخلية.',
    ru: 'Ждите официального отбоя от Командования тыла.',
  },
}
