import { useSyncExternalStore } from 'react'
import { GUIDANCE, RTL_LANGS, STRINGS, THREAT, type Lang, type StringKey } from './strings'
import { stripLocale, withLocale } from './locale'

// Tiny external language store so any component can read/switch the language without prop drilling
// or a context provider. Persists the choice and drives the document's dir (he/ar = rtl). The whole
// layout uses logical CSS (me-auto, start/end, ps/pe), so flipping dir reflows it correctly.
// The URL is the boss: a /en /ar /ru path prefix wins over the stored preference for that visit
// (and is NOT persisted — a shared /en link must not flip a Hebrew user's saved choice), and
// setLang rewrites the current URL to the matching prefix so canonical/hreflang stay truthful.
// Public surface: useLang() returns { lang, dir, t, tGuide, setLang }; getLang() for non-React code.

const KEY = 'azaka_lang'

function isLang(v: unknown): v is Lang {
  return v === 'he' || v === 'en' || v === 'ar' || v === 'ru'
}

function load(): Lang {
  const fromPath = typeof window === 'undefined' ? 'he' : stripLocale(window.location.pathname).lang
  if (fromPath !== 'he') return fromPath // explicit URL prefix wins over the stored preference
  try {
    const v = localStorage.getItem(KEY)
    return isLang(v) ? v : 'he' // default Hebrew
  } catch {
    return 'he'
  }
}

let current: Lang = load()
const listeners = new Set<() => void>()

export function getLang(): Lang {
  return current
}

// Rewrite the URL so its locale prefix matches `l` (replaceState: a language switch is not a new
// history entry). Dispatching popstate lets useRoute + usePageMeta recompute canonical/hreflang.
function syncUrlToLang(l: Lang) {
  const next = withLocale(window.location.pathname, l)
  if (next === window.location.pathname) return
  window.history.replaceState({}, '', next + window.location.search + window.location.hash)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

function applyDir(l: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir = RTL_LANGS.includes(l) ? 'rtl' : 'ltr'
}
applyDir(current) // set direction on first load (index.html ships rtl; this corrects it for ltr langs)

if (typeof window !== 'undefined') {
  // Stored non-Hebrew preference on an unprefixed URL: normalize to the prefixed URL on load so the
  // address bar, canonical and hreflang all describe the language actually shown.
  if (current !== 'he') syncUrlToLang(current)
  // Back/forward across locales (e.g. /en/cities -> /cities): follow the URL. Not persisted, same as
  // load(). No-op when navigate()/setLang dispatched the event, since URL and lang already agree.
  window.addEventListener('popstate', () => {
    const l = stripLocale(window.location.pathname).lang
    if (l === current) return
    current = l
    applyDir(l)
    listeners.forEach((fn) => fn())
  })
}

export function setLang(l: Lang) {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    // storage disabled: choice still holds for this session
  }
  applyDir(l)
  syncUrlToLang(l)
  listeners.forEach((fn) => fn())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

function fill(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  let out = s
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v))
  return out
}

export function useLang() {
  const lang = useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  )
  const dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr'
  const t = (key: StringKey, vars?: Record<string, string | number>) => fill(STRINGS[key][lang], vars)
  const tGuide = (remain: 'tenmin' | 'release') => GUIDANCE[remain][lang]
  const tThreat = (key?: string) => (key && THREAT[key] ? THREAT[key][lang] : '')
  // relative time ("now" / "3 min ago"); used by the feed cards
  const tAgo = (ts: number): string => {
    if (!ts) return ''
    const mins = Math.floor((Date.now() - ts) / 60000)
    if (mins < 1) return t('rel_now')
    if (mins < 60) return mins === 1 ? t('rel_1min') : t('rel_min', { n: mins })
    const hrs = Math.floor(mins / 60)
    return hrs === 1 ? t('rel_1hr') : t('rel_hr', { n: hrs })
  }
  return { lang, dir, t, tGuide, tThreat, tAgo, setLang }
}
