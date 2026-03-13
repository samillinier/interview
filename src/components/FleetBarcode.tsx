'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import ReactBarcode from 'react-barcode'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'

interface FleetBarcodeProps {
  vehicleId: string
  className?: string
}

function generateFleetCode(id: string) {
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return `FLEET-${cleanId.substring(0, 9)}`
}

export function FleetBarcode({ vehicleId, className = '' }: FleetBarcodeProps) {
  const barcodeRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const fleetCode = useMemo(() => generateFleetCode(vehicleId), [vehicleId])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const apply = () => setIsMobile(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  useEffect(() => {
    const svg = barcodeRef.current?.querySelector('svg') as SVGElement | null
    if (!svg) return
    if (isMobile) {
      ;(svg as any).style.width = '100%'
      ;(svg as any).style.maxWidth = '100%'
      ;(svg as any).style.height = 'auto'
      ;(svg as any).style.display = 'block'
    } else {
      ;(svg as any).style.width = ''
      ;(svg as any).style.maxWidth = ''
      ;(svg as any).style.height = ''
      ;(svg as any).style.display = ''
    }
  }, [isMobile, vehicleId])

  const handleDownload = () => {
    if (!barcodeRef.current) return

    const svg = barcodeRef.current.querySelector('svg')
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      if (!ctx) return

      canvas.width = img.width
      canvas.height = img.height + 50 // Extra space for code label
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 20)

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(fleetCode, canvas.width / 2, canvas.height - 12)

      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${fleetCode}-barcode.png`
        link.click()
        URL.revokeObjectURL(url)
      })
    }

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    img.src = url
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex items-start gap-2">
        <div
          ref={barcodeRef}
          className="bg-white/95 rounded-2xl border border-white/30 shadow-lg px-3 py-2"
        >
          <ReactBarcode
            value={fleetCode}
            format="CODE128"
            width={1.6}
            height={isMobile ? 44 : 46}
            displayValue={true}
            fontSize={isMobile ? 10 : 11}
            fontOptions="bold"
            font="Arial"
            textAlign="center"
            textPosition="bottom"
            textMargin={3}
            margin={0}
            background="#ffffff"
            lineColor="#0f172a"
          />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="p-2 rounded-xl bg-white/95 border border-white/30 shadow-lg text-slate-700 hover:text-slate-900 hover:bg-white transition-colors"
          title="Download barcode"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

