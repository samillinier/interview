'use client'

import Image from 'next/image'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { cn } from '@/lib/utils'

/** Strip typed ellipsis so we can render animated "..." */
function loadingLabelBase(text: string) {
  return text.replace(/(?:\.{3}|…)\s*$/u, '').trimEnd()
}

function BlinkingEllipsis({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex tracking-tighter', className)} aria-hidden>
      {(['0ms', '150ms', '300ms'] as const).map((delay) => (
        <span
          key={delay}
          className="inline-block animate-ellipsis-blink motion-reduce:animate-none"
          style={{ animationDelay: delay }}
        >
          .
        </span>
      ))}
    </span>
  )
}

/** Full-page or section loading: brand logo with heartbeat pulse (replaces circular spinners). Grid-pattern background visible behind loader. Default label is "Loading". */
export function LogoHeartbeatLoader({
  message = 'Loading',
  className,
  size = 88,
  logoClassName,
  messageClassName,
}: {
  message?: string
  className?: string
  size?: number
  logoClassName?: string
  messageClassName?: string
}) {
  const base = message ? loadingLabelBase(message) : ''

  return (
    <div className={cn('w-full min-h-[inherit] grid-pattern flex flex-col items-center justify-center text-center', className)}>
      <div className="relative flex items-center justify-center">
        {/* Visible green heartbeat ring */}
        <span
          aria-hidden
          className="absolute inset-0 m-auto h-[calc(100%+1.25rem)] w-[calc(100%+1.25rem)] rounded-full bg-brand-green/25 animate-heartbeat motion-reduce:animate-pulse"
        />
        <span
          aria-hidden
          className="absolute inset-0 m-auto h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)] rounded-full border-2 border-brand-green/70 animate-heartbeat motion-reduce:animate-none"
          style={{ animationDelay: '80ms' }}
        />
        <div className="relative z-10 animate-heartbeat motion-reduce:animate-pulse">
          <Image
            src={logo}
            alt=""
            width={size}
            height={size}
            className={cn('object-contain drop-shadow-[0_0_10px_rgba(22,163,74,0.55)]', logoClassName)}
            priority
          />
        </div>
      </div>
      {message ? (
        <p
          className={cn('text-slate-600 mt-5 text-sm font-medium', messageClassName)}
          aria-label={`${base}...`}
        >
          {base}
          <BlinkingEllipsis />
        </p>
      ) : null}
    </div>
  )
}
