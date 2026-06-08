// Cookie-consent persistence + a tiny open-bus, kept out of the component file so React fast-refresh
// works (a .tsx may only export components). The choice is stored in a real first-party cookie so the
// banner stays dismissed across visits and a static host could read it later. Today the app sets no
// tracking cookies, so the stored value is simply the gate any future analytics must check before load.
const COOKIE = 'azaka_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

export type Consent = 'all' | 'essential'

export function readConsent(): Consent | null {
  const m = document.cookie.match(/(?:^|;\s*)azaka_consent=(all|essential)/)
  return m ? (m[1] as Consent) : null
}

export function writeConsent(v: Consent) {
  document.cookie = `${COOKIE}=${v}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
}

const openListeners = new Set<() => void>()

// the footer "Cookie Settings" link calls this to reopen the banner without prop-drilling through the app
export function openCookieSettings() {
  openListeners.forEach((fn) => fn())
}

export function subscribeCookieOpen(fn: () => void): () => void {
  openListeners.add(fn)
  return () => {
    openListeners.delete(fn)
  }
}
