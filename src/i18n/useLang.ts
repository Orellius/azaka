import { useSyncExternalStore } from 'react'
import { GUIDANCE, RTL_LANGS, STRINGS, THREAT, type Lang, type StringKey } from './strings'

// Tiny external language store so any component can read/switch the language without prop drilling
// or a context provider. Persists the choice and drives the document's dir (he/ar = rtl). The whole
// layout uses logical CSS (me-auto, start/end, ps/pe), so flipping dir reflows it correctly.
// Public surface: useLang() returns { lang, dir, t, tGuide, setLang }.

const KEY = 'azaka_lang'

function isLang(v: unknown): v is Lang {
  return v === 'he' || v === 'en' || v === 'ar' || v === 'ru'
}

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    return isLang(v) ? v : 'he' // default Hebrew
  } catch {
    return 'he'
  }
}

let current: Lang = load()
const listeners = new Set<() => void>()

function applyDir(l: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = l
  document.documentElement.dir = RTL_LANGS.includes(l) ? 'rtl' : 'ltr'
}
applyDir(current) // set direction on first load (index.html ships rtl; this corrects it for ltr langs)

export function setLang(l: Lang) {
  if (l === current) return
  current = l
  try {
    localStorage.setItem(KEY, l)
  } catch {
    // storage disabled: choice still holds for this session
  }
  applyDir(l)
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
  return { lang, dir, t, tGuide, tThreat, setLang }
}
