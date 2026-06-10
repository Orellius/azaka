// Smoke test for the pure parts of relay/telegram*.ts. Never calls the real Telegram API: it
// re-spawns itself with TELEGRAM_TOKEN_FILE pointing nowhere (telegramInit() must take the disabled
// path) and BRAVE_PATH pointing at a missing binary (renderSnapshot must return null, not throw).
// Run: bun relay/telegram.smoke.ts
import { readFileSync } from 'node:fs'
import {
  TokenBucket,
  fitCities,
  formatChannelPost,
  formatDm,
  handleCommand,
  loadSubs,
  parseCommand,
  saveSubs,
  telegramInit,
  telegramNotify,
  type RelayEvent,
} from './telegram'
import {
  OPEN_WINDOW_MS,
  absorb,
  closeOnClear,
  dmDelta,
  formatPhotoCaption,
  newOpen,
  pruneOpen,
} from './telegram-events'
import { renderSnapshot, snapshotUrl } from './telegram-render'

if (!Bun.env.AZAKA_SMOKE_CHILD) {
  const child = Bun.spawnSync(['bun', import.meta.path], {
    env: {
      ...process.env,
      AZAKA_SMOKE_CHILD: '1',
      TELEGRAM_TOKEN_FILE: '/tmp/azaka-no-such-token',
      BRAVE_PATH: '/tmp/azaka-no-such-brave',
    },
    stdout: 'inherit',
    stderr: 'inherit',
  })
  process.exit(child.exitCode ?? 1)
}

let failures = 0
const check = (name: string, cond: boolean) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
  if (!cond) failures++
}

// 1. token-absent path: disabled, no crash, notify is a no-op
telegramInit()
telegramNotify({ type: 'alert', kind: 'active', id: 'x', cities: ['חולון'], ts: Date.now() })
check('init+notify with no token: no crash', true)

// 2. command parsing
check('parse /start', JSON.stringify(parseCommand('/start')) === '{"cmd":"start","arg":""}')
check('parse /add with arg', JSON.stringify(parseCommand('/add חולון')) === '{"cmd":"add","arg":"חולון"}')
check('parse /add@Bot suffix', parseCommand('/add@AzakaBot בת ים')?.arg === 'בת ים')
check('parse garbage -> null', parseCommand('hello') === null && parseCommand('/nope x') === null)
check('parse multiword arg', parseCommand('/add תל אביב - מרכז העיר')?.arg === 'תל אביב - מרכז העיר')

// 3. subscription flow via handleCommand (uses real cities.json keys)
const store = new Map<string, string[]>()
const r1 = handleCommand('111', '/add חולון', store)
check('add exact city', r1 !== null && r1.includes('חולון') && store.get('111')?.includes('חולון') === true)
const r2 = handleCommand('111', '/add חול', store)
check('add miss suggests up to 5', r2 !== null && r2.includes('אולי התכוונתם') && (r2.match(/•/g) ?? []).length <= 5)
const r3 = handleCommand('111', '/list', store)
check('list shows city', r3 !== null && r3.includes('חולון'))
handleCommand('111', '/remove חולון', store)
check('remove deletes entry', !store.has('111'))
handleCommand('111', '/add בת ים', store)
handleCommand('111', '/stop', store)
check('stop clears chat', !store.has('111'))

// 4. store round-trip
const tmp = '/tmp/azaka-subs-test.json'
const subs = new Map([['42', ['חולון', 'בת ים']]])
check('saveSubs ok', saveSubs(subs, tmp))
const back = loadSubs(tmp)
check('loadSubs round-trip', JSON.stringify(back.get('42')) === JSON.stringify(['חולון', 'בת ים']))
check('loadSubs missing file -> empty', loadSubs('/tmp/azaka-no-such-file.json').size === 0)

// 5. rate-bucket math: 25 at t0, 26th fails, refilled after 1s
const t0 = 1_000_000
const b = new TokenBucket(25, 25, t0)
let took = 0
for (let i = 0; i < 30; i++) if (b.take(t0)) took++
check('bucket allows exactly 25 at t0', took === 25)
check('bucket refills after 1s', b.take(t0 + 1000) && (() => { let n = 1; while (b.take(t0 + 1000)) n++; return n === 25 })())

// 6. formatting with a REAL event from the history log
const lines = readFileSync(new URL('./data/history-2026.jsonl', import.meta.url).pathname, 'utf8').trim().split('\n')
const real = lines.map((l) => JSON.parse(l) as RelayEvent).find((e) => e.type === 'alert')!
const post = formatChannelPost(real)
check('real alert: verbatim title bold', post.includes(`<b>${real.title}</b>`))
check('real alert: verbatim desc present', post.includes(real.desc!))
check('real alert: emoji + permalink', /^[🔴🟠]/u.test(post) && post.includes(`https://azaka.orellius.ai/alert/${real.id}`))
check('real alert: all cities listed', real.cities.every((c) => post.includes(c)))
check('real alert: under 4096', post.length <= 4096)

