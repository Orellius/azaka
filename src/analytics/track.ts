// First-party pageview beacon to our own relay; no third-party analytics. Views are always counted
// as anonymous totals (path + UI language only); the azaka_vid visitor cookie exists ONLY after the
// user chose "Accept all" and is the sole visitor identifier. The HTTP base derives from the same
// VITE_RELAY_URL as the websocket (ws to http, strip /ws), like src/historical/useHistoryStats.ts.
import { readConsent, type Consent } from '../consent/consentStore'

const WS = import.meta.env.VITE_RELAY_URL ?? 'ws://localhost:8787/ws'
const RELAY_HTTP = WS.replace(/^ws(s?):\/\//, 'http$1://').replace(/\/ws$/, '')

const VID = 'azaka_vid'
const ONE_YEAR = 60 * 60 * 24 * 365

function ensureVid(): string {
  const m = document.cookie.match(/(?:^|;\s*)azaka_vid=([a-f0-9-]{1,64})/i)
  if (m) return m[1]
  const vid = crypto.randomUUID()
  document.cookie = `${VID}=${vid}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
  return vid
}

// 'all': make sure the visitor cookie exists; 'essential': expire it immediately
export function applyConsent(v: Consent) {
  if (v === 'all') ensureVid()
  else document.cookie = `${VID}=; path=/; max-age=0; SameSite=Lax`
}

export function trackPageview(path: string) {
  const hit: { path: string; lang: string; vid?: string } = {
    path,
    lang: document.documentElement.lang || 'he',
  }
  if (readConsent() === 'all') hit.vid = ensureVid()
  const url = `${RELAY_HTTP}/collect`
  const body = JSON.stringify(hit)
  let sent = false
  try {
    sent = navigator.sendBeacon(url, body)
  } catch {
    // sendBeacon unavailable: fall through to the fetch fallback
  }
  if (!sent) fetch(url, { method: 'POST', body, keepalive: true }).catch(() => {})
}
