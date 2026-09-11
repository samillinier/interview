'use client'

type Props = {
  onClick: () => void
  label?: string
  ariaLabel?: string
  className?: string
  unreadCount?: number
  zClass?: string
  variant?: 'green' | 'white'
}

export function ChatLauncherButton({
  onClick,
  label = 'Chat',
  ariaLabel = 'Open chat',
  className = 'bottom-4 right-4',
  unreadCount = 0,
  zClass = 'z-40',
  variant = 'green',
}: Props) {
  const isWhite = variant === 'white'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`fixed ${className} ${zClass} inline-flex items-center rounded-full py-1.5 pl-5 pr-1.5 ${
        isWhite
          ? 'bg-white text-brand-green shadow-[0_10px_28px_rgba(15,23,42,0.18)] hover:bg-slate-50'
          : 'bg-brand-green text-white shadow-[0_10px_28px_rgba(74,124,35,0.38)] hover:bg-brand-green-dark'
      }`}
    >
      <span className="absolute -bottom-0.5 left-2 h-3.5 w-3.5 rounded-full border-[2.5px] border-white bg-[#4ADE80]" />
      <span className="pr-3 text-[17px] font-semibold tracking-tight">{label}</span>
      <span
        className={`relative flex h-11 w-11 items-center justify-center rounded-full ${
          isWhite ? 'bg-brand-green/15' : 'bg-white/20'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-6 w-6 ${isWhite ? 'text-brand-green' : 'text-white'}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
        </svg>
        {unreadCount > 0 ? (
          <span
            className={`absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-4 ${
              isWhite ? 'bg-brand-green text-white' : 'bg-white text-brand-green'
            }`}
          >
            {unreadCount}
          </span>
        ) : null}
      </span>
    </button>
  )
}
