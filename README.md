<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="Azaka logo" />
</p>

<h1 align="center">אזעקה · Azaka</h1>

<p align="center">A faster, official-sourced Red Alert live map for Israel — <a href="https://azaka.orellius.ai">azaka.orellius.ai</a></p>

<p align="center">
  <code>Vite</code> · <code>React 19</code> · <code>TypeScript</code> · <code>MapLibre GL</code> · <code>Tailwind v4</code> · <code>Bun relay</code> · <code>Telegram</code>
</p>

---

> [!WARNING]
> **Unofficial citizen tool. Not a substitute for official Home Front Command (Pikud HaOref) alerts.**
> Always rely on the physical siren, the official Pikud HaOref app, and Home Front Command
> instructions. Azaka mirrors a public feed with no SLA and can be wrong, late, or offline.

## What it is

Azaka renders Israel's official Pikud HaOref rocket and missile alerts on a live map, the moment
they fire — on the web, on Telegram, and through a free public API. It exists to be sharper than the
typical Red Alert clone: the same official data, but read more carefully and shown more usefully.

It is built around one honest constraint: **you cannot predict where a missile will land from open
data.** So Azaka never fakes a "where it lands" dot, never invents a "safe now" timer, and never
relays leaked launch feeds. What it does instead: a grounded **threat zone** (the convex hull of the
areas actually alerted right now), verbatim official text, and the official per-area
time-to-reach-shelter.

**Live surfaces**

| Surface | Where |
|---|---|
| Web app | https://azaka.orellius.ai |
| Telegram channel (all alerts, country-wide) | https://t.me/azaka_alerts |
| Telegram bot (per-city personal DMs) | https://t.me/azakaalertsbot (`/add שם עיר`) |
| Free public API (WS + REST, no key) | https://azaka.orellius.ai/api |
| Embeddable widget for news/community sites | https://azaka.orellius.ai/platforms |

## Features

### The map
- **Live map of every alert area** — all 1,449 official polygons loaded once at boot (delta-encoded
  slim format, ~130 KB gzipped), so an incoming alert is a GPU repaint with zero network on the hot path.
- **Three alert tiers** by Home Front Command's own convention: red active, amber early warning
  ("התקרבו למרחב מוגן"), green "האירוע הסתיים".
- **Computed threat zone** — a dashed hull over the live cluster. Grounded geometry, not a guess.
- **Alert-driven labels**: only currently-alerted areas are labelled, decluttered by zoom; the map is
  clean when calm. Click any sub-area for its name and official shelter-entry seconds.
