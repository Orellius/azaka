// Generates public/sitemap.xml: the static routes plus /cities plus a /city/<name> entry for every
// oref area in public/data/cities.json (URL-encoded Hebrew, matching the SPA routes). Every entry is
// emitted once per locale (he unprefixed, /en /ar /ru prefixed — mirror src/i18n/locale.ts) with
// xhtml:link hreflang alternates on each url element: sitemap-delivered hreflang is officially
// supported by Google and, unlike the JS-managed link tags, doesn't depend on rendering. Runs as the
// package.json "prebuild" so every Vercel build ships a sitemap that matches the data file.
// Run manually: node scripts/build-sitemap.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const ORIGIN = 'https://azaka.orellius.ai'
const today = new Date().toISOString().slice(0, 10)

const LOCALES = ['he', 'en', 'ar', 'ru']
const localePath = (lang, path) => (lang === 'he' ? path : `/${lang}${path === '/' ? '' : path}`)

const STATIC = [
  { path: '/', changefreq: 'hourly', priority: '1.0' },
  { path: '/historical', changefreq: 'daily', priority: '0.8' },
  { path: '/cities', changefreq: 'daily', priority: '0.7' },
  { path: '/api', changefreq: 'monthly', priority: '0.5' },
  { path: '/platforms', changefreq: 'monthly', priority: '0.5' }, // NOT /embed (widget, not a page); NOT /snapshot (headless render target, noindex)
  { path: '/menu', changefreq: 'monthly', priority: '0.4' },

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

const alternates = (path) =>
  [
    ...LOCALES.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${localePath(l, path)}"/>`),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${path}"/>`,
  ].join('\n')

const entry = ({ path, changefreq, priority }, lang) =>
  `  <url>\n    <loc>${ORIGIN}${localePath(lang, path)}</loc>\n${alternates(path)}\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`

const entries = [...STATIC, ...cityEntries].flatMap((e) => LOCALES.map((lang) => entry(e, lang)))

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>\n`

const out = new URL('../public/sitemap.xml', import.meta.url)
writeFileSync(out, xml)
console.log(
  `[sitemap] wrote ${entries.length} URLs (${STATIC.length + cityEntries.length} routes x ${LOCALES.length} locales, ${cityEntries.length} cities) to public/sitemap.xml`,
)
