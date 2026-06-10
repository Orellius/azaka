import { createContext, useContext } from 'react'

// Overlay-presentation context, kept out of RouteOverlay.tsx so React fast-refresh works (a .tsx may
// only export components). RouteOverlay provides true; page shells read it via useInOverlay() to size
// to the sheet instead of the viewport and drop their redundant back-to-map links.
export const OverlayCtx = createContext(false)

export function useInOverlay(): boolean {
  return useContext(OverlayCtx)
}
