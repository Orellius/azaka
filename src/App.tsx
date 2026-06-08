import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'
import { InfoPage, type InfoSlug } from './pages/InfoPage'
import { CookieConsent } from './consent/CookieConsent'
import { useRoute } from './router'

const INFO_ROUTES: Record<string, InfoSlug> = {
  '/about': 'about',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/contact': 'contact',
}

function App() {
  const path = useRoute()
  const info = INFO_ROUTES[path]
  return (
    <>
      {info ? <InfoPage slug={info} /> : path === '/historical' ? <HistoricalView /> : <MapDashboard />}
      <CookieConsent />
    </>
  )
}

export default App
