// Map snapshot renderer for Telegram channel posts: spawns headless Brave on the frontend's
// /snapshot route (paints the given cities in their tier, titles SNAPSHOT_READY once the map fitted
// and settled) and captures a PNG over CDP. Public surface: renderSnapshot(cities, kind) -> PNG path
// in /tmp | null, snapshotUrl(cities, kind). Why CDP and not --screenshot: --virtual-time-budget
// hangs indefinitely on this page (verified 2026-06-10, Brave/mac), so we poll document.title and
// call Page.captureScreenshot instead. Errors are values: missing binary, timeout, or a blank render
// (<20KB; real maps are ~300KB) all return null and the caller posts text-only — this module never
// throws and is only invoked AFTER the text alert is enqueued, so it can never delay it.
// NOT responsible for: Telegram I/O, captions, retries. Test: relay/telegram.smoke.ts (bad binary,
// empty cities -> null) + a live render against `vite preview` in dev.
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SNAPSHOT_BASE = Bun.env.SNAPSHOT_BASE ?? 'https://azaka.orellius.ai'
const BRAVE = Bun.env.BRAVE_PATH ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'
const TIMEOUT_MS = 20_000 // hard wall-clock cap on the whole render
const SOFT_MS = 15_000 // if SNAPSHOT_READY never shows, screenshot anyway and let the size gate judge
const MIN_BYTES = 20_000 // blank/failed renders are a few KB; a painted map is ~300KB

export function snapshotUrl(cities: string[], kind: string, base = SNAPSHOT_BASE): string {
  // pipe-delimited: real area names contain commas (e.g. "שדרות, איבים")
  return `${base}/snapshot?cities=${encodeURIComponent(cities.join('|'))}&kind=${encodeURIComponent(kind)}`
}

export async function renderSnapshot(cities: string[], kind: string): Promise<string | null> {
  if (cities.length === 0) return null
  // fresh profile dir + port 0: never collides with a running Brave or a concurrent render
  let profile: string | null = null
  let proc: ReturnType<typeof Bun.spawn> | null = null
  try {
    profile = mkdtempSync(join(tmpdir(), 'azaka-brave-'))
    proc = Bun.spawn(
      [
        BRAVE,
        '--headless',
        '--disable-gpu',
        '--enable-unsafe-swiftshader', // software WebGL fallback when no GPU surface exists
        '--no-first-run',
        '--no-default-browser-check',
        '--hide-scrollbars',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        '--window-size=900,700',
        snapshotUrl(cities, kind),
      ],
      { stdout: 'ignore', stderr: 'pipe' },
    )
    // the kill in finally closes stderr/websocket, so a timed-out capture() unblocks immediately
    const png = await Promise.race([capture(proc.stderr as ReadableStream<Uint8Array>), Bun.sleep(TIMEOUT_MS).then(() => null)])
    if (png === null) console.error('[telegram] snapshot render: timed out or blank, skipping image')
    return png
  } catch (err) {
    console.error('[telegram] snapshot render:', (err as Error).message)
    return null
  } finally {
    try {
      proc?.kill()
    } catch {
      // already dead
    }
    if (profile) {
      try {
        rmSync(profile, { recursive: true, force: true })
      } catch {
        // best-effort; a leftover dir in /tmp is harmless
      }
    }
  }
}

// Brave prints "DevTools listening on ws://127.0.0.1:<port>/..." to stderr once the port is bound.
async function devtoolsPort(stderr: ReadableStream<Uint8Array>): Promise<number> {
  const reader = stderr.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) throw new Error('brave exited before DevTools came up')
    buf += decoder.decode(value)
    const m = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(buf)
    if (m) {
      void reader.cancel().catch(() => {})
      return Number(m[1])
    }
  }
}

async function capture(stderr: ReadableStream<Uint8Array>): Promise<string | null> {
  const port = await devtoolsPort(stderr)
  // the page target appears once the renderer is up; /json/list briefly 404s before that
  let pageWs: string | undefined
  while (!pageWs) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as Array<{
        type: string
        url: string
        webSocketDebuggerUrl?: string
      }>
      pageWs = list.find((t) => t.type === 'page' && t.url.includes('/snapshot'))?.webSocketDebuggerUrl
    } catch {
      // devtools http not ready yet
    }
    if (!pageWs) await Bun.sleep(250)
  }

  const ws = new WebSocket(pageWs)
  let seq = 0
  const pending = new Map<number, (v: unknown) => void>()
  ws.onmessage = (e) => {
    const m = JSON.parse(String(e.data)) as { id?: number; result?: unknown }
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)!(m.result)
      pending.delete(m.id)
    }
  }
  const send = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<unknown>((resolve) => {
      const id = ++seq
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
    ws.onclose = reject // proc killed by the outer timeout
  })
  // --window-size includes window chrome (900x700 yields a 900x567 viewport); force the real size
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 700, deviceScaleFactor: 1, mobile: false })

  const t0 = Date.now()
  while (Date.now() - t0 < SOFT_MS) {
    const res = (await send('Runtime.evaluate', { expression: 'document.title', returnByValue: true })) as
      | { result?: { value?: string } }
      | undefined
    if (res?.result?.value === 'SNAPSHOT_READY') break
    await Bun.sleep(300)
  }

  const shot = (await send('Page.captureScreenshot', { format: 'png' })) as { data?: string } | undefined
  ws.close()
  if (!shot?.data) return null
  const bytes = Buffer.from(shot.data, 'base64')
  if (bytes.length < MIN_BYTES) return null
  const out = join(tmpdir(), `azaka-snap-${Date.now()}-${Math.random().toString(36).slice(2)}.png`)
  await Bun.write(out, bytes)
  return out
}
