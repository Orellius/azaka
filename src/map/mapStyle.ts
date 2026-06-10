import type { StyleSpecification } from 'maplibre-gl'
import ofmPositronNoLabels from './ofm-positron-nolabels.json'

// Default basemap: OpenFreeMap Positron (vector), vendored with ALL symbol layers stripped so the
// app's alert-driven HTML labels are the only text on the map. The style JSON is bundled, so the
// only runtime failure mode is the 'openmaptiles' source (TileJSON/tiles) — AlertMap watches for
// that and falls back one-shot to the CARTO raster style below. Attribution comes from each
// source's own metadata (OFM TileJSON: OpenFreeMap / OpenMapTiles / OSM; CARTO: inline).
export const ISRAEL_CENTER: [number, number] = [34.95, 31.65]
export const ISRAEL_ZOOM = 7.2

// The vector source whose failure means "no basemap" (watched by AlertMap's fallback).
export const OFM_VECTOR_SOURCE_ID = 'openmaptiles'

export const mapStyle = ofmPositronNoLabels as unknown as StyleSpecification

// Raster fallback (CARTO Positron, no labels) — same muted light look, used only if OFM fails.
export const cartoFallbackStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap © CARTO',
    },
  },
  layers: [{ id: 'carto', type: 'raster', source: 'carto' }],
}
