import type { ReactNode } from 'react'
import { usePageMeta } from '../seo/usePageMeta'
import { ArchiveShell } from './ArchiveShell'

// /api — docs for the free public relay API (https://azaka-relay.orellius.ai): the WS push feed and
// the read-only history/health REST endpoints, with the REAL message shapes from relay/server.ts.
// Body is English (developer audience) behind a Hebrew intro; the page forces ltr for the docs while
// the shell keeps the app's direction. NOT responsible for: API keys/auth (there are none, by design).
// Test strategy: covered by build/typecheck + eyeballing the route; content is static.

const BASE = 'https://azaka-relay.orellius.ai'

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-md border border-white/10 bg-white/[0.04] p-3 text-[0.71875rem] leading-relaxed text-slate-300">
      <code>{children}</code>
    </pre>
  )
}

function Fields({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <table className="mt-2 w-full border-collapse text-[0.71875rem]">
      <thead>
        <tr className="border-b border-white/10 text-left text-slate-500">
          <th className="py-1 pe-3 font-medium">field</th>
          <th className="py-1 pe-3 font-medium">type</th>
          <th className="py-1 font-medium">meaning</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, type, meaning]) => (
          <tr key={name} className="border-b border-white/5 align-top">
            <td className="py-1.5 pe-3 font-mono text-sky-300">{name}</td>
            <td className="py-1.5 pe-3 font-mono text-slate-400">{type}</td>
            <td className="py-1.5 text-slate-400">{meaning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[0.9375rem] font-semibold text-white">{title}</h2>
      {children}
    </section>
  )
}

function Endpoint({ method, path, children }: { method: string; path: string; children: ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="font-mono text-[0.8125rem] font-semibold text-slate-200">
        <span className="me-2 rounded bg-white/10 px-1.5 py-0.5 text-[0.6875rem] text-emerald-300">{method}</span>
        {path}
      </h3>
      {children}
    </div>
  )
}

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-slate-400">{children}</p>
)

