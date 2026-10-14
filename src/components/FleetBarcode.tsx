'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactBarcode from 'react-barcode'
import { motion } from 'framer-motion'

interface FleetBarcodeProps {
  vehicleId: string
  className?: string
}

type BarcodeViewport = 'mobile' | 'tablet' | 'desktop'

function getViewport(): BarcodeViewport {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w <= 640) return 'mobile'
  if (w <= 1535) return 'tablet'
  return 'desktop'
}

function generateFleetCode(id: string) {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `FLEET-${cleanId.substring(0, 9)}`
}

export function FleetBarcode({ vehicleId, className = '' }: FleetBarcodeProps) {
  const barcodeRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<BarcodeViewport>('desktop')
  const fleetCode = useMemo(() => generateFleetCode(vehicleId), [vehicleId])

  useEffect(() => {
    const apply = () => setViewport(getViewport())
    apply()
    window.addEventListener('resize', apply)
    return () => window.removeEventListener('resize', apply)
  }, [])

  useEffect(() => {
    const svg = barcodeRef.current?.querySelector('svg') as SVGElement | null
    if (!svg) return
    if (viewport === 'mobile' || viewport === 'tablet') {
      svg.style.width = '100%'
      svg.style.maxWidth = '100%'
      svg.style.height = 'auto'
      svg.style.display = 'block'
    } else {
      svg.style.width = ''
      svg.style.maxWidth = ''
      svg.style.height = ''
      svg.style.display = ''
    }
  }, [viewport, vehicleId])

  const size =
    viewport === 'mobile'
      ? { width: 2.0, height: 60, fontSize: 11, textMargin: 8, margin: 0 }
      : viewport === 'tablet'
        ? { width: 1.35, height: 38, fontSize: 10, textMargin: 3, margin: 2 }
        : { width: 2.0, height: 65, fontSize: 12, textMargin: 5, margin: 6 }

  const isCompact = viewport === 'mobile' || viewport === 'tablet'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`flex flex-col items-center justify-center ${isCompact ? 'w-full' : ''} ${className}`}
    >
      <div
        ref={barcodeRef}
        className={
          viewport === 'mobile'
            ? 'w-full max-w-full overflow-visible bg-white pt-3 px-3 pb-5 rounded-2xl border border-slate-200'
            : viewport === 'tablet'
              ? 'w-full max-w-[200px] overflow-hidden bg-white p-1.5'
              : 'flex flex-col items-center justify-center bg-white p-2'
        }
      >
        <div className="w-full">
          <ReactBarcode
            value={fleetCode}
            format="CODE128"
            width={size.width}
            height={size.height}
            displayValue={true}
            fontSize={size.fontSize}
            fontOptions="bold"
            font="Arial"
            textAlign="center"
            textPosition="bottom"
            textMargin={size.textMargin}
            margin={size.margin}
            marginBottom={viewport === 'mobile' ? 10 : size.margin}
            background="#ffffff"
            lineColor="#1e293b"
          />
        </div>
      </div>
    </motion.div>
  )
}
