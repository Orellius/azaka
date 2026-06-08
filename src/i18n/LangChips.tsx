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
            className={`rounded-md border px-3 py-1.5 text-[0.75rem] font-medium shadow-sm shadow-black/30 transition ${
              active
                ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
            }`}
          >
            {l.label}
          </button>
        )
      })}
    </div>
  )
}
