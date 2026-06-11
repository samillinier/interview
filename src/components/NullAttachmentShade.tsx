import { NULL_ATTACHMENT_HATCH_STYLE } from '@/lib/nullAttachmentStyle'

type NullAttachmentShadeProps = {
  /** sm = matrix icon; md = matrix cell; lg = profile attachment panel */
  size?: 'sm' | 'md' | 'lg'
  className?: string
  title?: string
  /** Profile panel — caption under NULL label */
  showCaption?: boolean
}

const WRAPPER_SIZE = {
  sm: 'min-h-[1.1rem] min-w-[2rem] rounded-md px-1',
  md: 'min-h-[1.45rem] min-w-[2.65rem] rounded-lg px-1.5',
  lg: 'min-h-[5.5rem] w-full rounded-xl px-4 py-5',
} as const

const LABEL_SIZE = {
  sm: 'text-[7px] tracking-wide',
  md: 'text-[9px] tracking-wide',
  lg: 'text-lg tracking-[0.28em]',
} as const

export function NullAttachmentShade({
  size = 'md',
  className = '',
  title = 'Not required (NULL)',
  showCaption = size === 'lg',
}: NullAttachmentShadeProps) {
  return (
    <span
      className={`relative inline-flex flex-col items-center justify-center gap-1 border border-emerald-200/80 bg-emerald-50/90 shadow-sm ${WRAPPER_SIZE[size]} ${className}`}
      title={title}
      role="status"
      aria-label={title}
    >
      <span
        className="absolute inset-0 rounded-[inherit] pointer-events-none opacity-90"
        style={NULL_ATTACHMENT_HATCH_STYLE}
        aria-hidden
      />
      <span
        className={`relative z-10 font-semibold text-emerald-700 ${LABEL_SIZE[size]} ${
          size === 'lg' ? 'pl-[0.28em]' : ''
        }`}
      >
        NULL
      </span>
      {showCaption ? (
        <span className="relative z-10 text-[11px] font-medium text-slate-500 text-center">
          Not needed — no file required
        </span>
      ) : null}
    </span>
  )
}
