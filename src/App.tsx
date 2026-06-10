import { useEffect } from 'react'
import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'
import { InfoPage, type InfoSlug } from './pages/InfoPage'
import { CityPage } from './pages/CityPage'
import { AlertEventPage } from './pages/AlertEventPage'
import { CitiesIndexPage } from './pages/CitiesIndexPage'
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
    trackPageview(path)
  }, [path])
  return (
    <>
      {info ? (
        <InfoPage slug={info} />
      ) : path === '/historical' ? (
        <HistoricalView />
      ) : path === '/cities' ? (
        <CitiesIndexPage />
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
