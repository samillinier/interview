'use client'

import { useEffect, useRef } from 'react'
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
      canvas.width = img.width
      canvas.height = img.height + 60 // Extra space for text
      ctx?.fillStyle = 'white'
      ctx?.fillRect(0, 0, canvas.width, canvas.height)
      ctx?.drawImage(img, 0, 30)
      
      // Add text below barcode
      if (ctx) {
        ctx.fillStyle = '#1e293b'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'center'
        ctx.fillText(installerCode, canvas.width / 2, canvas.height - 20)
        if (installerName) {
          ctx.font = '12px Arial'
          ctx.fillStyle = '#64748b'
          ctx.fillText(installerName, canvas.width / 2, canvas.height - 5)
        }
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={`bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-brand-green/20 shadow-lg p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-brand-green/10 rounded-xl flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Installer ID</h3>
            <p className="text-xs text-slate-500">Scan to identify</p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-brand-green/10 rounded-lg transition-colors group"
          title="Download Barcode"
        >
          <Download className="w-5 h-5 text-brand-green group-hover:text-brand-green-dark transition-colors" />
        </button>
      </div>
      
      <div ref={barcodeRef} className="flex flex-col items-center justify-center bg-white rounded-xl p-4 border border-slate-200">
        <div className="mb-2">
          <ReactBarcode
            value={installerCode}
            format="CODE128"
            width={2}
            height={60}
            displayValue={true}
            fontSize={14}
            fontOptions="bold"
            font="Arial"
            textAlign="center"
            textPosition="bottom"
            textMargin={8}
            margin={10}
            background="#ffffff"
            lineColor="#1e293b"
          />
        </div>
        {installerName && (
          <p className="text-xs text-slate-500 mt-2 font-medium">{installerName}</p>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-center text-slate-600 font-mono font-semibold tracking-wider">
          {installerCode}
        </p>
      </div>
    </motion.div>
  )
}
