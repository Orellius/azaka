import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../i18n/useLang'
import { useAreaName } from '../i18n/areaNames'
import { usePageMeta } from '../seo/usePageMeta'
import { ArchiveShell, SpaLink } from './ArchiveShell'

// Cities index (/cities): every oref area from public/data/cities.json, grouped alphabetically by the
// Hebrew name, each a real <a> to its /city/ page. This is the crawl path into the per-city archive,
// so the links must be plain anchors (SpaLink), not buttons. Names stay Hebrew in the URL by design
// (Hebrew SEO); the display name is localized for non-Hebrew readers.
// Public surface: <CitiesIndexPage />.

type Load = { s: 'loading' } | { s: 'error' } | { s: 'ok'; names: string[] }

export function CitiesIndexPage() {
  const { t } = useLang()
  const localizeArea = useAreaName()
  const [load, setLoad] = useState<Load>({ s: 'loading' })

  usePageMeta(t('cities_meta_title'), t('cities_meta_desc'))

  useEffect(() => {
    let alive = true
    fetch('/data/cities.json')
      .then((r) => r.json())
      .then((d: { cities: Record<string, unknown> }) => {
        if (!alive) return
        setLoad({ s: 'ok', names: Object.keys(d.cities).sort((a, b) => a.localeCompare(b, 'he')) })
      })
      .catch(() => alive && setLoad({ s: 'error' }))
    return () => {
      alive = false
    }
  }, [])

  const groups = useMemo(() => {
    if (load.s !== 'ok') return []
    const byLetter = new Map<string, string[]>()
    for (const name of load.names) {
      const letter = name.charAt(0)
      const bucket = byLetter.get(letter)
      if (bucket) bucket.push(name)
      else byLetter.set(letter, [name])
    }
    return [...byLetter.entries()]
  }, [load])

  return (
    <ArchiveShell>
      <h1 className="text-2xl font-bold tracking-tight text-white">{t('cities_title')}</h1>
      <p className="mt-2 text-[0.875rem] leading-relaxed text-fg-muted">{t('cities_sub')}</p>

      {load.s === 'loading' && <p className="mt-7 text-[0.8125rem] text-fg-muted">{t('hist_loading')}</p>}
      {load.s === 'error' && <p className="mt-7 text-[0.8125rem] text-rose-300">{t('picker_failed')}</p>}

      {load.s === 'ok' && (
        <div className="mt-7 flex flex-col gap-6">
          {groups.map(([letter, names]) => (
            <section key={letter}>
              <h2 className="text-[1.0625rem] font-bold text-white">{letter}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {names.map((name) => (
                  <SpaLink
                    key={name}
                    href={`/city/${encodeURIComponent(name)}`}
                    className="rounded-md border border-white/[0.08] bg-card px-2 py-1 text-[0.75rem] text-fg-muted transition hover:bg-card-hover hover:text-white"
                  >
                    {localizeArea(name)}
                  </SpaLink>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </ArchiveShell>
  )
}
