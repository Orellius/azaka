import { useEffect, useState } from 'react'
import { getLang } from './i18n/useLang'
import { withLocale } from './i18n/locale'

// Minimal History-API router (real paths, not hash fragments). navigate() takes a locale-LESS route
// ('/cities'), re-applies the current locale prefix (withLocale, so internal links keep the visitor's
// /en /ar /ru), pushes it and notifies listeners; useRoute() returns the raw pathname — consumers
// strip the prefix with stripLocale. A public/_redirects rule serves index.html for every path.
export function navigate(path: string) {
  const target = withLocale(path, getLang())
  if (target === window.location.pathname) return
  // inApp marks entries pushed by this router, so RouteOverlay knows history.back() stays in-session
  window.history.pushState({ inApp: true }, '', target)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}
