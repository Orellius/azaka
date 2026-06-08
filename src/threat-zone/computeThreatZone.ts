import type { Feature, FeatureCollection, Polygon } from 'geojson'
import { convexHull, type Point } from './convexHull'

// The "live threat zone": one convex hull per SPATIAL CLUSTER of currently-active alert areas. Grounded
// geometry, not a guess. Clustering matters: a single hull over all active areas would draw an absurd
// thin sliver across the whole country when two distant regions are hit at once (e.g. the north and
// Eilat). Areas whose centroids are within CLUSTER_DEG of each other (single-link, so contiguous
// barrages stay one zone) share a hull; far-apart regions get separate hulls that appear and disappear
// independently. coordsByName maps an area name to its outer ring ([lng,lat] pairs).
const CLUSTER_DEG = 0.75 // ~80 km; beyond this gap, a separate threat zone is drawn

export function computeThreatZone(
  active: Set<string>,
  coordsByName: Map<string, Point[]>,
): FeatureCollection<Polygon> {
  const empty: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] }

  const areas: { ring: Point[]; cx: number; cy: number }[] = []
  for (const name of active) {
    const ring = coordsByName.get(name)
    if (!ring || ring.length === 0) continue
    let sx = 0
    let sy = 0
    for (const [x, y] of ring) {
      sx += x
      sy += y
    }
    areas.push({ ring, cx: sx / ring.length, cy: sy / ring.length })
  }
  if (areas.length === 0) return empty

  // single-link clustering by centroid proximity (union-find over pairwise distances)
  const parent = areas.map((_, i) => i)
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }
  const thresh2 = CLUSTER_DEG * CLUSTER_DEG
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const dx = areas[i].cx - areas[j].cx
      const dy = areas[i].cy - areas[j].cy
      if (dx * dx + dy * dy <= thresh2) parent[find(i)] = find(j)
    }
  }

  const clusters = new Map<number, Point[]>()
  for (let i = 0; i < areas.length; i++) {
    const root = find(i)
    const pts = clusters.get(root) ?? []
    for (const p of areas[i].ring) pts.push(p)
    clusters.set(root, pts)
  }

  const features: Feature<Polygon>[] = []
  for (const pts of clusters.values()) {
    if (pts.length < 3) continue
    const hull = convexHull(pts)
    if (hull.length < 3) continue
    hull.push(hull[0])
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [hull] } })
  }
  return { type: 'FeatureCollection', features }
}
