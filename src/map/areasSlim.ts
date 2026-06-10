import type { FeatureCollection, Polygon } from 'geojson'

// Decodes /data/areas.slim.json (built by scripts/build-areas.mjs) back into the exact
// FeatureCollection<Polygon> shape AlertMap always consumed: feature properties
// { name, en, countdown, area, lat, lng } and closed [lng,lat] rings. Pure function so the
// build-side gate script (scripts/check-areas-slim.ts) can verify fidelity against areas.geojson.
// Encoding: each ring is a flat integer array at 1/scale degrees, delta-encoded after the first
// point, closing point omitted (re-added here). NOT responsible for: fetching, map state.

export type SlimAreaProps = {
  en: string
  countdown: number | null
  area: string | null
  lat: number | null
  lng: number | null
}

export type SlimAreas = {
  v: number
  scale: number
  props: Record<string, SlimAreaProps>
  polys: Record<string, number[][]>
}

export function inflateAreas(slim: SlimAreas): FeatureCollection<Polygon> {
  const { scale, props, polys } = slim
  const features: FeatureCollection<Polygon>['features'] = []
  for (const [name, rings] of Object.entries(polys)) {
    const p = props[name]
    const coordinates: number[][][] = []
    for (const flat of rings) {
      const ring: number[][] = []
      let x = 0
      let y = 0
      for (let i = 0; i < flat.length; i += 2) {
        x += flat[i]
        y += flat[i + 1]
        ring.push([x / scale, y / scale])
      }
      ring.push([ring[0][0], ring[0][1]]) // closing point was dropped at encode time
      coordinates.push(ring)
    }
    features.push({
      type: 'Feature',
      properties: {
        name,
        en: p?.en ?? name,
        countdown: p?.countdown ?? null,
        area: p?.area ?? null,
        lat: p?.lat ?? null,
        lng: p?.lng ?? null,
      },
      geometry: { type: 'Polygon', coordinates },
    })
  }
  return { type: 'FeatureCollection', features }
}
