import { useEffect, useState } from 'react'

// Minimal History-API router (real paths, not hash fragments). Two routes today: "/" (live map) and
// "/historical" (stats). navigate() pushes a path and notifies listeners; useRoute() tracks it. A
// public/_redirects rule serves index.html for these paths on a static host.
export function navigate(path: string) {
  if (path === window.location.pathname) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function useRoute(): string {
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onChange)
    return () => window.removeEventListener('popstate', onChange)
  }, [])
  return path
}
