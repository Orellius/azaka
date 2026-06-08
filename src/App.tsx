import { MapDashboard } from './MapDashboard'
import { HistoricalView } from './historical/HistoricalView'
import { useRoute } from './router'

function App() {
  const path = useRoute()
  if (path === '/historical') return <HistoricalView />
  return <MapDashboard />
}

export default App
