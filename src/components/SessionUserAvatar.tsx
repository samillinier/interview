'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  src?: string | null
  name?: string | null
  email?: string | null
  className?: string
  size?: number
  fallbackClassName?: string
}

export function SessionUserAvatar({
  src,
  name,
  email,
  className,
  size = 40,
  fallbackClassName,
}: Props) {
  const [failed, setFailed] = useState(false)
  const initial = (name?.trim()?.[0] || email?.trim()?.[0] || 'U').toUpperCase()
  const showImage = Boolean(src?.trim()) && !failed

  if (!showImage) {
    return (
      <div
        className={cn(
          'rounded-full bg-brand-green flex items-center justify-center text-white font-semibold shrink-0',
          fallbackClassName,
          className
        )}
        style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.38)) }}
        aria-hidden
      >
        {initial !== 'U' ? (
          initial
        ) : (
          <User className="text-white" style={{ width: size * 0.45, height: size * 0.45 }} />
        )}
      </div>
    )
  }

  return (
    // Native img — works for /api/auth/profile-photo and Microsoft Graph URLs without Next/Image quirks
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src!}
      alt={name || email || 'Profile'}
      width={size}
      height={size}
      className={cn('rounded-full object-cover shrink-0', className)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
    />
  )
}
