import { LANGS } from './strings'
import { useLang } from './useLang'

// Language chips for the top of the command panel. Each chip switches the whole app language + dir.
// Presentation only; state lives in useLang.

export function LangChips() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1.5" role="group" aria-label="Language">
      {LANGS.map((l) => {
        const active = l.code === lang
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={active}
            onClick={() => setLang(l.code)}
            className={`rounded-md border px-3 py-1.5 text-[0.75rem] font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${
              active
                ? 'border-cyan-400/50 bg-card-hover text-cyan-300'
                : 'border-white/[0.08] bg-card text-fg-muted hover:border-white/[0.14] hover:bg-card-hover hover:text-fg'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
