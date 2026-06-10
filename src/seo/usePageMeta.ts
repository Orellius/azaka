import { useEffect } from 'react'

// Per-route SEO: sets document.title + meta[name=description] while a page is mounted and restores
// the index.html defaults on unmount, so the live map keeps its shipped meta when navigating back.
// Public surface: usePageMeta(title, description).

const DEFAULT_TITLE = document.title
const descTag = () => document.querySelector<HTMLMetaElement>('meta[name="description"]')
const DEFAULT_DESC = descTag()?.content ?? ''

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const tag = descTag()
    if (tag) tag.content = description
    return () => {
      document.title = DEFAULT_TITLE
      const restore = descTag()
      if (restore) restore.content = DEFAULT_DESC
    }
  }, [title, description])
}
