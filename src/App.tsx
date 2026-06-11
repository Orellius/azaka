import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { InfoPage, type InfoSlug } from './pages/InfoPage'
import { CityPage } from './pages/CityPage'
import { AlertEventPage } from './pages/AlertEventPage'
import { CitiesIndexPage } from './pages/CitiesIndexPage'
import { PlatformsPage } from './pages/PlatformsPage'
import { MenuPage } from './pages/MenuPage'
import { EmbedWidget } from './pages/EmbedWidget'
import { CookieConsent } from './consent/CookieConsent'
import { AccessibilityWidget } from './a11y/AccessibilityWidget'
import { loadAndApply } from './a11y/a11yStore'
import { NotFoundPage } from './pages/NotFoundPage'
import { trackPageview } from './analytics/track'
import { useRoute } from './router'
import { stripLocale } from './i18n/locale'
import { RouteOverlay } from './RouteOverlay'

loadAndApply() // re-apply saved accessibility prefs before first paint

// MapLibre dominates the bundle; routes that don't render the map must not pay for it.
// MapDashboard + SnapshotPage pull AlertMap (maplibre-gl); HistoricalView pulls the charts.
const MapDashboard = lazy(() => import('./MapDashboard').then((m) => ({ default: m.MapDashboard })))
const SnapshotPage = lazy(() => import('./pages/SnapshotPage').then((m) => ({ default: m.SnapshotPage })))
const HistoricalView = lazy(() => import('./historical/HistoricalView').then((m) => ({ default: m.HistoricalView })))

// Mirrors the index.html pre-hydration placeholder (body already paints the dark bg) so the
// lazy-chunk wait reads as one continuous load, not a flash.
function LoadingFallback() {
  return <main className="flex min-h-screen items-center justify-center text-sm text-fg-faint">טוען את המפה…</main>
}

const INFO_ROUTES: Record<string, InfoSlug> = {
  '/about': 'about',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/contact': 'contact',
  '/accessibility': 'accessibility',
}

// Route-as-overlay: once the dashboard has rendered this session, content pages render in a
// RouteOverlay ABOVE the still-mounted map instead of replacing it. On a direct load of a content
// URL this stays false, so the page renders standalone and the maplibre chunk is never fetched.
// Module-level (not a ref) because render reads it and only an effect writes it.
let mapSeenThisSession = false

// Hebrew names arrive URL-encoded; a malformed escape must not crash the router, just miss the route.
function decodeSegment(path: string, prefix: string): string | null {
  if (!path.startsWith(prefix)) return null
  try {
    const seg = decodeURIComponent(path.slice(prefix.length))
    return seg || null
  } catch {
    return null
  }
}

// The overlay-capable pages (everything except the map itself, /embed, /snapshot, and the 404). Returns
// null for '/' and unknown paths so App can decide between map, overlay, standalone, and NotFound.
function routePage(path: string, info: InfoSlug | undefined, cityName: string | null, alertId: string | null): ReactNode | null {
  if (info) return <InfoPage slug={info} />
  if (path === '/historical')
    return (
      <Suspense fallback={<LoadingFallback />}>
        <HistoricalView />
      </Suspense>
    )
  if (path === '/cities') return <CitiesIndexPage />
  if (path === '/platforms') return <PlatformsPage />
  if (path === '/menu') return <MenuPage />
  if (cityName) return <CityPage key={cityName} name={cityName} />
  if (alertId) return <AlertEventPage key={alertId} id={alertId} />
  return null
}

function App() {
  // Routes match on the locale-stripped path: /en/cities and /cities render the same page, the
  // /en /ar /ru prefix only selects the language (handled by useLang). he is the unprefixed root.
  const rawPath = useRoute()
  const { route: path } = stripLocale(rawPath)
  const info = INFO_ROUTES[path]
  const cityName = decodeSegment(path, '/city/')
  const alertId = decodeSegment(path, '/alert/')
  useEffect(() => {
    if (path === '/') mapSeenThisSession = true
  }, [path])
  useEffect(() => {
    trackPageview(path) // no-op on /embed + /snapshot (trackPageview guards them: no beacon, no cookie)
  }, [path])
  // /embed is an iframe widget, not a page: no map, no cookie banner, no a11y widget, no chrome
  if (path === '/embed') return <EmbedWidget />
  // /snapshot is the relay's headless map-render target: map only, no chrome, no analytics
  if (path === '/snapshot')
    return (
      <Suspense fallback={<LoadingFallback />}>
        <SnapshotPage />
      </Suspense>
    )
  const page = routePage(path, info, cityName, alertId)
  const overlay = page != null && mapSeenThisSession
  return (
    <>
      {/* same child slot whether '/' or overlay, so MapDashboard never remounts between them */}
      {(path === '/' || overlay) && (
        <Suspense fallback={<LoadingFallback />}>
          <MapDashboard />
        </Suspense>
      )}
      {overlay ? (
        <RouteOverlay>{page}</RouteOverlay>
      ) : (
        // any other path used to soft-404 into the map with HTTP 200; render a real (noindex) 404 view
        page ?? (path === '/' ? null : <NotFoundPage />)
      )}
      <CookieConsent />
      <AccessibilityWidget />
    </>
  )
}

export default App
