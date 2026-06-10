// Generates public/sitemap.xml: the static routes plus /cities plus a /city/<name> entry for every
// oref area in public/data/cities.json (URL-encoded Hebrew, matching the SPA routes). Runs as the
// package.json "prebuild" so every Vercel build ships a sitemap that matches the data file.
// Run manually: node scripts/build-sitemap.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const ORIGIN = 'https://azaka.orellius.ai'
const today = new Date().toISOString().slice(0, 10)

const STATIC = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/historical', changefreq: 'daily', priority: '0.8' },
  { path: '/cities', changefreq: 'daily', priority: '0.7' },
  { path: '/api', changefreq: 'monthly', priority: '0.5' },
  { path: '/platforms', changefreq: 'monthly', priority: '0.5' }, // NOT /embed: the widget is a component, not a page

  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.2' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
  { path: '/contact', changefreq: 'yearly', priority: '0.2' },
  { path: '/accessibility', changefreq: 'monthly', priority: '0.3' },
]

const cities = JSON.parse(readFileSync(new URL('../public/data/cities.json', import.meta.url), 'utf8')).cities
const cityEntries = Object.keys(cities)
  .sort((a, b) => a.localeCompare(b, 'he'))
  .map((name) => ({ path: `/city/${encodeURIComponent(name)}`, changefreq: 'daily', priority: '0.6' }))

const entry = ({ path, changefreq, priority }) =>
  `  <url>\n    <loc>${ORIGIN}${path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...STATIC, ...cityEntries].map(entry).join('\n')}\n</urlset>\n`

const out = new URL('../public/sitemap.xml', import.meta.url)
writeFileSync(out, xml)
console.log(`[sitemap] wrote ${STATIC.length + cityEntries.length} URLs (${cityEntries.length} cities) to public/sitemap.xml`)
