import { useEffect, useState } from 'react'
import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'

// Tiny hash router: #stats (or #historical) shows the historical dashboard; anything else is the live
// map. Hash routing avoids needing SPA-fallback config and keeps the view shareable and refreshable.
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

function App() {
  const hash = useHashRoute()
  if (hash === '#stats' || hash === '#historical') return <HistoricalView />
  return <MapDashboard />
}

export default App
