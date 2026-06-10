import { useEffect } from 'react'

// Per-route SEO: sets document.title, meta[name=description] AND the canonical link while a page is
// mounted, restoring the index.html defaults on unmount. The canonical rewrite is load-bearing: the
// shipped tag points at "/", and without per-route correction Google folds every city/alert page
// into the homepage. Public surface: usePageMeta(title, description).

const DEFAULT_TITLE = document.title
const descTag = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')
const canonTag = () => document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
const DEFAULT_DESC = descTag()?.content ?? ''
const DEFAULT_CANON = canonTag()?.href ?? 'https://azaka.orellius.ai/'

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const tag = descTag()
    if (tag) tag.content = description
    const canon = canonTag()
    if (canon) canon.href = 'https://azaka.orellius.ai' + window.location.pathname
    return () => {
      document.title = DEFAULT_TITLE
      const restore = descTag()
      if (restore) restore.content = DEFAULT_DESC
      const restoreCanon = canonTag()
      if (restoreCanon) restoreCanon.href = DEFAULT_CANON
    }
  }, [title, description])
}
