import { Fragment, useEffect, useState } from 'react'
import { AlertMap } from './map/AlertMap'
import { FlameIcon } from './map/FireLayer'
import { useAlertFeed, type FeedEvent } from './alerts/useAlertFeed'
import { useFirms, type FireDetection } from './firms/useFirms'
import { FIRMS_CREDIT, anomalyAge, confLabel, groupAnomalies, type AnomalyGroup } from './firms/anomaly'
import { openCookieSettings } from './consent/consentStore'
import { navigate } from './router'

const FIRMS_PREF = 'azaka_firms'

// Dashboard shell: full-bleed alert map + a dark-glass command panel (RTL Hebrew). The panel is a
// tzevaadom-style FEED: one card per alert event, grouping all of its areas (so a 600-area barrage is
// one card, not 600 rows). Colour by severity: red active / amber early / green ended. The verbatim
// oref instruction shows at top while an alert is live; all state comes from useAlertFeed.
const GUSH_DAN_DEMO = [
  'תל אביב - מרכז העיר',
  'תל אביב - דרום העיר ויפו',
  'חולון',
  'בת ים',
  'רמת גן - מערב',
  'גבעתיים',
  'ראשון לציון - מערב',
  'בני ברק',
]
const SHARON_EARLY_DEMO = ['רעננה', 'הוד השרון', 'כפר סבא', 'אבן יהודה', 'הרצליה - מרכז וגליל ים']

const STATUS_LABEL: Record<string, { text: string; dot: string }> = {
  live: { text: 'מחובר', dot: 'bg-emerald-400' },
  connecting: { text: 'מתחבר…', dot: 'bg-amber-400' },
  error: { text: 'שגיאת חיבור', dot: 'bg-rose-500' },
}
const SEV: Record<FeedEvent['severity'], { bar: string; txt: string }> = {
  active: { bar: 'bg-rose-500', txt: 'text-rose-200' },
  special: { bar: 'bg-rose-500', txt: 'text-rose-200' },
  early: { bar: 'bg-amber-500', txt: 'text-amber-200' },
  cleared: { bar: 'bg-emerald-500', txt: 'text-emerald-200' },
}

function relTime(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'עכשיו'
  if (mins === 1) return 'לפני דקה'
  if (mins < 60) return `לפני ${mins} דקות`
  const hrs = Math.floor(mins / 60)
  return hrs === 1 ? 'לפני שעה' : `לפני ${hrs} שעות`
}

