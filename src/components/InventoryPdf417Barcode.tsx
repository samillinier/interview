'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Printer } from 'lucide-react'
import { motion } from 'framer-motion'
import { getBwipBrowser } from '@/lib/bwipClient'

/** Encoded payload when the symbol is scanned (includes stable inventory id). */
export function getInventoryBarcodePayload(inventoryId: string) {
  return `INV:${inventoryId}`
}

type Props = {
  inventoryId: string
  /** Smaller symbol for table rows */
  compact?: boolean
  className?: string
  /** Show print button (opens system print dialog for the label) */
  showPrint?: boolean
  /** Align content to the end (right in LTR) — for modal label strip */
  alignEnd?: boolean
}

export function InventoryPdf417Barcode({
  inventoryId,
  compact = false,
  className = '',
  showPrint = true,
  alignEnd = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  const draw = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !inventoryId) return
    setError(null)
    try {
      const bwip = await getBwipBrowser()
      const text = getInventoryBarcodePayload(inventoryId)
      bwip.toCanvas(canvas, {
        bcid: 'pdf417',
        text,
        /** scale = module size; height = PDF417 row count (lower = shorter symbol) */
        scale: 2,
        height: compact ? 6 : 5,
        includetext: false,
        backgroundcolor: 'FFFFFF',
        barcolor: '000000',
      })
    } catch (e) {
      console.error('PDF417 render failed:', e)
      setError('Could not render barcode')
    }
  }, [inventoryId, compact])

  useEffect(() => {
    draw()
  }, [draw])

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/png')
    const text = getInventoryBarcodePayload(inventoryId)
    const safe = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const win = window.open('', '_blank', 'width=720,height=640')
    if (!win) return

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Equipment label</title>
<style>
  @page { margin: 12mm; }
  body { margin: 0; padding: 24px; font-family: system-ui, -apple-system, sans-serif; text-align: center; color: #111; }
  img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
  .code { font-family: ui-monospace, monospace; font-size: 11px; margin-top: 14px; word-break: break-all; line-height: 1.4; }
  @media print { body { padding: 0; } }
</style></head><body onload="setTimeout(function(){window.print();},200)">
  <img src="${dataUrl}" alt="PDF417 barcode" />
  <p class="code">${safe(text)}</p>
</body></html>`)
    win.document.close()
  }

  const payload = getInventoryBarcodePayload(inventoryId)

  /** Uniform display scale only — does not change PDF417 encoding (bwip scale/height stay fixed). */
  const canvasDisplayWrapperClass = compact
    ? `inline-block [image-rendering:pixelated] scale-[1.52] ${alignEnd ? 'origin-right' : 'origin-left'}`
    : 'inline-block [image-rendering:pixelated] origin-center scale-[1.45]'

  const printBtn = showPrint && !compact && (
    <button
      type="button"
      onClick={handlePrint}
      className="group flex shrink-0 items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-white transition-colors hover:bg-brand-green-dark"
      title="Print label"
    >
      <Printer className="h-4 w-4 opacity-90" />
      <span className="text-xs font-semibold tracking-wide">Print</span>
    </button>
  )

  const inner = compact ? (
    <div className={`flex gap-3 items-start ${alignEnd ? 'justify-end' : ''}`}>
      <div className={`flex flex-col gap-2 ${alignEnd ? 'items-end' : ''}`}>
        <div className="max-w-[min(260px,42vw)] overflow-visible">
          <div className={canvasDisplayWrapperClass}>
            <canvas
              ref={canvasRef}
              className="block h-auto w-full max-w-none"
              aria-label={`PDF417 barcode for ${payload}`}
            />
          </div>
        </div>
        {error && <p className={`text-xs text-red-600 ${alignEnd ? 'text-right' : ''}`}>{error}</p>}
      </div>
    </div>
  ) : (
    <div
      className={`flex w-full flex-col gap-3 ${alignEnd ? 'items-end' : 'items-start'}`}
    >
      {printBtn && <div className="flex w-full justify-end">{printBtn}</div>}
      <div className="flex w-full max-w-[min(100%,440px)] flex-col items-center gap-3 overflow-visible">
        <div className={canvasDisplayWrapperClass}>
          <canvas
            ref={canvasRef}
            className="mx-auto block h-auto max-w-full"
            aria-label={`PDF417 barcode for ${payload}`}
          />
        </div>
        <p
          className="w-full text-center font-mono text-[11px] leading-relaxed text-slate-600 sm:text-xs"
          title={payload}
        >
          {payload}
        </p>
        {error && <p className="text-center text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )

  if (compact) {
    return <div className={className}>{inner}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
    >
      {inner}
    </motion.div>
  )
}
