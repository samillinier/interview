'use client'

import { useEffect, useRef, useState } from 'react'
import ReactBarcode from 'react-barcode'
import { motion } from 'framer-motion'
import { ScanLine, Download } from 'lucide-react'

interface InstallerBarcodeProps {
  installerId: string
  installerName?: string
  className?: string
}

export function InstallerBarcode({ installerId, installerName, className = '' }: InstallerBarcodeProps) {
  const barcodeRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Keep desktop rendering unchanged; only adjust barcode sizing/layout on small screens.
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
  }, [isMobile, installerId])
  
  // Generate a formatted installer code (e.g., INST-ABC123XYZ)
  const generateInstallerCode = (id: string): string => {
    // Use the installer ID and create a formatted code
    // Remove any special characters and format as INST-{ID}
    const cleanId = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    return `INST-${cleanId.substring(0, 9)}`
  }

  const installerCode = generateInstallerCode(installerId)

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
      canvas.height = img.height + 60 // Extra space for text
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 30)
      
      // Add text below barcode
      ctx.fillStyle = '#1e293b'
      ctx.font = 'bold 16px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(installerCode, canvas.width / 2, canvas.height - 20)
      if (installerName) {
        ctx.font = '12px Arial'
        ctx.fillStyle = '#64748b'
        ctx.fillText(installerName, canvas.width / 2, canvas.height - 5)
      }

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${installerCode}-barcode.png`
          link.click()
          URL.revokeObjectURL(url)
        }
      })
    }

    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    img.src = url
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`flex flex-col items-center justify-center ${isMobile ? 'w-full' : ''} ${className}`}
    >
      <div
        ref={barcodeRef}
        className={
          isMobile
            ? 'w-full max-w-full overflow-hidden bg-white p-3 rounded-2xl border border-slate-200 shadow-sm'
            : 'flex flex-col items-center justify-center bg-white p-2'
        }
      >
        <div className={isMobile ? 'w-full' : 'w-full'}>
          <ReactBarcode
            value={installerCode}
            format="CODE128"
            width={2.0}
            height={isMobile ? 60 : 65}
            displayValue={true}
            fontSize={isMobile ? 11 : 12}
            fontOptions="bold"
            font="Arial"
            textAlign="center"
            textPosition="bottom"
            textMargin={isMobile ? 4 : 5}
            margin={isMobile ? 0 : 6}
            background="#ffffff"
            lineColor="#1e293b"
          />
        </div>
      </div>
    </motion.div>
  )
}
