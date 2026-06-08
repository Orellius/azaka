import type { FeatureCollection, Polygon } from 'geojson'
import { convexHull, type Point } from './convexHull'

// The "live threat zone": convex hull over the vertices of every currently-active alert area.
// Grounded geometry, not a guess. coordsByName maps area name to its outer ring ([lng,lat] pairs).
export function computeThreatZone(
  active: Set<string>,
  coordsByName: Map<string, Point[]>,
): FeatureCollection<Polygon> {
  const empty: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] }
  const pts: Point[] = []
  for (const name of active) {
    const ring = coordsByName.get(name)
    if (ring) for (const p of ring) pts.push(p)
  }
  if (pts.length < 3) return empty

  const hull = convexHull(pts)
  if (hull.length < 3) return empty
  hull.push(hull[0])

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { areas: active.size },
        geometry: { type: 'Polygon', coordinates: [hull] },
      },
    ],
  }
}