export function MapDashboard() {
  const { activeAreas, earlyAreas, clearedAreas, status, lastAt, instruction, events, simulate, resolve, clear } =
    useAlertFeed()
  const firms = useFirms()
  const [firmsOn, setFirmsOn] = useState(() => {
    try {
      return localStorage.getItem(FIRMS_PREF) === 'on' // off by default; opt-in
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(FIRMS_PREF, firmsOn ? 'on' : 'off')
    } catch {
      // private mode / storage disabled: the toggle still works for this session
    }
  }, [firmsOn])

  const alerting = activeAreas.size > 0
  const warning = earlyAreas.size > 0
  const st = STATUS_LABEL[status]
  const headDot = alerting ? 'bg-rose-500' : warning ? 'bg-amber-500' : clearedAreas.size > 0 ? 'bg-emerald-500' : 'bg-slate-500'

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <AlertMap
        activeAreas={activeAreas}
        earlyAreas={earlyAreas}
        clearedAreas={clearedAreas}
        fires={firmsOn ? firms.detections : []}
      />

      <div className="pointer-events-none absolute inset-0 p-4">
        <div className="pointer-events-auto me-auto flex max-h-[calc(100vh-2rem)] w-80 max-w-[88vw] flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-md">
          <header className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              {(alerting || warning) && (
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${headDot} opacity-75`} />
              )}
              <span className={`relative inline-flex h-3.5 w-3.5 rounded-full ${headDot}`} />
            </span>
            <div className="leading-tight">
              <div className="text-lg font-bold tracking-tight text-white">אזעקה</div>
              <div className="text-[11px] text-slate-400">התרעות פיקוד העורף · חי</div>
            </div>
            <div className="ms-auto flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className={`h-2 w-2 rounded-full ${st.dot}`} />
              {st.text}
            </div>
          </header>

          {(alerting || warning) && instruction && (instruction.title || instruction.desc) && (
            <div className="rounded-xl border border-rose-500/50 bg-rose-500/15 px-3 py-2.5">
              {instruction.title && <div className="text-[15px] font-bold text-rose-100">{instruction.title}</div>}
              {instruction.desc && <div className="mt-0.5 text-[12px] text-rose-100/90">{instruction.desc}</div>}
              <div className="mt-1 text-[11px] text-rose-200/80">{activeAreas.size} אזורים בהתרעה פעילה</div>
              {instruction.remain === 'release' && (
                <div className="mt-1.5 text-[11px] font-semibold text-amber-200">
                  המתינו להודעת שחרור רשמית — אין זמן יציאה קבוע מראש
                </div>
              )}
            </div>
          )}

          {events.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm text-slate-400">
              אין התרעות פעילות
            </div>
          ) : (
            <div className="flex max-h-[40vh] min-h-0 flex-col gap-2.5 overflow-y-auto pe-1">
              {events.map((ev, i) => (
                <EventCard key={`${ev.id}-${i}`} ev={ev} />
              ))}
            </div>
          )}

          {firms.configured && (
            <FirmsPanel detections={firms.detections} on={firmsOn} onToggle={() => setFirmsOn((v) => !v)} />
          )}

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => simulate(GUSH_DAN_DEMO, 'active')}
                className="flex-1 rounded-lg bg-rose-600 px-2 py-2 text-[12px] font-medium text-white transition hover:bg-rose-500"
              >
                פעילה · גוש דן
              </button>
              <button
                type="button"
                onClick={() => simulate(SHARON_EARLY_DEMO, 'early')}
                className="flex-1 rounded-lg bg-amber-600 px-2 py-2 text-[12px] font-medium text-white transition hover:bg-amber-500"
              >
                מקדימה · השרון
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => resolve([...activeAreas, ...earlyAreas])}
                className="flex-1 rounded-lg bg-emerald-600 px-2 py-2 text-[12px] font-medium text-white transition hover:bg-emerald-500"
              >
                האירוע הסתיים
              </button>
              <button
                type="button"
                onClick={clear}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-slate-300 transition hover:bg-white/10"
              >
                נקה
              </button>
            </div>
          </div>

          <SidebarFooter lastAt={lastAt} />
        </div>
      </div>
    </div>
  )
}

function EventCard({ ev }: { ev: FeedEvent }) {
  const c = SEV[ev.severity]
  const time = new Date(ev.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="flex overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className={`w-1.5 shrink-0 ${c.bar}`} />
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <div className={`text-[13px] font-semibold leading-tight ${c.txt}`}>{ev.title || 'התרעה'}</div>
        <div className="mt-1 text-[10px] text-slate-500">
          {relTime(ev.ts)} · {time} · {ev.cities.length} אזורים
        </div>
        <div className="mt-1.5 line-clamp-3 text-[11px] leading-relaxed text-slate-300">{ev.cities.join(', ')}</div>
      </div>
    </div>
  )
}

const LEGEND_COLORS: Array<{ color: string; label: string }> = [
  { color: 'bg-rose-500', label: 'התרעה פעילה' },
  { color: 'bg-amber-500', label: 'התרעה מקדימה' },
  { color: 'bg-emerald-500', label: 'האירוע הסתיים' },
]

const FOOTER_LINKS: Array<{ label: string; path: string }> = [
  { label: 'אודות', path: '/about' },
  { label: 'פרטיות', path: '/privacy' },
  { label: 'תנאי שימוש', path: '/terms' },
  { label: 'צור קשר', path: '/contact' },
]

function FirmsPanel({ detections, on, onToggle }: { detections: FireDetection[]; on: boolean; onToggle: () => void }) {
  const groups = on ? groupAnomalies(detections) : []
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-orange-500/25 bg-orange-500/5 p-2.5">
      <div className="flex items-center gap-2">
        <span className="text-orange-500">
          <FlameIcon className="size-3.5 drop-shadow" />
        </span>
        <h2 className="whitespace-nowrap text-[11px] font-semibold tracking-wide text-orange-200">אנומליות תרמיות</h2>
        <span className="ms-auto whitespace-nowrap text-[10px] text-slate-500">{detections.length} · 24 שע׳</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="הצג אנומליות תרמיות על המפה"
          onClick={onToggle}
          className={`relative h-4 w-7 shrink-0 rounded-full transition ${on ? 'bg-orange-500' : 'bg-slate-600'}`}
        >
          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${on ? 'start-0.5' : 'end-0.5'}`} />
        </button>
      </div>

      {on ? (
        groups.length > 0 ? (
          <div className="flex max-h-44 flex-col gap-1.5 overflow-y-auto pe-1">
            {groups.map((g) => (
              <AnomalyGroupCard key={g.key} g={g} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-white/5 px-2.5 py-2 text-center text-[11px] text-slate-400">
            אין אנומליות ב-24 השעות האחרונות
          </div>
        )
      ) : (
        <div className="text-[10px] text-slate-500">שכבת האנומליות כבויה</div>
      )}

      {on && (
        <p className="text-[9px] leading-relaxed text-slate-500">
          שריפה אפשרית סמוך לאזור — מתעכב עד ~3 שעות, אינו מאשר פגיעה · {FIRMS_CREDIT}
        </p>
      )}
    </section>
  )
}

function AnomalyGroupCard({ g }: { g: AnomalyGroup }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-orange-500/20 bg-orange-500/5">
      <div className="w-1 shrink-0 bg-orange-400/80" />
      <div className="min-w-0 flex-1 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-semibold text-orange-100">
            אנומליה תרמית{g.label ? ` · ${g.label}` : ''}
          </span>
          <span className="ms-auto whitespace-nowrap text-[10px] text-slate-500">{anomalyAge(g.latestTs)}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-slate-400">
          {g.count > 1 ? `${g.count} זיהויים · ` : ''}
          {confLabel(g.topConf)}
          {g.maxFrp ? ` · עד ${g.maxFrp} MW` : ''}
        </div>
      </div>
    </div>
  )
}

function SidebarFooter({ lastAt }: { lastAt: number | null }) {
  return (
    <footer className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
      <a
        href="/historical"
        onClick={(e) => {
          e.preventDefault()
          navigate('/historical')
        }}
        className="text-[11px] font-medium text-sky-400 transition hover:text-sky-300"
      >
        סטטיסטיקה היסטורית ←
      </a>

      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {LEGEND_COLORS.map((l) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`h-2.5 w-6 shrink-0 rounded-full ${l.color}`} />
              <span className="text-[10px] text-slate-300">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="flex w-6 shrink-0 justify-center text-orange-500">
              <FlameIcon className="size-3.5 drop-shadow" />
            </span>
            <span className="text-[10px] text-slate-300">אנומליה תרמית (NASA FIRMS)</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[10px] leading-relaxed text-amber-100/90">
        <span className="font-bold text-amber-200">אינו תחליף להתרעה רשמית.</span> פעלו תמיד לפי ההנחיות הנשמעות במרחב שלכם.
        <span className="mt-1 block text-amber-100/60">מקור: פיקוד העורף (oref.org.il) דרך ממסר עצמאי.</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
        {FOOTER_LINKS.map((link, i) => (
          <Fragment key={link.path}>
            {i > 0 && <span aria-hidden>·</span>}
            <button type="button" onClick={() => navigate(link.path)} className="transition hover:text-slate-300">
              {link.label}
            </button>
          </Fragment>
        ))}
        <span aria-hidden>·</span>
        <button type="button" onClick={openCookieSettings} className="transition hover:text-slate-300">
          הגדרות עוגיות
        </button>
      </div>

      <div className="text-[10px] text-slate-600">
        © אזעקה · כל הזכויות שמורות{lastAt ? ` · עדכון: ${new Date(lastAt).toLocaleTimeString('he-IL')}` : ''}
      </div>
    </footer>
  )
}
