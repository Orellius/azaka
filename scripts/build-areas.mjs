// Build public/data/areas.geojson from the two upstream datasets.
// Inputs:  scripts/source/area_to_polygon.json  (oref_alert metadata: he-name -> [[lat,lng],...])
//          public/data/cities.json              (tzevaadom: he-name -> {id,en,ar,area,countdown,lat,lng})
// Output:  public/data/areas.geojson            (FeatureCollection<Polygon>, props joined from both)
// Why a build step: upstream uses [lat,lng] vertex order and a flat name->ring map; MapLibre needs
//   GeoJSON [lng,lat] rings with feature properties. We pay that conversion once, at build, not per boot.
// Run:     bun scripts/build-areas.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const polygons = JSON.parse(readFileSync(join(root, 'scripts/source/area_to_polygon.json'), 'utf8'))
const cities = JSON.parse(readFileSync(join(root, 'public/data/cities.json'), 'utf8')).cities

const features = []
let missingCity = 0
for (const [name, ring] of Object.entries(polygons)) {
  if (!Array.isArray(ring) || ring.length < 3) continue
  const city = cities[name]
  if (!city) missingCity++
  // upstream ring is [lat,lng]; GeoJSON wants [lng,lat]. Close the ring if open.
  const coords = ring.map(([lat, lng]) => [lng, lat])
  const first = coords[0]
  const last = coords[coords.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first)
  features.push({
    type: 'Feature',
    properties: {
      name,
      en: city?.en ?? name,
      countdown: city?.countdown ?? null,
      area: city?.area ?? null,
      lat: city?.lat ?? null,
      lng: city?.lng ?? null,
    },
    geometry: { type: 'Polygon', coordinates: [coords] },
  })
}

const fc = { type: 'FeatureCollection', features }
const out = join(root, 'public/data/areas.geojson')
writeFileSync(out, JSON.stringify(fc))
const bytes = readFileSync(out).length
console.log(`areas.geojson: ${features.length} polygons, ${(bytes / 1e6).toFixed(2)}MB, ${missingCity} without a cities.json match`)
