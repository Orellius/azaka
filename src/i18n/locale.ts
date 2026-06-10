import type { Lang } from './strings'

// URL locale layer: /en /ar /ru path prefixes select the language; Hebrew is the unprefixed root.
// Pure helpers only — stripLocale(path) parses a pathname into {lang, route}, withLocale(route, lang)
// builds the prefixed path back. The lang store (useLang) and router import these; this imports
// nothing stateful, so there are no cycles. /embed and /snapshot are never prefixed (widget + headless
// render target, not pages).

const PREFIXED: ReadonlyArray<Exclude<Lang, 'he'>> = ['en', 'ar', 'ru']
const NEVER_PREFIXED = ['/embed', '/snapshot']

export function stripLocale(path: string): { lang: Lang; route: string } {
  for (const l of PREFIXED) {
    if (path === `/${l}`) return { lang: l, route: '/' }
    if (path.startsWith(`/${l}/`)) return { lang: l, route: path.slice(l.length + 1) }
  }
  return { lang: 'he', route: path }
}

export function withLocale(path: string, lang: Lang): string {
  const { route } = stripLocale(path) // idempotent: re-prefixing an already-prefixed path is safe
  if (lang === 'he' || NEVER_PREFIXED.some((p) => route === p || route.startsWith(p + '/'))) return route
  return route === '/' ? `/${lang}` : `/${lang}${route}`
}
