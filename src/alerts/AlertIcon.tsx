import type { ReactNode } from 'react'
import type { FeedEvent } from './useAlertFeed'

// Category icon for an alert card: the shape reflects the threat type, the colour is applied by the
// caller via text colour (so it matches the card's severity). Threat keys come from the relay's
// classifier (categories.ts); we fall back by severity, then to a bell. Stroke-style to read as an icon.
const ICONS: Record<string, ReactNode> = {
  // rocket / missile
  missilealert: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  // hostile aircraft / UAV — top-down quadcopter drone (4 rotors + arms + body)
  uav: (
    <>
      <circle cx="6" cy="6" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="18" r="2.3" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1.2" />
      <path d="m7.6 7.6 1.9 1.9M16.4 7.6l-1.9 1.9M7.6 16.4l1.9-1.9M16.4 16.4l-1.9-1.9" />
    </>
  ),
  // tsunami (water / waves)
  tsunami: (
    <>
      <path d="M2 7c1.4 0 2.1-1 3.5-1S8 7 9.5 7s2.1-1 3.5-1 2.1 1 3.5 1 2.1-1 3.5-1" />
      <path d="M2 12c1.4 0 2.1-1 3.5-1S8 12 9.5 12s2.1-1 3.5-1 2.1 1 3.5 1 2.1-1 3.5-1" />
      <path d="M2 17c1.4 0 2.1-1 3.5-1S8 17 9.5 17s2.1-1 3.5-1 2.1 1 3.5 1 2.1-1 3.5-1" />
    </>
  ),
  // terrorist infiltration (intruder alert — hostile person + warning)
  terrorattack: (
    <>
      <circle cx="9.5" cy="6" r="2.2" />
      <path d="M5 19v-1.5a4.5 4.5 0 0 1 9 0V19" />
      <path d="M19 5v6" />
      <path d="M19 14.5h.01" />
    </>
  ),
  // non-conventional / unconventional event (atom)
  nonconventional: (
    <>
      <circle cx="12" cy="12" r="1.5" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </>
  ),
  // CBRNE / suspected hazardous materials (skull — toxic / lethal hazard)
  cbrne: (
    <>
      <circle cx="9" cy="12" r="1" />
      <circle cx="15" cy="12" r="1" />
      <path d="M8 20v2h8v-2" />
      <path d="m12.5 17-.5-1-.5 1h1z" />
      <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
    </>
  ),
  // hazardous materials (chemical flask)
  hazmat: (
    <>
      <path d="M9 3h6" />
      <path d="M10 3v5.5L5.5 17a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8.5V3" />
      <path d="M7.5 14h9" />
    </>
  ),
  // generic danger (unspecified special / unknown)
  danger: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  // earthquake (seismic wave)
  earthquake: (
    <path d="M22 12h-3.5l-2.5 7-4-16-3 9H2" />
  ),
  // early warning (clock)
  flash: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  // all-clear (check)
  cleared: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5L16 9" />
    </>
  ),
  // default (bell)
  bell: (
    <>
      <path d="M10.27 21a2 2 0 0 0 3.46 0" />
      <path d="M3.26 15.33A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.67C19.41 13.96 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.41 5.96-2.74 7.33" />
    </>
  ),
}

function iconKey(ev: Pick<FeedEvent, 'severity' | 'key'>): string {
  if (ev.severity === 'cleared') return 'cleared'
  switch (ev.key) {
    case 'missilealert':
      return 'missilealert'
    case 'uav':
      return 'uav'
    case 'earthquake':
    case 'earthquakealert1':
    case 'earthquakealert2':
      return 'earthquake'
    case 'tsunami':
      return 'tsunami'
    case 'terrorattack':
      return 'terrorattack'
    case 'nonconventional':
      return 'nonconventional'
    case 'cbrne':
      return 'cbrne'
    case 'hazmat':
      return 'hazmat'
    case 'flash':
      return 'flash'
  }
  return ev.severity === 'early' ? 'flash' : ev.severity === 'special' ? 'danger' : 'bell'
}

export function AlertIcon({ ev, className }: { ev: Pick<FeedEvent, 'severity' | 'key'>; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {ICONS[iconKey(ev)]}
    </svg>
  )
}
