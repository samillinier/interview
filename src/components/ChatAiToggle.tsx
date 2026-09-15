'use client'

type ChatAiToggleProps = {
  enabled: boolean
  onChange: (next: boolean) => void
  variant?: 'light' | 'dark'
  label?: string
  title?: string
}

export function ChatAiToggle({
  enabled,
  onChange,
  variant = 'dark',
  label = 'Alice',
  title,
}: ChatAiToggleProps) {
  const light = variant === 'light'
  return (
    <div
      className="inline-flex flex-shrink-0 items-center gap-2"
      title={
        title ||
        (enabled ? 'Turn Alice off and take over this chat' : 'Turn Alice back on')
      }
    >
      {label ? (
        <span className={`text-[11px] font-semibold ${light ? 'text-white/90' : 'text-slate-500'}`}>
          {label}
        </span>
      ) : null}
      <div
        role="group"
        aria-label={label || 'Alice'}
        className={`relative grid grid-cols-2 rounded-lg p-0.5 text-[11px] font-semibold ${
          light ? 'bg-black/20' : 'bg-slate-100'
        }`}
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] rounded-md shadow-sm transition-all duration-200 ${
            enabled
              ? `left-0.5 ${light ? 'bg-white' : 'bg-brand-green'}`
              : `left-auto right-0.5 ${light ? 'bg-white/80' : 'bg-slate-400'}`
          }`}
        />
        <button
          type="button"
          role="radio"
          aria-checked={enabled}
          onClick={() => {
            if (!enabled) onChange(true)
          }}
          className={`relative z-10 min-w-[2.25rem] px-2 py-1 transition-colors ${
            enabled
              ? light
                ? 'text-brand-green'
                : 'text-white'
              : light
                ? 'text-white/70'
                : 'text-slate-500'
          }`}
        >
          On
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!enabled}
          onClick={() => {
            if (enabled) onChange(false)
          }}
          className={`relative z-10 min-w-[2.25rem] px-2 py-1 transition-colors ${
            !enabled
              ? light
                ? 'text-slate-700'
                : 'text-white'
              : light
                ? 'text-white/70'
                : 'text-slate-500'
          }`}
        >
          Off
        </button>
      </div>
    </div>
  )
}
