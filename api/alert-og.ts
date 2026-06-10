// Per-alert Open Graph tags for /alert/:id share previews. Crawlers (WhatsApp/Telegram/X) don't run
// JS, so the SPA's usePageMeta never reaches them; this edge function fetches the event from the
// relay + the built SPA shell, string-replaces the head's title/og/twitter tags with the event's
// VERBATIM oref title + cities, and serves the same bootable shell (humans hydrate normally and the
// client meta layer takes over). Relay error / unknown id => the untouched shell, never a broken page.
// NOT responsible for: og:image rendering (site default stays). Pure helpers (buildAlertMeta,
// injectAlertMeta, ilStamp) are exported for the bun smoke test against a real history event.
import { STRINGS, type Lang } from '../src/i18n/strings'
import { withLocale } from '../src/i18n/locale'

export const config = { runtime: 'edge' }

const SITE = 'https://azaka.orellius.ai'
const RELAY = 'https://azaka-relay.orellius.ai'
const FETCH_TIMEOUT_MS = 5_000
const MAX_CITIES = 8

export type OgEvent = { type?: string; kind?: string; id?: string; title?: string; cities?: string[]; ts?: number }

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// same severity emoji convention as the Telegram channel (relay/telegram.ts emojiFor)
const emojiFor = (ev: OgEvent) => (ev.type === 'clear' ? '🟢' : ev.kind === 'early' ? '🟠' : '🔴')

export function ilStamp(ts: number): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ts)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`
}

export function buildAlertMeta(ev: OgEvent, lang: Lang): { title: string; desc: string; url: string } {
  const verbatim = ev.title || (ev.type === 'clear' ? 'האירוע הסתיים' : 'התרעת פיקוד העורף')
  const title = `${emojiFor(ev)} ${verbatim}${ev.ts ? ` — ${ilStamp(ev.ts)}` : ''}`
  const cities = ev.cities ?? []
  const shown = cities.slice(0, MAX_CITIES).join(', ')
  const more =
    cities.length > MAX_CITIES ? ` ${STRINGS.notif_more[lang].replace('{n}', String(cities.length - MAX_CITIES))}` : ''
  const desc = [shown + more, STRINGS.og_disclaimer[lang]].filter(Boolean).join(' · ')
  const url = SITE + withLocale(`/alert/${encodeURIComponent(ev.id ?? '')}`, lang)
  return { title, desc, url }
}

function setMeta(html: string, attr: 'property' | 'name', key: string, value: string): string {
  const re = new RegExp(`(<meta[^>]*\\b${attr}="${key}"[^>]*\\bcontent=")[^"]*(")`)
  return html.replace(re, (_, a: string, b: string) => a + value + b)
}

export function injectAlertMeta(shell: string, meta: { title: string; desc: string; url: string }): string {
  const title = esc(meta.title)
  const desc = esc(meta.desc)
  const url = esc(meta.url)
  let html = shell.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`)
  html = setMeta(html, 'property', 'og:title', title)
  html = setMeta(html, 'property', 'og:description', desc)
  html = setMeta(html, 'property', 'og:url', url)
  html = setMeta(html, 'name', 'twitter:title', title)
  html = setMeta(html, 'name', 'twitter:description', desc)
  return html
}

async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  const reqUrl = new URL(req.url)
  const id = (reqUrl.searchParams.get('id') ?? '').trim()
  const langParam = reqUrl.searchParams.get('lang')
  const lang: Lang = langParam === 'en' || langParam === 'ar' || langParam === 'ru' ? langParam : 'he'

  const [shellRes, eventRes] = await Promise.all([
    fetchWithTimeout(`${SITE}/index.html`),
    id && id.length <= 64 ? fetchWithTimeout(`${RELAY}/history/event?id=${encodeURIComponent(id)}`) : null,
  ])
  if (!shellRes?.ok) return new Response('shell unavailable', { status: 503 })
  const shell = await shellRes.text()

  const headers = {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
  }
  if (eventRes?.ok) {
    try {
      const d = (await eventRes.json()) as { event?: OgEvent }
      if (d.event) return new Response(injectAlertMeta(shell, buildAlertMeta(d.event, lang)), { headers })
    } catch {
      // malformed relay payload: fall through to the untouched shell
    }
  }
  return new Response(shell, { headers })
}
