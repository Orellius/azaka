import type { StyleSpecification } from 'maplibre-gl'

// Light raster basemap (CARTO Positron). No API key, muted so alert polygons pop.
// Swap to a self-hosted Protomaps/MapTiler vector style for production + Hebrew labels.
export const ISRAEL_CENTER: [number, number] = [34.95, 31.65]
export const ISRAEL_ZOOM = 7.2

export const mapStyle: StyleSpecification = {
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
