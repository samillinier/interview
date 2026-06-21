'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  audioBase64?: string
  onPlayAudio?: (base64Audio: string) => void
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isAssistant ? 'self-start' : 'self-end flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'relative w-10 h-10 rounded-full flex-shrink-0 overflow-hidden',
          isAssistant ? 'ring-2 ring-brand-green/20' : 'bg-brand-green/20 ring-2 ring-brand-green/30 flex items-center justify-center'
        )}
      >
        {isAssistant ? (
          <Image
            src="/alice-interviewer.png"
            alt="Alice, AI interviewer"
            fill
            sizes="40px"
            className="object-cover [object-position:75%_24%]"
          />
        ) : (
          <User className="w-5 h-5 text-brand-green" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3',
          isAssistant
            ? 'bg-primary-100 text-primary-900 rounded-tl-none'
            : 'bg-brand-green text-white rounded-tr-none'
        )}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <p
            className={cn(
              'text-xs mt-1',
              isAssistant ? 'text-primary-400' : 'text-white'
            )}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </motion.div>
  )
}
