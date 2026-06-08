<p align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="Azaka logo" />
</p>

<h1 align="center">אזעקה · Azaka</h1>

<p align="center">A faster, official-sourced Red Alert live map for Israel.</p>

<p align="center">
  <code>Vite</code> · <code>React 19</code> · <code>TypeScript</code> · <code>MapLibre GL</code> · <code>Tailwind v4</code> · <code>Bun relay</code>
</p>

---

> [!WARNING]
> **Unofficial tool. Not a substitute for official Home Front Command (Pikud HaOref) alerts.**
> Always rely on the physical siren, the official Pikud HaOref app, and Home Front Command
> instructions. Azaka mirrors a public feed with no SLA and can be wrong, late, or offline.

## What it is

Azaka renders Israel's official Pikud HaOref rocket and missile alerts on a live map, the moment
they fire. It exists to be sharper than the typical Red Alert clone: the same official data, but
read more carefully and shown more usefully.

It is built around one honest constraint: **you cannot predict where a missile will land from open
data.** The trajectory and interception data that produce an impact point are classified. So Azaka
does not fake a "where it lands" dot. What it does instead is draw a grounded **threat zone** (the
convex hull of the areas actually alerted right now), and it focuses on the questions the siren
itself cannot answer.

## Features

- **Live map of every alert area.** All 1,449 official Pikud HaOref alert polygons are loaded once
  at boot, so an incoming alert is a GPU repaint with zero network on the hot path.
- **Three alert tiers, by Home Front Command's own convention.** Red for active (take shelter now),
  amber for early warning ("התקרבו למרחב מוגן"), green for "האירוע הסתיים" (event ended, safe to leave).
- **Grouped event feed.** One card per alert event with all of its areas grouped, newest first, like
  tzevaadom. A 600-area barrage is one card, not 600 rows.
- **Verbatim official instructions.** The exact oref text is shown ("היכנסו למרחב המוגן ושהו בו 10 דקות"),
  never a paraphrase. Threats that have no fixed remain time (ballistic, terror, nonconventional) say
  "wait for official release" instead of a countdown.
- **Computed threat zone.** A dashed polygon over the live cluster of active areas. Grounded geometry,
  not a guess.
- **Alert-driven map labels.** Only the areas currently under alert are labelled, coloured by tier and
  decluttered by zoom (minor localities reveal as you zoom in); the map clears when calm. Click any
  sub-area to see its name and shelter-entry time.
- **Auto-zoom to fresh alerts**, with guards so it never hijacks the view while you are panning.
- **Sound + browser notifications** on a genuinely-new live alert (distinct for active vs early), with a
  mute toggle. Permission is requested only on an explicit opt-in, never on page load.
- **"My Area" personal alert.** Pick your city once; when it is alerted, a full-width banner shows with a
  live ticking countdown built from the official migun seconds, framed honestly as time-to-reach-shelter,
  not time-to-impact.
- **"Where to take shelter."** The official Home Front Command protected-space hierarchy (mamad/mamak/
  miklat, then interior stairwell, then interior room, then outdoors/driving). Israel publishes no
  reliable open public-shelter dataset, so Azaka shows always-correct guidance rather than a pin that
  could send you to a locked or demolished shelter.
- **Multilingual (he / en / ar / ru)** with language chips and full RTL/LTR switching. oref's verbatim
  text is always kept; translations sit beside it as an aid.
- **Mobile-first.** The command panel is a collapsible bottom sheet on phones, a floating card on desktop.

## Architecture

The official oref feed is geoblocked to Israeli IPs and sends no CORS headers, so a browser (and a
Cloudflare Worker) cannot read it directly. Azaka runs its own thin relay from an Israeli egress.

```
 Pikud HaOref                 azaka relay  (Israeli IP)           Browser
 oref.org.il    ──poll──▶     Bun WebSocket server     ──push──▶  React + MapLibre GL
 Alerts.json     ~1.5s        classify, dedup,         WS push    live map · grouped feed
 (official)                   persist history                     three alert tiers
```

- **Frontend** (`src/`): Vite + React 19 + TypeScript + MapLibre GL + Tailwind v4, RTL Hebrew. The
  GL layer (polygons, colors, threat-zone hull) is imperative; the HTML overlays (city pills, popup)
  are React via `createPortal`. Vertical-slice folders: `notify/` (alarm + notifications), `myarea/`
  (personal alert + shelter countdown), `i18n/` (language store + dictionary), `shelter/` (where-to-
  shelter guidance).
- **Relay** (`relay/server.ts`): a Bun WebSocket server that polls the official `Alerts.json`, dedups
  by alert id, classifies each alert, fans it out to every connected browser, and appends it to a
  history log. No third party in the data path.

## Safety design

This is a life-safety surface, so a few rules are non-negotiable in the code:

1. **Classify by oref's verbatim title, not the category number.** The live feed's `cat` numbering
   does not match the public category table (the live `cat 10` carries "האירוע הסתיים", an all-clear,
   not a terror attack). The Hebrew title is unambiguous and is the source of truth.
