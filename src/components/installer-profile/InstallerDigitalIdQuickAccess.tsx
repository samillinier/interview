'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, CreditCard, Loader2 } from 'lucide-react'
import { isDigitalIdUrl } from '@/components/DigitalIdDisplay'

type BadgeData = {
  installerId: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
  photoUrl: string | null
  status: string
  digitalId: string
  hasBadge: boolean
  isUrl: boolean
  badgeUrl: string | null
  badgeNumber: string | null
  expiresOn: string | null
  badgeType: string | null
  badgeName: string | null
  badgeCompany: string | null
  qrImage: string | null
  photoImage: string | null
  logoImage: string | null
}

type Props = {
  installerId: string
  digitalId?: string | null
  name: string
  companyName?: string | null
  photoUrl?: string | null
}

const cacheKey = (id: string) => `fis:digital-badge:${id}`

/**
 * Mobile-only Digital ID wallet. Tapping the row drops down the official
 * FADV badge (loaded from the installer's stored wallet id) as an ID image.
 */
export function InstallerDigitalIdQuickAccess({ installerId, digitalId, name, companyName, photoUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [badge, setBadge] = useState<BadgeData | null>(null)
  const [loading, setLoading] = useState(false)

  const trimmed = (digitalId || '').trim()

  useEffect(() => {
    if (!open || !installerId || !trimmed) return

    const load = async () => {
      setLoading(true)

      try {
        const cached = localStorage.getItem(cacheKey(installerId))
        if (cached) {
          setBadge(JSON.parse(cached))
          setLoading(false)
        }
      } catch {
        // ignore corrupt cache
      }

      try {
        const res = await fetch(`/api/installers/${installerId}/digital-badge`, { cache: 'no-store' })
        if (res.ok) {
          const data: BadgeData = await res.json()
          setBadge(data)
          try {
            localStorage.setItem(cacheKey(installerId), JSON.stringify(data))
          } catch {
            // storage full — non-critical
          }
        }
      } catch {
        // offline — keep cached copy
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open, installerId, trimmed])

  // Only show the wallet card when a real badge link is saved on the profile.
  if (!isDigitalIdUrl(trimmed)) return null

  const badgeType = badge?.badgeType || 'CONTRACTOR'
  const expiresOn = badge?.expiresOn || null
  const displayName = badge?.badgeName || name
  const company = badge?.badgeCompany || badge?.companyName || companyName || null
  const photo = badge?.photoImage || photoUrl || null
  const badgeNumber = badge?.badgeNumber
    || trimmed.match(/dbId\/([0-9a-fA-F-]+)/i)?.[1]
    || trimmed
  const initials = (displayName || 'I')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'I'

  return (
    <div className="2xl:hidden w-full mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
        aria-expanded={open}
        aria-label="Open Digital ID Lowe's"
      >
        <div className="w-full flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-green to-brand-green-dark p-4 shadow-lg shadow-brand-green/25 active:scale-[0.99] transition-transform">
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[15px] leading-tight tracking-[-0.2px]">Digital ID</p>
            <p className="text-white/85 text-[13px] truncate">Lowe's</p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-white/90 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="digital-id-dropdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <div className="rounded-2xl overflow-hidden shadow-xl bg-white border border-slate-200">
                {loading && !badge ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                  </div>
                ) : (
                  <div className="flex min-h-[430px] bg-white" role="img" aria-label={`${displayName} digital badge`}>
                    <div className="shrink-0 w-16 bg-[#284B85] text-[#E0E0E0] flex items-center justify-center py-6">
                      <span
                        className="font-bold text-[16px] select-none flex flex-col items-center gap-2 leading-none tracking-normal"
                        aria-label={badgeType}
                      >
                        {(badgeType || 'CONTRACTOR').split('').map((ch, i) => (
                          <span key={`${ch}-${i}`}>{ch}</span>
                        ))}
                      </span>
                    </div>

                    <div className="flex-1 px-4 py-5 flex flex-col font-[Roboto,ui-sans-serif,system-ui,sans-serif]">
                      {badge?.logoImage ? (
                        <div className="flex justify-center mb-1">
                          <img
                            src={badge.logoImage}
                            alt=""
                            className="max-w-[220px] w-full object-contain opacity-70"
                          />
                        </div>
                      ) : null}

                      {expiresOn && (
                        <div className="text-center text-[13px] text-slate-700 mt-1">
                          Expires on {expiresOn}
                        </div>
                      )}

                      <div className="flex justify-center my-3">
                        {photo ? (
                          <img
                            src={photo}
                            alt={displayName}
                            className="w-[160px] max-w-[70%] h-auto object-contain"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <span className="text-slate-400 font-bold text-2xl">{initials}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-center font-bold text-slate-900 leading-tight text-[17px]">
                        {displayName}
                      </div>

                      <div className="text-center text-[15px] text-slate-800 mt-1">
                        Badge #{badgeNumber}
                      </div>

                      <div className="flex items-end justify-between gap-3 mt-auto pt-6">
                        {company ? (
                          <div className="text-[12px] font-semibold text-slate-800 leading-snug text-right uppercase flex-1">
                            {company}
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}
                        {badge?.qrImage ? (
                          <img
                            src={badge.qrImage}
                            alt="Digital ID QR code"
                            className="w-[100px] h-[100px] object-contain flex-shrink-0"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-center text-[11px] text-slate-500 mt-2 mb-1">
                Saved on this device — available offline.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
