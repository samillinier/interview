'use client'

import { motion } from 'framer-motion'

interface SpeakingAnimationProps {
  isActive: boolean
}

export default function SpeakingAnimation({ isActive }: SpeakingAnimationProps) {
  if (!isActive) return null

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-brand-green rounded-full"
          animate={{
            height: ['12px', '32px', '12px'],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