2. **Never auto-mark an area "safe" on a short timer.** Official guidance is remain 10 minutes for
   rockets and drones, and "wait for an official release" for ballistic, terror, and nonconventional
   threats. An area is held until an explicit all-clear, with a long fail-safe backstop only to avoid
   a stuck state.
3. **Filter non-attacks.** Memorial-day sirens and drills are never shown as real alerts.
4. **No fabricated shelter pins.** Israel publishes no reliable, openly-licensed national public-shelter
   dataset (the complete layer is proprietary; open data is a few cities; a Jan-2026 State Comptroller
   audit found >11% of public shelters unfit). Location is not live availability, so Azaka shows the
   official "where to take shelter" guidance rather than directing you to a specific shelter that may be
   locked or gone. The personal countdown is the official time-to-reach-shelter, never a time-to-impact.

## Getting started

Requires [Bun](https://bun.sh).

```bash
bun install

# 1) the relay (polls the official feed; must run from an Israeli IP)
bun relay/server.ts            # ws://localhost:8787/ws

# 2) the web app
bun dev                        # http://localhost:5173
```

Inject test alerts without waiting for a real siren:

```bash
curl 'http://localhost:8787/test/alert?cities=חולון|בת ים'
curl 'http://localhost:8787/test/alert?kind=early&cities=רעננה|כפר סבא'
curl 'http://localhost:8787/test/alert?kind=clear&cities=חולון|בת ים'
```

Point the app at a different relay with `VITE_RELAY_URL`. In production the relay must egress from an
Israeli IP (for example GCP `me-west1` / Tel Aviv); during development your own connection works.

Regenerate the area polygons from source:

```bash
bun scripts/build-areas.mjs    # -> public/data/areas.geojson
```

## Project structure

```
src/
  App.tsx                  history-API router (map / historical / about / privacy / terms / contact)
  MapDashboard.tsx         dashboard shell: map + command panel, grouped feed, legend
  alerts/
    useAlertFeed.ts        WebSocket client; rolling 24h feed seeded from /history, stacking, backstop
    categories.ts          authoritative title classifier (single source of truth)
    AlertIcon.tsx          per-threat-type category icon
  notify/                  audible alarm (Web Audio) + browser notifications + mute toggle
  myarea/                  "My Area" pick, persistence, personal alert + live shelter countdown banner
  shelter/                 "Where to take shelter" official guidance (no fabricated pins)
  i18n/                    language store + dictionary + chips (he / en / ar / ru, RTL/LTR)
  map/
    AlertMap.tsx           MapLibre map: tiers, threat-zone, history-snapshot layer, portal overlays
    majorCities.ts / mapStyle.ts
  historical/              /historical stats page (server-aggregated)
  pages/InfoPage.tsx       about / privacy / terms / contact
  consent/                 cookie consent banner + store
  threat-zone/             convexHull + computeThreatZone (no deps)
relay/
  server.ts                poll official feed, classify, fan out, persist, HTTP routes
  history.ts               year-partitioned history log + computeStats
scripts/build-areas.mjs    build areas.geojson from upstream sources
```

## Data sources and credits

- **Pikud HaOref / Home Front Command** (`oref.org.il`): the official alert feed and category data.
- **[amitfin/oref_alert](https://github.com/amitfin/oref_alert)**: alert-area polygon and metadata
  reference, and the model for active-versus-ended handling.
- **tzevaadom.co.il**: city lookup (multilingual names, shelter-entry seconds, coordinates).
- **[CARTO](https://carto.com/) / OpenStreetMap**: basemap tiles.

These feeds are unofficial and carry no SLA. Treat them accordingly.

## Status

Early but real. The relay has caught real live alerts end to end from the official feed and classifies
them correctly. The full UI builds and typechecks clean. Beyond the core map it now has a rolling 24h
grouped feed (seeded from history, survives refresh), per-event history snapshots (click a card to
replay its areas on the map), audible alarm + browser notifications, a personal "My Area" alert with a
live shelter countdown, "where to take shelter" guidance, a multilingual UI (he/en/ar/ru), a mobile
bottom-sheet layout, a historical stats page, and the legal/consent scaffolding.

Before launch: `/test/alert` is now disabled when `NODE_ENV=production` (opt back in with
`ALLOW_TEST_ALERTS=1`); still to do is serving the relay over `wss://` (an HTTPS page cannot connect to
`ws://`); a production Israeli egress under process supervision; legal pages + a real contact email need
real content; the Arabic and Russian strings need a native/professional review.

Roadmap: an optional real public-shelter layer for the 2-3 cities with good open data (Jerusalem ODbL +
Be'er Sheva), with explicit coverage labels and a "may be locked, verify" disclaimer; and "full event
extent" historical snapshots (union every wave of an ended event).

## License

Private. Not for redistribution.