- **OpenFreeMap vector basemap** (label layers stripped — Azaka's alert labels are the only text),
  with a one-shot automatic CARTO raster fallback if the vector source fails. Camera is locked to a
  regional box around Israel; the default view fits the whole country (Eilat to Metula) on any screen.
- **Auto-zoom to fresh alerts**, guarded so it never hijacks a manual pan.

### Alerting
- **Sound + browser notifications** on a genuinely-new live alert (distinct active vs early sounds),
  muteable; permission asked only on explicit opt-in.
- **Voice readout (opt-in)** — speech synthesis reads the verbatim Hebrew title and your matched areas.
- **"My Area" — up to 5 saved areas.** When any is alerted, a full-width banner shows the most urgent
  one (smallest official shelter seconds) with a live countdown, framed honestly as
  time-to-reach-shelter, never time-to-impact.
- **"Where to take shelter"** — the official protected-space hierarchy (mamad/mamak/miklat → stairwell
  → interior room → outdoors). No fabricated shelter pins (see Safety design).
- **Telegram**: country-wide channel posts (verbatim title, Israel-time stamp, rendered **map image**
  of the painted areas) that **edit in place** as a barrage grows instead of spamming new posts; the
  bot DMs subscribers only when *their* cities newly enter an event, with their shelter seconds.

### Pages & navigation
- **Route-as-overlay**: every page keeps its real URL (full Google indexing), but navigating in-app
  renders it as a floating sheet over the still-live map — the WebSocket never drops, and an alert
  auto-closes any open overlay.
- **Per-city history pages** (`/city/<עיר>`, all 1,449): totals, last alert, by-month/by-type
  breakdowns, recent events — plus `/alert/<id>` permalinks with **per-alert OG share previews**
  (a Vercel edge function injects the event's verbatim title + timestamp into link unfurls).
- `/cities` index · `/historical` stats · `/platforms` (all distribution channels + embed snippet) ·
  `/api` docs · `/menu` site index · about/privacy/terms/contact/accessibility.
- **`/embed`** — a chrome-less live-alert iframe for third-party sites: no cookies, no analytics,
  one line of HTML.
- **4 locales at real URLs** (`/` Hebrew, `/en` `/ar` `/ru`) with bidirectional hreflang (in-page +
  a 5,800+-URL sitemap); full RTL/LTR switching. oref's verbatim Hebrew is always shown; translations
  sit beside it.
- **Accessibility (Israeli regulation 5568 / WCAG 2.0 AA)**: floating widget (text size, high
  contrast, link underlining, reduced motion), keyboard navigation, screen-reader labels, and a
  4-language accessibility statement.
- **First-party analytics only**: consent-gated anonymous visit counting on our own relay
  (`/analytics/stats`); zero third-party trackers, zero ads.
- **Mobile-first**: notification-shade panel; during an alert the instruction stack collapses to a
  peek bar so the painted map stays visible.

## Architecture

The official oref feed is geoblocked to Israeli IPs and sends no CORS headers, so a browser (and any
non-Israeli cloud) cannot read it directly. Azaka splits hosting: the static frontend lives on a CDN,
and a thin relay runs from an Israeli egress behind an outbound-only Cloudflare tunnel.

```
 Pikud HaOref            azaka relay (Israeli IP, tunnel-only)          Consumers
 oref.org.il   ─poll──▶  Bun: classify · dedup · persist     ─WS push─▶ Web app (Vercel CDN)
 Alerts.json    ~1.5s    history + analytics (JSONL)         ─Bot API─▶ Telegram channel + DMs
 (official)              map-image renderer (headless CDP)              Free API consumers / embeds
```

- **Frontend** (`src/`): Vite + React 19 + TS + MapLibre GL + Tailwind v4. Deployed on Vercel from
  GitHub; MapLibre is code-split out of the entry chunk (~97 KB gzipped entry), hashed assets are
  immutable-cached. The GL layer is imperative; HTML overlays are React via `createPortal`.
- **Relay** (`relay/`): one Bun process — polls the official feed, classifies by **verbatim Hebrew
  title**, fans out over WebSocket, posts/edits Telegram messages (rate-limited to Telegram's real
  caps; text alerts always outrank images and edits), renders map snapshots via headless-browser CDP,
  and persists year-partitioned JSONL history + analytics. API responses carry a 5s micro-cache.
  Telegram failures are isolated — they can never touch the WebSocket path.
- **Edge** (`api/alert-og.ts`): Vercel function that rewrites `/alert/:id` HTML with per-event OG
  tags for link unfurls; falls back to the untouched shell on any failure.

## Safety design

This is a life-safety surface, so a few rules are non-negotiable in the code:

1. **Classify by oref's verbatim title, not the category number.** The live feed's `cat` numbering
   does not match the public category table (live `cat 10` carries the all-clear, not a terror
   attack). The Hebrew title is the source of truth.
2. **Never auto-mark an area "safe" on a short timer.** Areas are held until an explicit all-clear,
   with a long fail-safe backstop only against stuck state. Threats with no fixed remain time say
   "wait for official release", never a countdown.
3. **Filter non-attacks.** Memorial-day sirens and drills never render as real alerts.
4. **No fabricated shelter pins.** Israel publishes no reliable open national shelter dataset
   (location ≠ live availability; a Jan-2026 State Comptroller audit found >11% of public shelters
   unfit). Azaka shows the official guidance hierarchy instead. The personal countdown is the
   official time-to-reach-shelter, never time-to-impact.
5. **No leaked pre-alert feeds.** Channels that beat the official pre-alert do it by relaying leaked
   monitoring data; Azaka loses that race deliberately.
6. **Test injections cannot reach production surfaces.** `/test/alert` is disabled in production and
   is excluded from the Telegram path even in dev.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install

# 1) the relay (polls the official feed; must run from an Israeli IP)
bun relay/server.ts            # ws://localhost:8787/ws
# 2) the web app
bun dev                        # http://localhost:5173 (Vite picks the next port if busy)
```

Inject test alerts without waiting for a real siren (area names contain commas, so split on `|`):

```bash
curl 'http://localhost:8787/test/alert?cities=חולון|בת ים'
curl 'http://localhost:8787/test/alert?kind=early&cities=רעננה|כפר סבא'
curl 'http://localhost:8787/test/alert?kind=clear&cities=חולון|בת ים'
```

Relay environment:

| Var | Meaning |
|---|---|
| `PORT` / `OREF_POLL_MS` / `OREF_URL` | server port · poll cadence · feed override |
| `ALLOW_TEST_ALERTS=1` | re-enable `/test/alert` when `NODE_ENV=production` (on by default in dev) |
| `SERVE_STATIC=1` | serve `dist/` from the relay (single-origin mode; production uses Vercel instead) |
| `TELEGRAM_CHANNEL` / `TELEGRAM_TOKEN_FILE` | channel id (default `@azaka_alerts`) · bot-token path (default `relay/data/telegram.token`; absent = Telegram disabled) |
| `SNAPSHOT_BASE` | base URL for the map-image renderer (default the production site) |

Frontend: `VITE_RELAY_URL` points the app at a relay (build-time; Vite inlines it).

Data pipeline:

```bash
bun scripts/build-areas.mjs    # regenerate areas.geojson + areas.slim.json (quantize + simplify)
node scripts/build-sitemap.mjs # regenerate the sitemap (runs automatically as prebuild)
```

## Project structure

```
api/alert-og.ts            Vercel edge fn: per-alert OG tags for /alert/:id link unfurls
src/
  App.tsx                  routes (locale-stripped) + route-as-overlay presentation
  RouteOverlay.tsx         floating page sheet over the live map (scrim, focus, alert auto-yield)
  MapDashboard.tsx         dashboard shell: map, drawer panel, grouped feed, peek bar, chips
  alerts/                  WebSocket feed model + verbatim-title classifier (single source of truth)
  map/                     MapLibre map, OFM vector style (+CARTO fallback), slim-polygon inflate
  myarea/                  up-to-5 saved areas, personal banner + official shelter countdown
  notify/                  Web Audio alarm, browser notifications, opt-in voice readout
  shelter/                 official "where to take shelter" guidance (no fabricated pins)
  i18n/                    language store + dictionary (he/en/ar/ru) + locale path layer
  seo/usePageMeta.ts       per-route title/description/canonical/hreflang/noindex
  a11y/                    accessibility widget + prefs store (IS 5568 / WCAG 2.0 AA)
  analytics/track.ts       consent-gated first-party pageview beacon
  consent/                 cookie banner + store (yields to live alerts)
  historical/              /historical stats (server-aggregated)
  pages/                   city pages, alert permalinks, cities index, platforms, API docs,
                           menu, embed widget, snapshot render target, info pages, 404
  threat-zone/             convexHull + computeThreatZone (no deps)
relay/
  server.ts                poll, classify, fan out, HTTP API (+5s micro-cache), static opt-in
  telegram.ts              channel posts + per-city DM subscriptions (rate-limited, isolated)
  telegram-events.ts       open-event model: 30-min stacking window, edit coalescing, DM deltas
  telegram-render.ts       headless-browser CDP map-snapshot renderer
  history.ts               year-partitioned JSONL history + stats aggregation
  analytics.ts             year-partitioned first-party analytics log + aggregates
scripts/                   build-areas (geojson + slim) · build-sitemap (5,800+ URLs, hreflang)
```

## Public API

Free, no key, no SLA. Attribution required ("Data: Azaka — azaka.orellius.ai"); don't poll faster
than 1/s. Full docs with message shapes: **https://azaka.orellius.ai/api**

- `wss://azaka-relay.orellius.ai/ws` — live push (`hello` / `alert` / `clear`, verbatim oref text)
- `GET /history` · `/history/years` · `/history/stats` · `/history/city?name=` · `/history/event?id=`
- `GET https://azaka.orellius.ai/data/areas.geojson` — the area polygons (GeoJSON)

## Data sources and credits

- **Pikud HaOref / Home Front Command** (`oref.org.il`) — the official alert feed.
- **[amitfin/oref_alert](https://github.com/amitfin/oref_alert)** — polygon/metadata reference and the
  active-vs-ended model.
- **tzevaadom.co.il** — city lookup (multilingual names, shelter seconds, coordinates).
- **[OpenFreeMap](https://openfreemap.org) © OpenMapTiles © OpenStreetMap** — vector basemap.
- **[CARTO](https://carto.com/) / OpenStreetMap** — raster fallback basemap.

These upstream feeds are unofficial and carry no SLA. Treat them accordingly.

## Status

**Live in production** at [azaka.orellius.ai](https://azaka.orellius.ai) — frontend on Vercel,
relay on an Israeli egress behind a Cloudflare tunnel. The full pipeline has carried real alerts
end-to-end (feed → classification → website + Telegram) during live events.

Still open: native review of the machine-drafted Arabic/Russian strings; legal-page review + final
contact details; an always-on Israeli VM for the relay (currently a supervised workstation); web push.

Roadmap: per-city Telegram growth experiment (30-day signal), a real public-shelter layer for the
2–3 cities with good open data (explicit coverage labels + "may be locked, verify" disclaimer), and
full-event-extent historical snapshots.

## License

Private. Not for redistribution.
