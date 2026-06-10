import { useEffect, useRef, useState, type ReactNode } from 'react'
import { navigate } from './router'
import { isAlertingNow, subscribeAlerting } from './consent/consentStore'
import { useLang } from './i18n/useLang'
import { OverlayCtx } from './overlayContext'

// Route-as-overlay presentation: when the user navigates IN-APP from the live map to a content page,
// App.tsx keeps <MapDashboard /> mounted and renders the page inside this fixed sheet above it (URLs
// stay real; a direct load still renders the page standalone, no map chunk). Owns: the scrim, the
// slide-up sheet, close via X / Escape / scrim click (history.back() when the previous entry is
// in-session — router marks its pushes — else navigate('/')), focus-on-open + restore-on-close, and
// the SAFETY auto-yield: the moment an alert goes live (consentStore alerting bus) the overlay leaves
// for the map so instructions are never covered. Page shells call useInOverlay() (overlayContext.ts)
// to swap their h-screen root for h-full and drop the redundant back-to-map link. NOT responsible
// for: route matching (App.tsx) or page SEO (usePageMeta runs inside the pages as usual).

// back to the map: pop the entry the router pushed in-session, else hard-route home (direct-ish entry)
function closeOverlay() {
  if (window.history.state?.inApp) window.history.back()
  else navigate('/')
}

export function RouteOverlay({ children }: { children: ReactNode }) {
  const { t } = useLang()
  const sheetRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  // enter animation: first paint off-screen/transparent, next frame slide+fade in (a11y-motion kills it)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // focus the sheet on open; hand focus back to the opener on close (it survives — the map stays mounted)
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    sheetRef.current?.focus()
    return () => opener?.focus()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // SAFETY auto-yield: a live alert must never sit behind a content page. navigate('/') (not back())
  // guarantees landing on the map even if the previous history entry is another overlay route.
  useEffect(() => {
    if (isAlertingNow()) {
      navigate('/')
      return
    }
    return subscribeAlerting(() => {
      if (isAlertingNow()) navigate('/')
    })
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:py-7">
      <div
        aria-hidden
        onClick={closeOverlay}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-[250ms] ease-out ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`relative h-full max-h-[calc(100vh-3.5rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-white/[0.08] bg-surface shadow-2xl shadow-black/60 outline-none transition-[transform,opacity] duration-[250ms] ease-out ${shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
      >
        <button
          type="button"
          onClick={closeOverlay}
          aria-label={t('close')}
          className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-card text-fg-muted transition hover:bg-card-hover hover:text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <OverlayCtx.Provider value={true}>{children}</OverlayCtx.Provider>
      </div>
    </div>
  )
}
