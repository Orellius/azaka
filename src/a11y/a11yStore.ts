// Accessibility preferences (Israeli regulation / IS 5568, WCAG 2.0 AA aid): persisted in localStorage
// and applied as classes on <html> so plain CSS in index.css does the actual work. Non-component
// module (mirrors consentStore) so the widget stays a pure component and startup can re-apply saved
// prefs before first paint.
export type A11yPrefs = { text: 0 | 1 | 2; contrast: boolean; links: boolean; motion: boolean }

const KEY = 'azaka_a11y'

export const DEFAULT_PREFS: A11yPrefs = { text: 0, contrast: false, links: false, motion: false }

export function loadPrefs(): A11yPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_PREFS
    const p = JSON.parse(raw) as Partial<A11yPrefs>
    return {
      text: p.text === 1 || p.text === 2 ? p.text : 0,
      contrast: p.contrast === true,
      links: p.links === true,
      motion: p.motion === true,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(p: A11yPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage disabled: prefs still apply for this session
  }
}

export function apply(p: A11yPrefs) {
  const cl = document.documentElement.classList
  cl.toggle('a11y-text-1', p.text === 1)
  cl.toggle('a11y-text-2', p.text === 2)
  cl.toggle('a11y-contrast', p.contrast)
  cl.toggle('a11y-links', p.links)
  cl.toggle('a11y-motion', p.motion)
}

export function loadAndApply() {
  apply(loadPrefs())
}
