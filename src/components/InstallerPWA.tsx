'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share2, PlusSquare, X } from 'lucide-react'

export default function InstallerPWA() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Detect iOS
    const ua = navigator.userAgent || ''
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(ios)

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
      return
    }

    // iOS: show guidance. Android/Desktop: wait for beforeinstallprompt
    if (ios) {
      // Show prompt after 3 seconds on installer pages
      setTimeout(() => setShowPrompt(true), 3000)
    } else {
      // Listen for the native install prompt (Android/Desktop Chrome)
      let deferredPrompt: any = null
      const handler = (e: Event) => {
        e.preventDefault()
        deferredPrompt = e
        setTimeout(() => setShowPrompt(true), 3000)
      }

      const installedHandler = () => {
        setIsStandalone(true)
        setShowPrompt(false)
      }

      window.addEventListener('beforeinstallprompt', handler)
      window.addEventListener('appinstalled', installedHandler)

      // Store the deferred prompt for later use
      const originalHandler = handler
      ;(window as any).__installerPWAHandleInstall = async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt()
          const result = await deferredPrompt.userChoice
          if (result.outcome === 'accepted') {
            setIsStandalone(true)
          }
        }
        setShowPrompt(false)
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', originalHandler)
        window.removeEventListener('appinstalled', installedHandler)
      }
    }
  }, [])

  const handleInstall = () => {
    if ((window as any).__installerPWAHandleInstall) {
      ;(window as any).__installerPWAHandleInstall()
    }
    setShowPrompt(false)
  }

  if (isStandalone || !showPrompt) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="bg-brand-green text-white rounded-2xl shadow-2xl p-4 relative">
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              className="absolute top-2 right-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {isIOS ? (
              /* iOS: Safari Share Sheet instructions */
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Install FIS Installer App</p>
                    <p className="text-xs text-white/70 mt-0.5">
                      Quick access to your dashboard, payments &amp; documents
                    </p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-white/90">
                      Tap the <strong>Share</strong> button in Safari's toolbar
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-white/90">
                      Scroll down and tap <strong>Add to Home Screen</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-white/90">
                      Tap <strong>Add</strong> to save the app
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Desktop Chrome: native install button */
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Install FIS Installer App</p>
                  <p className="text-xs text-white/70 mt-0.5">
                    Quick access to your dashboard, payments &amp; documents
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleInstall}
                  className="shrink-0 px-4 py-2 bg-white text-brand-green rounded-xl text-sm font-bold hover:bg-white/90 transition-colors"
                >
                  Install
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
