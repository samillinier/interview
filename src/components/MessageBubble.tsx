'use client'

import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import interviewerImage from '@/images/27f1f909-0d63-4757-88e4-0e76f939f363.jpeg'

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
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden',
          isAssistant ? 'bg-brand-green ring-2 ring-brand-green/20' : 'bg-primary-100'
        )}
      >
        {isAssistant ? (
          <Image
            src={interviewerImage}
            alt="Interviewer"
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
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
