import { useEffect } from 'react'
import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'
import { InfoPage, type InfoSlug } from './pages/InfoPage'
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

function App() {
  const path = useRoute()
  const info = INFO_ROUTES[path]
  useEffect(() => {
    trackPageview(path)
  }, [path])
  return (
    <>
      {info ? <InfoPage slug={info} /> : path === '/historical' ? <HistoricalView /> : <MapDashboard />}
      <CookieConsent />
      <AccessibilityWidget />
    </>
  )
}

export default App
