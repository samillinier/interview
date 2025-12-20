'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Sparkles } from 'lucide-react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import teamImage from '@/images/freepik_br_e1727cfa-604b-4a3f-becf-722dc82dc811.png'

const rotatingWords = [
  { text: 'Automate', color: 'text-brand-green' },
  { text: 'Excel', color: 'text-brand-yellow' },
  { text: 'Upgrade', color: 'text-brand-orange' },
  { text: 'Simplify', color: 'text-brand-green' },
]

export default function HomePage() {
  const { data: session } = useSession()
  const [wordIndex, setWordIndex] = useState(0)
  const currentWord = rotatingWords[wordIndex]

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image
                src={logo}
                alt="Floor Interior Service"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </div>
            <div className="flex items-center gap-4">
              {session ? (
                // Logged in - show Dashboard link
                <Link
                  href="/dashboard"
                  className="text-primary-600 hover:text-brand-green transition-colors font-medium"
                >
                  Dashboard
                </Link>
              ) : (
                // Not logged in - show Sign In
                <Link
                  href="/auth/signin"
                  className="text-primary-600 hover:text-brand-green transition-colors font-medium"
                >
                  Sign In
                </Link>
              )}
              <Link
                href="/interview"
                className="px-4 py-2 bg-brand-green text-white rounded-lg font-medium hover:bg-brand-green-dark transition-colors"
              >
                Start Interview
              </Link>
              {session && (
                // Profile photo on the right
                <Link
                  href="/dashboard"
                  className="flex items-center"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full ring-2 ring-brand-green/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-white font-medium ring-2 ring-brand-green/20">
                      {session.user?.name?.charAt(0) || session.user?.email?.charAt(0)}
                    </div>
                  )}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 lg:py-32 grid-pattern bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-50 via-pink-50 to-orange-50 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-violet-100/50"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="bg-gradient-to-r from-violet-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
                AI-Powered Prescreening
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold text-primary-900 mb-6 leading-tight"
            >
              <span className="text-primary-500">FIS</span>{' '}
              <span className="inline-block relative w-[180px] md:w-[260px] text-left">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={wordIndex}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                    className={`absolute left-0 whitespace-nowrap ${currentWord.color}`}
                  >
                    {currentWord.text}
                  </motion.span>
                </AnimatePresence>
                <span className="invisible">Automate</span>
              </span>
              <br />
              <span className="text-primary-500">Installer Recruitment</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-primary-500 mb-10 max-w-2xl mx-auto"
            >
              Complete a quick 5-10 minute voice interview. Answer questions about your 
              experience, skills, and availability. Get instant feedback on your application.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href="/interview"
                className="w-full sm:w-auto px-8 py-4 bg-brand-green text-white rounded-xl font-medium hover:bg-brand-green-dark transition-colors flex items-center justify-center gap-2"
              >
                Start Prescreening
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-4 border border-brand-green text-brand-green rounded-xl font-medium hover:bg-brand-green/10 transition-colors"
              >
                View Dashboard
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Image Section */}
      <section className="pt-16 pb-8 bg-brand-green overflow-hidden flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center items-end"
          >
            <Image
              src={teamImage}
              alt="Our Team"
              width={600}
              height={300}
              className="h-36 w-auto object-contain object-bottom"
            />
          </motion.div>
        </div>
      </section>

    </div>
  )
}
