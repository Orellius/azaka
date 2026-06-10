import { useEffect } from 'react'
import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'
import { InfoPage, type InfoSlug } from './pages/InfoPage'
import { CityPage } from './pages/CityPage'
import { AlertEventPage } from './pages/AlertEventPage'
import { CitiesIndexPage } from './pages/CitiesIndexPage'
import { ApiPage } from './pages/ApiPage'
import { PlatformsPage } from './pages/PlatformsPage'
import { EmbedWidget } from './pages/EmbedWidget'
import { CookieConsent } from './consent/CookieConsent'
import { AccessibilityWidget } from './a11y/AccessibilityWidget'
import { loadAndApply } from './a11y/a11yStore'
import { trackPageview } from './analytics/track'
import { useRoute } from './router'

loadAndApply() // re-apply saved accessibility prefs before first paint

const INFO_ROUTES: Record<string, InfoSlug> = {
  '/about': 'about',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/contact': 'contact',
  '/accessibility': 'accessibility',
}

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

function App() {
  const path = useRoute()
  const info = INFO_ROUTES[path]
  const cityName = decodeSegment(path, '/city/')
  const alertId = decodeSegment(path, '/alert/')
  useEffect(() => {
    trackPageview(path) // no-op on /embed (trackPageview guards it: no beacon, no cookie)
  }, [path])
  // /embed is an iframe widget, not a page: no map, no cookie banner, no a11y widget, no chrome
  if (path === '/embed') return <EmbedWidget />
  return (
    <>
      {info ? (
        <InfoPage slug={info} />
      ) : path === '/historical' ? (
        <HistoricalView />
      ) : path === '/cities' ? (
        <CitiesIndexPage />
      ) : path === '/api' ? (
        <ApiPage />
      ) : path === '/platforms' ? (
        <PlatformsPage />
      ) : cityName ? (
        <CityPage key={cityName} name={cityName} />
      ) : alertId ? (
        <AlertEventPage key={alertId} id={alertId} />
      ) : (
        <MapDashboard />
      )}
      <CookieConsent />
      <AccessibilityWidget />
    </>
  )
}

export default App
