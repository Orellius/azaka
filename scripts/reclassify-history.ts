// Re-classify persisted history by oref's verbatim TITLE. The early relay trusted the live `cat`
// number, which is unreliable (a "האירוע הסתיים" all-clear came through as live cat 10 = terrorattack
// and got logged as a terror alert). This rewrites each relay/data/history-YYYY.jsonl in place with
// the corrected type/kind/key. Events with no title (the original clear records) are left untouched.
// Run: bun scripts/reclassify-history.ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { classifyAlert } from '../src/alerts/categories'

const dir = 'relay/data'
const files = readdirSync(dir).filter((f) => /^history-\d{4}\.jsonl$/.test(f))

for (const f of files) {
  const path = `${dir}/${f}`
  const lines = readFileSync(path, 'utf8').trim().split('\n').filter(Boolean)
  let changed = 0

  const out = lines.map((line) => {
    let ev: Record<string, unknown>
    try {
      ev = JSON.parse(line)
    } catch {
      return line
    }
    const title = String(ev.title ?? '')
    if (!title) return JSON.stringify(ev) // original clear records have no title; leave as-is

    const before = JSON.stringify(ev)
    const cls = classifyAlert(title, String(ev.desc ?? ''))
    if (cls.severity === 'cleared') {
      ev.type = 'clear'
      ev.key = 'update'
      delete ev.kind
    } else if (!cls.isThreat) {
      ev.type = 'skip' // memorial/drill mis-logged as alert; excluded from stats
      ev.key = cls.key
    } else {
      ev.type = 'alert'
      ev.key = cls.key
      ev.kind = cls.severity === 'early' ? 'early' : cls.severity === 'special' ? 'special' : 'active'
    }
    if (JSON.stringify(ev) !== before) changed++
    return JSON.stringify(ev)
  })

  writeFileSync(path, out.join('\n') + '\n')
  console.log(`${f}: ${lines.length} events, ${changed} reclassified`)
}
