'use client'

import { motion } from 'framer-motion'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export default function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const isAssistant = role === 'assistant'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 max-w-[85%]',
        isAssistant ? 'self-start' : 'self-end flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isAssistant ? 'bg-brand-green' : 'bg-primary-100'
        )}
      >
        {isAssistant ? (
          <Bot className="w-5 h-5 text-white" />
        ) : (
          <User className="w-5 h-5 text-primary-600" />
        )}
      </div>

      {/* Message */}
      <div
        className={cn(
          'rounded-2xl px-4 py-3',
          isAssistant
            ? 'bg-primary-100 text-primary-900 rounded-tl-none'
            : 'bg-primary-900 text-white rounded-tr-none'
        )}
      >
        <p className="text-sm leading-relaxed">{content}</p>
        {timestamp && (
          <p
            className={cn(
              'text-xs mt-1',
              isAssistant ? 'text-primary-400' : 'text-primary-300'
            )}
          >
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </motion.div>
  )
}

