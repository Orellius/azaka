// Fidelity gates for public/data/areas.slim.json vs public/data/areas.geojson (the life-safety
// reference). Run with: bun scripts/check-areas-slim.ts — exits 1 on any gate failure.
// Gates: feature count matches geojson (1449), every ring >= 4 points and closed, properties
// identical per feature, worst per-feature bbox drift < 0.0012 deg.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { inflateAreas, type SlimAreas } from '../src/map/areasSlim.ts'
import type { FeatureCollection, Polygon } from 'geojson'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const geojson = JSON.parse(readFileSync(join(root, 'public/data/areas.geojson'), 'utf8')) as FeatureCollection<Polygon>
const slim = JSON.parse(readFileSync(join(root, 'public/data/areas.slim.json'), 'utf8')) as SlimAreas
const inflated = inflateAreas(slim)

const MAX_DRIFT = 0.0012
let failures = 0
const fail = (msg: string) => {
  failures++
  console.error(`FAIL: ${msg}`)
}

if (inflated.features.length !== geojson.features.length)
  fail(`feature count ${inflated.features.length} != geojson ${geojson.features.length}`)
if (inflated.features.length !== 1449) fail(`feature count ${inflated.features.length} != expected 1449`)

function bbox(rings: number[][][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const ring of rings)
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  return [minX, minY, maxX, maxY]
}

const byName = new Map(geojson.features.map((f) => [f.properties?.name as string, f]))
let worstDrift = 0
let worstName = ''
for (const f of inflated.features) {
  const name = f.properties?.name as string
  const ref = byName.get(name)
  if (!ref) {
    fail(`${name}: missing from geojson`)
    continue
  }
  for (const ring of f.geometry.coordinates) {
    if (ring.length < 4) fail(`${name}: ring has ${ring.length} points (< 4)`)
    const [fx, fy] = ring[0]
    const [lx, ly] = ring[ring.length - 1]
    if (fx !== lx || fy !== ly) fail(`${name}: ring not closed`)
  }
  const expectedProps = ref.properties as Record<string, unknown>
  const gotProps = f.properties as Record<string, unknown>
  for (const k of ['name', 'en', 'countdown', 'area', 'lat', 'lng']) {
    if (gotProps[k] !== expectedProps[k]) fail(`${name}: prop ${k} ${String(gotProps[k])} != ${String(expectedProps[k])}`)
  }
  const a = bbox(f.geometry.coordinates)
  const b = bbox(ref.geometry.coordinates)
  const drift = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]), Math.abs(a[3] - b[3]))
  if (drift > worstDrift) {
    worstDrift = drift
    worstName = name
  }
}
if (worstDrift >= MAX_DRIFT) fail(`worst bbox drift ${worstDrift} >= ${MAX_DRIFT} (${worstName})`)

console.log(
  `${inflated.features.length} features | worst bbox drift ${worstDrift.toExponential(2)} deg (${worstName}) | ${failures === 0 ? 'ALL GATES PASS' : `${failures} FAILURES`}`,
)
process.exit(failures === 0 ? 0 : 1)
