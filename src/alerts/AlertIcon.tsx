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
  // hostile aircraft / UAV
  uav: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  // generic danger (terror / non-conventional / tsunami / unspecified special)
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
      return 'earthquake'
    case 'flash':
      return 'flash'
    case 'terrorattack':
    case 'nonconventional':
    case 'tsunami':
      return 'danger'
  }
  return ev.severity === 'early' ? 'flash' : 'bell'
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
