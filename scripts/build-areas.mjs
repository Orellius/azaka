// Build public/data/areas.geojson + areas.slim.json from the two upstream datasets.
// Inputs:  scripts/source/area_to_polygon.json  (oref_alert metadata: he-name -> [[lat,lng],...])
//          public/data/cities.json              (tzevaadom: he-name -> {id,en,ar,area,countdown,lat,lng})
// Outputs: public/data/areas.geojson            (FeatureCollection<Polygon>, props joined from both;
//                                                kept because /api docs promise it as a public endpoint)
//          public/data/areas.slim.json          (what the app actually fetches: same data, rings as
//                                                flat delta-encoded ints at 1e-4 deg, closing point
//                                                dropped; inflated by src/map/areasSlim.ts)
// Why a build step: upstream uses [lat,lng] vertex order and a flat name->ring map; MapLibre needs
//   GeoJSON [lng,lat] rings with feature properties. We pay that conversion once, at build, not per boot.
// Run:     bun scripts/build-areas.mjs   (then: bun scripts/check-areas-slim.ts to verify fidelity)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const polygons = JSON.parse(readFileSync(join(root, 'scripts/source/area_to_polygon.json'), 'utf8'))
const cities = JSON.parse(readFileSync(join(root, 'public/data/cities.json'), 'utf8')).cities

// SAFETY: these polygons decide which areas paint red during an alert, so simplification is
// deliberately conservative. DP_EPSILON caps vertex deviation at ~11m (1e-4 deg); geojson keeps
// 5-decimal quantization (~1m). The slim file quantizes to 4 decimals (~11m grid, approved
// 2026-06-10) — total worst-case deviation stays far below any visible coverage change at
// alert-viewing zooms (gate: bbox drift < 0.0012 deg, checked by scripts/check-areas-slim.ts).
const DP_EPSILON = 1e-4
const QUANT_GEOJSON = 1e5 // 5 decimal places
const QUANT_SLIM = 1e4 // 4 decimal places

// Perpendicular distance from point p to the segment a-b, in degrees.
function perpDist(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1])
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

// Iterative Douglas-Peucker; endpoints always survive.
function douglasPeucker(points, epsilon) {
  const n = points.length
  if (n < 3) return points.slice()
  const keep = new Uint8Array(n)
  keep[0] = keep[n - 1] = 1
  const stack = [[0, n - 1]]
  while (stack.length) {
    const [first, last] = stack.pop()
    let maxDist = -1
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = perpDist(points[i], points[first], points[last])
      if (d > maxDist) {
        maxDist = d
        index = i
      }
    }
    if (maxDist > epsilon) {
      keep[index] = 1
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

// Quantize a (DP-simplified) closed ring at the given scale. Falls back to the quantized-only
// original ring if dedupe would degenerate it (< 4 points incl. closure), so no area can lose
// its polygon.
function quantizeRing(base, originalRing, quant) {
  const q = (v) => Math.round(v * quant) / quant
  const out = []
  for (const [x, y] of base) {
    const pt = [q(x), q(y)]
    const prev = out[out.length - 1]
    if (prev && prev[0] === pt[0] && prev[1] === pt[1]) continue // quantization can merge neighbors
    out.push(pt)
  }
  // re-close: dedupe may have eaten the closing point, or quantization moved it
  const first = out[0]
  const last = out[out.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]])
  if (out.length < 4) {
    // degenerate after quantization: keep the original ring, quantized but un-deduped beyond closure
    return originalRing.map(([x, y]) => [q(x), q(y)])
  }
  return out
}

// Flat delta-encoded ints at 1/quant degrees; the closing point is dropped (inflate re-adds it).
function deltaEncodeRing(quantizedRing, quant) {
  const flat = []
  let px = 0
  let py = 0
  for (let i = 0; i < quantizedRing.length - 1; i++) {
    const xi = Math.round(quantizedRing[i][0] * quant)
    const yi = Math.round(quantizedRing[i][1] * quant)
    flat.push(xi - px, yi - py)
    px = xi
    py = yi
  }
  return flat
}

const features = []
const slim = { v: 1, scale: QUANT_SLIM, props: {}, polys: {} }
let missingCity = 0
for (const [name, ring] of Object.entries(polygons)) {
  if (!Array.isArray(ring) || ring.length < 3) continue
  const city = cities[name]
  if (!city) missingCity++
  // upstream ring is [lat,lng]; GeoJSON wants [lng,lat]. Close the ring if open.
  const raw = ring.map(([lat, lng]) => [lng, lat])
  const rawFirst = raw[0]
  const rawLast = raw[raw.length - 1]
  if (rawFirst[0] !== rawLast[0] || rawFirst[1] !== rawLast[1]) raw.push(rawFirst)
  const simplified = douglasPeucker(raw, DP_EPSILON)
  const base = simplified.length >= 4 ? simplified : raw
  const props = {
    name,
    en: city?.en ?? name,
    countdown: city?.countdown ?? null,
    area: city?.area ?? null,
    lat: city?.lat ?? null,
    lng: city?.lng ?? null,
  }
  features.push({
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [quantizeRing(base, raw, QUANT_GEOJSON)] },
  })
  const { name: _name, ...slimProps } = props
  slim.props[name] = slimProps
  slim.polys[name] = [deltaEncodeRing(quantizeRing(base, raw, QUANT_SLIM), QUANT_SLIM)]
}

const fc = { type: 'FeatureCollection', features }
const out = join(root, 'public/data/areas.geojson')
writeFileSync(out, JSON.stringify(fc))
const outSlim = join(root, 'public/data/areas.slim.json')
writeFileSync(outSlim, JSON.stringify(slim))
const kb = (p) => `${(readFileSync(p).length / 1e3).toFixed(0)}KB`
console.log(`areas.geojson: ${features.length} polygons, ${kb(out)}, ${missingCity} without a cities.json match`)
console.log(`areas.slim.json: ${kb(outSlim)}`)
