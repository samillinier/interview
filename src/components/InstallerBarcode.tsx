'use client'

import { useEffect, useRef, useState } from 'react'
import ReactBarcode from 'react-barcode'
import { motion } from 'framer-motion'

interface InstallerBarcodeProps {
  installerId: string
  installerName?: string
  className?: string
}

type BarcodeViewport = 'mobile' | 'tablet' | 'desktop'

function getViewport(): BarcodeViewport {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w <= 640) return 'mobile'
  // iPad portrait/landscape and small laptops — keep barcode compact beside the name
  if (w <= 1024) return 'tablet'
  return 'desktop'
}

export function InstallerBarcode({ installerId, className = '' }: InstallerBarcodeProps) {
  const barcodeRef = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<BarcodeViewport>('desktop')

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
  }, [viewport, installerId])
  
  // Generate a formatted installer code (e.g., INST-ABC123XYZ)
  const generateInstallerCode = (id: string): string => {
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    return `INST-${cleanId.substring(0, 9)}`
  }

  const installerCode = generateInstallerCode(installerId)

  const size =
    viewport === 'mobile'
      ? { width: 2.0, height: 60, fontSize: 11, textMargin: 4, margin: 0 }
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
            ? 'w-full max-w-full overflow-hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-sm'
            : viewport === 'tablet'
              ? 'w-full max-w-[200px] overflow-hidden bg-white p-1.5'
              : 'flex flex-col items-center justify-center bg-white p-2'
        }
      >
        <div className="w-full">
          <ReactBarcode
            value={installerCode}
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
            background="#ffffff"
            lineColor="#1e293b"
          />
        </div>
      </div>
    </motion.div>
  )
}