export function ApiPage() {
  usePageMeta(
    'Free Red Alert API — Azaka | API חינמי להתרעות פיקוד העורף',
    'Free public API for Israeli Red Alerts (Pikud HaOref): real-time WebSocket push + alert history REST endpoints. No key, no SLA, attribution required.',
  )
  return (
    <ArchiveShell>
      <h1 className="text-xl font-bold text-white">Azaka Alert API</h1>

      {/* Hebrew intro for the local audience; the docs themselves are English for developers */}
      <p dir="rtl" className="mt-3 text-[0.8125rem] leading-relaxed text-slate-300">
        ה־API הציבורי של אזעקה: פיד התרעות פיקוד העורף בזמן אמת (WebSocket) והיסטוריית התרעות מלאה
        (REST) — חינם, בלי מפתח ובלי הרשמה. הנתונים הם הפיד הרשמי של פיקוד העורף, מועברים כלשונם
        (verbatim) דרך הממסר שלנו. התיעוד עצמו באנגלית, לקהל המפתחים.
      </p>

      <div dir="ltr" className="text-left">
        <Section title="Terms (read first)">
          <ul className="mt-1.5 list-disc space-y-1 ps-5 text-[0.8125rem] leading-relaxed text-slate-400">
            <li>Free, no API key, no signup.</li>
            <li>
              <b className="text-slate-300">No SLA.</b> This mirrors a public Pikud HaOref feed and can be wrong,
              late, or offline. Do not build life-safety systems on it alone.
            </li>
            <li>
              <b className="text-slate-300">Attribution required:</b>{' '}
              <span className="font-mono text-[0.75rem]">«נתונים: אזעקה azaka.orellius.ai»</span> or{' '}
              <span className="font-mono text-[0.75rem]">"Data: Azaka — azaka.orellius.ai"</span>, visible wherever
              the data is shown.
            </li>
            <li>Be gentle: do not poll any endpoint harder than 1 request/second. Prefer the WebSocket.</li>
            <li>
              Data origin: Pikud HaOref (oref.org.il), passed through verbatim — <code className="font-mono">title</code>{' '}
              and <code className="font-mono">desc</code> are oref's exact Hebrew text, never rewritten.
            </li>
          </ul>
          <P>
            Base URL: <code className="font-mono text-sky-300">{BASE}</code>
          </P>
        </Section>

        <Section title="WebSocket — real-time push">
          <Endpoint method="WS" path="/ws">
            <P>
              Connect to <code className="font-mono">wss://azaka-relay.orellius.ai/ws</code>. The socket is
              receive-only (messages you send are ignored). Three message types, all JSON:
            </P>
            <h4 className="mt-4 font-mono text-[0.75rem] font-semibold text-slate-300">type: "hello" — on connect</h4>
            <Code>{`{ "type": "hello", "activeAreas": ["קריית שמונה", "מטולה"] }`}</Code>
            <Fields
              rows={[
                ['activeAreas', 'string[]', 'Area names currently under alert (seen in the last 15 min, no explicit all-clear yet). Lets you restore state after a reconnect.'],
              ]}
            />
            <h4 className="mt-4 font-mono text-[0.75rem] font-semibold text-slate-300">type: "alert" — a new alert</h4>
            <Code>{`{
  "type": "alert",
  "kind": "active",            // "active" | "early" | "special"
  "id": "134255117960000000",  // oref's own event id, unique
  "cat": "1",                  // oref's live category number (UNRELIABLE — do not classify by it)
  "key": "missilealert",       // our title-based threat key (see below)
  "title": "ירי רקטות וטילים",  // oref's verbatim Hebrew title
  "desc": "היכנסו למרחב המוגן ושהו בו 10 דקות",  // oref's verbatim instruction
  "remain": "tenmin",          // "tenmin" | "release" — official remain-in-shelter policy
  "cities": ["חולון", "בת ים"], // oref area names (keys of /data/cities.json)
  "ts": 1781038201807          // ms epoch, relay receive time
}`}</Code>
            <Fields
              rows={[
                ['kind', 'string', '"active" = rockets/UAV siren; "early" = pre-alert (approach shelter); "special" = terror / non-conventional / earthquake / tsunami / hazmat.'],
                ['key', 'string', 'Threat key classified from the verbatim title: missilealert, uav, terrorattack, nonconventional, earthquakealert1/2, cbrne, tsunami, hazmat, warning, flash.'],
                ['cat', 'string', "oref's live category number. Known to be wrong during events (e.g. live cat 10 carries the all-clear). Always classify by key/title."],
                ['remain', 'string', '"tenmin" = remain in shelter at least 10 minutes; "release" = remain until an explicit official release. Never a countdown to impact.'],
                ['cities', 'string[]', 'Verbatim Hebrew oref area names. Per-area official shelter-entry seconds live in /data/cities.json on the main site (countdown field).'],
              ]}
            />
            <h4 className="mt-4 font-mono text-[0.75rem] font-semibold text-slate-300">type: "clear" — official all-clear</h4>
            <Code>{`{ "type": "clear", "id": "1342551208…", "cat": "10", "cities": ["חולון", "בת ים"], "ts": 1781038493039 }`}</Code>
            <P>
              Emitted only when oref publishes an explicit "האירוע הסתיים" for those areas. Absence of a clear
              message does NOT mean an area is safe.
            </P>
            <h4 className="mt-4 font-mono text-[0.75rem] font-semibold text-slate-300">Minimal client</h4>
            <Code>{`const ws = new WebSocket('wss://azaka-relay.orellius.ai/ws')
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data)
  if (msg.type === 'alert') console.log(msg.kind, msg.title, msg.cities)
  if (msg.type === 'clear') console.log('all-clear', msg.cities)
}
// reconnect with backoff on close; the 'hello' message restores active areas`}</Code>
          </Endpoint>
        </Section>

        <Section title="REST — history & health">
          <P>All endpoints are GET, JSON, CORS-enabled (Access-Control-Allow-Origin: *).</P>
          <Endpoint method="GET" path="/history?limit=200">
            <P>
              Most recent alert/clear events, newest first (default and typical limit 200). Each event has the
              same shape as the WS messages above.
            </P>
            <Code>{`curl '${BASE}/history?limit=5'`}</Code>
          </Endpoint>
          <Endpoint method="GET" path="/history/years">
            <P>
              Years with recorded history: <code className="font-mono">{'{ "years": [{ "year": 2026, "events": 1234 }] }'}</code>{' '}
              (alert events only).
            </P>
          </Endpoint>
          <Endpoint method="GET" path="/history/stats?year=2026">
            <P>
              Server-side aggregates. <code className="font-mono">year</code> is optional (omit for all-time).
            </P>
            <Fields
              rows={[
                ['totalEvents', 'number', 'Alert events (one oref publication, possibly many areas).'],
                ['totalSirens', 'number', 'Sum of areas across events (locality-instances).'],
                ['uniqueCities', 'number', 'Distinct alerted area names.'],
                ['range', '{from,to}', 'ms-epoch bounds of the data, or null.'],
                ['byHour', 'number[24]', 'Events per hour of day (relay local time, Asia/Jerusalem).'],
                ['byDay', 'object', 'YYYY-MM-DD → event count.'],
                ['byType', 'object', 'threat key → event count.'],
                ['byEventSize', 'object', "area-count bucket ('1', '2-5', '6-20', '21-100', '100+') → event count."],
                ['topCities', 'array', '[{ name, count }] top 30 most-alerted areas.'],
              ]}
            />
          </Endpoint>
          <Endpoint method="GET" path="/history/city?name=חולון">
            <P>
              Per-area history (URL-encode the Hebrew oref area name). 404 on unknown names, 400 on bad input.
              Returns <code className="font-mono">{'{ name, total, lastTs, byMonth, byType, recent }'}</code> where{' '}
              <code className="font-mono">recent</code> is the last 20 alert events naming this area, verbatim.
            </P>
            <Code>{`curl '${BASE}/history/city?name=%D7%97%D7%95%D7%9C%D7%95%D7%9F'`}</Code>
          </Endpoint>
          <Endpoint method="GET" path="/history/event?id=134255117960000000">
            <P>
              Single event by oref id: <code className="font-mono">{'{ "event": {…} }'}</code>, 404 if unknown. This backs
              the <code className="font-mono">azaka.orellius.ai/alert/&lt;id&gt;</code> permalinks.
            </P>
          </Endpoint>
          <Endpoint method="GET" path="/health">
            <P>
              <code className="font-mono">{'{ "ok": true, "clients": n, "lastId": "…", "activeAreas": [...] }'}</code> — connected
              WS clients, last seen oref event id, and currently active areas.
            </P>
          </Endpoint>
        </Section>

        <Section title="Honesty notes">
          <ul className="mt-1.5 list-disc space-y-1 ps-5 text-[0.8125rem] leading-relaxed text-slate-400">
            <li>No predicted impact points, no "safe now" signals — the API only carries what oref published.</li>
            <li>History starts when this relay started recording (2026). It is not a complete national archive.</li>
            <li>Area polygons + per-area shelter seconds: <code className="font-mono">azaka.orellius.ai/data/areas.geojson</code> and <code className="font-mono">/data/cities.json</code> (same attribution applies).</li>
          </ul>
        </Section>
      </div>
    </ArchiveShell>
  )
}