// clear event formatting
const clear = lines.map((l) => JSON.parse(l) as RelayEvent).find((e) => e.type === 'clear')
if (clear) {
  const cp = formatChannelPost(clear)
  check('clear: green + fallback title', cp.startsWith('🟢') && cp.includes('האירוע הסתיים'))
}

// >60-cities truncation: real area names from cities.json
const cityNames = Object.keys(
  JSON.parse(readFileSync(new URL('../public/data/cities.json', import.meta.url).pathname, 'utf8')).cities,
) as string[]
const big: RelayEvent = { ...real, cities: cityNames.slice(0, 200) }
const bigPost = formatChannelPost(big)
check('>60 cities: shows count + "ועוד N"', bigPost.includes('200 אזורים') && /ועוד \d+/.test(bigPost))
check('>60 cities: under 4096', bigPost.length <= 4096)
check('>60 cities: title/desc never truncated', bigPost.includes(`<b>${real.title}</b>`) && bigPost.includes(real.desc!))
check('fitCities small list verbatim', fitCities(['חולון', 'בת ים'], 4000) === 'חולון, בת ים')

// 7. DM formatting with official seconds
const dm = formatDm(real, [real.cities[0]], () => 90)
check('dm: title + matched city + seconds + link', dm.includes(`<b>${real.title}</b>`) && dm.includes(real.cities[0]) && dm.includes('90 שניות') && dm.includes(real.id))
const dmClear = formatDm({ ...real, type: 'clear', title: undefined }, [real.cities[0]], () => 90)
check('dm clear: no seconds line', !dmClear.includes('שניות') && dmClear.startsWith('🟢'))

// HTML escaping
const evil: RelayEvent = { type: 'alert', kind: 'active', id: 'e<1>', title: 'a<b>&c', desc: 'd', cities: ['x'], ts: 0 }
check('html escaped in title', formatChannelPost(evil).includes('a&lt;b&gt;&amp;c'))

// 8. open-event model (edit-on-update stacking)
const now = Date.now()
const open = newOpen({ id: 'a1', kind: 'active', title: 'ירי רקטות וטילים', desc: 'd', cities: ['חולון', 'בת ים'], ts: now })
check('newOpen: key=title, cities set, edit anchored to post ts', open.key === 'ירי רקטות וטילים' && open.cities.size === 2 && open.lastEditTs === now)
check('absorb: returns only new cities', JSON.stringify(absorb(open, ['בת ים', 'רעננה'])) === JSON.stringify(['רעננה']) && open.cities.size === 3)
check('absorb again: nothing new', absorb(open, ['רעננה']).length === 0)

// 9. delta DMs: each (chat, city) pair fires once per event
check('dmDelta first: all matched', JSON.stringify(dmDelta(open, '42', ['חולון', 'רעננה'])) === JSON.stringify(['חולון', 'רעננה']))
check('dmDelta repeat: empty', dmDelta(open, '42', ['חולון', 'רעננה']).length === 0)
check('dmDelta other chat: independent', JSON.stringify(dmDelta(open, '43', ['חולון'])) === JSON.stringify(['חולון']))

// 10. window close: 30-min prune + matching all-clear
const events = new Map([[open.key, open]])
check('pruneOpen keeps in-window', pruneOpen(events, now + OPEN_WINDOW_MS).length === 0 && events.size === 1)
check('pruneOpen drops expired', pruneOpen(events, now + OPEN_WINDOW_MS + 1)[0] === open && events.size === 0)
const open2 = newOpen({ id: 'a2', kind: 'early', title: 'בדקות הקרובות', cities: ['רעננה'], ts: now })
const events2 = new Map([[open.key, open], [open2.key, open2]])
check('closeOnClear: only overlapping events close', closeOnClear(events2, ['חולון'])[0] === open && events2.size === 1 && events2.has(open2.key))

// 11. photo caption: title + permalink, hard 200 cap
const cap = formatPhotoCaption('ירי רקטות וטילים', 'id-1')
check('caption: title + permalink', cap.includes('ירי רקטות וטילים') && cap.includes('https://azaka.orellius.ai/alert/id-1'))
const longCap = formatPhotoCaption('א'.repeat(500), 'id-2')
check('caption: capped at 200 with link intact', longCap.length <= 200 && longCap.includes('/alert/id-2'))

// 12. snapshot renderer: URL shape + errors-as-values
const u = snapshotUrl(['חולון', 'בת ים'], 'early', 'http://x')
check('snapshotUrl: pipe-delimited + kind', u.startsWith('http://x/snapshot?cities=') && u.includes('%7C') && u.endsWith('&kind=early'))
check('renderSnapshot: empty cities -> null', (await renderSnapshot([], 'active')) === null)
check('renderSnapshot: missing binary -> null, no throw', (await renderSnapshot(['חולון'], 'active')) === null)

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS')
process.exit(failures ? 1 : 0)
