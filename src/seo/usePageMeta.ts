import { useEffect } from 'react'
import { stripLocale, withLocale } from '../i18n/locale'
import type { Lang } from '../i18n/strings'

// Per-route SEO: sets document.title, meta[name=description], the canonical link, the
// link[rel=alternate][hreflang] set (he unprefixed, en/ar/ru prefixed, x-default = he) and an
// optional robots-noindex while a page is mounted, restoring the index.html defaults on unmount.
// The canonical rewrite is load-bearing: the shipped tag points at "/", and without per-route
// correction Google folds every city/alert page into the homepage. Canonical points at the CURRENT
// locale URL; hreflang is duplicated statically in sitemap.xml because JS-managed hreflang alone is
// weak for crawlers. noindex exists because the static host always answers 200 (no real 404 status),
// so unknown routes/ids can only be kept out of the index with a robots meta.
// Public surface: usePageMeta(title, description, { noindex? }).

const ORIGIN = 'https://azaka.orellius.ai'
const HREFLANGS: Array<{ hreflang: string; lang: Lang }> = [
  { hreflang: 'he', lang: 'he' },
  { hreflang: 'en', lang: 'en' },
  { hreflang: 'ar', lang: 'ar' },
  { hreflang: 'ru', lang: 'ru' },
  { hreflang: 'x-default', lang: 'he' },
]

const DEFAULT_TITLE = document.title
const descTag = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')
const canonTag = () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
const DEFAULT_DESC = descTag()?.content ?? ''
const DEFAULT_CANON = canonTag()?.href ?? ORIGIN + '/'

function setHreflangTags() {
  const route = stripLocale(window.location.pathname).route
  for (const { hreflang, lang } of HREFLANGS) {
    let tag = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`)
    if (!tag) {
      tag = document.createElement('link')
      tag.rel = 'alternate'
      tag.hreflang = hreflang
      document.head.appendChild(tag)
    }
    tag.href = ORIGIN + withLocale(route, lang)
  }
}

function removeHreflangTags() {
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((tag) => tag.remove())
}

function setRobots(noindex: boolean) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
  if (!noindex) {
    tag?.remove() // index.html ships no robots tag; absent = indexable default
    return
  }
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = 'robots'
    document.head.appendChild(tag)
  }
  tag.content = 'noindex'
}

export function usePageMeta(title: string, description: string, opts?: { noindex?: boolean }) {
  const noindex = opts?.noindex ?? false
  useEffect(() => {
    document.title = title
    const tag = descTag()
    if (tag) tag.content = description
    const canon = canonTag()
    if (canon) canon.href = ORIGIN + window.location.pathname
    setHreflangTags()
    setRobots(noindex)
    return () => {
      document.title = DEFAULT_TITLE
      const restore = descTag()
      if (restore) restore.content = DEFAULT_DESC
      const restoreCanon = canonTag()
      if (restoreCanon) restoreCanon.href = DEFAULT_CANON
      removeHreflangTags()
      setRobots(false)
    }
  }, [title, description, noindex])
}
