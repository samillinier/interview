'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import ReactBarcode from 'react-barcode'
import { Orbitron, Share_Tech_Mono } from 'next/font/google'
import { Printer } from 'lucide-react'
import { motion } from 'framer-motion'
import logoMark from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'

/** Industrial “label reader” mono — pairs well with Code 128. */
const fontAssetCode = Share_Tech_Mono({
  weight: '400',
  subsets: ['latin'],
})

/** Bold tech header for the company line. */
const fontBrand = Orbitron({
  weight: '600',
  subsets: ['latin'],
})

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cleanInventoryId(inventoryId: string) {
  return inventoryId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

function getInventoryCodePrefix(cleanId: string) {
  if (cleanId.length <= 8) return cleanId.slice(0, 4)
  return cleanId.slice(4, 8)
}

function getInventoryCodeMiddle(cleanId: string) {
  const numericRun = cleanId.match(/\d{3,}/)?.[0]
  if (numericRun) return numericRun.slice(-4).padStart(4, '0')
  const middleStart = Math.max(0, Math.floor(cleanId.length / 2) - 2)
  return cleanId.slice(middleStart, middleStart + 4).padEnd(4, '0')
}

/**
 * Short asset-tag code derived from the record id.
 * Example: `C83T-0001-LTR1`
 */
export function getInventoryBarcodeEncodeValue(inventoryId: string) {
  const cleanId = cleanInventoryId(inventoryId)
  if (!cleanId) return ''
  if (cleanId.length <= 12) return cleanId
  return `${getInventoryCodePrefix(cleanId)}-${getInventoryCodeMiddle(cleanId)}-${cleanId.slice(-4)}`
}

/** Workroom as an uppercase suffix, e.g. `Tampa` → `TAMPA`, `St. Pete` → `ST-PETE`. */
export function workroomSlugForLabel(workroom: string) {
  return workroom
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Workroom token encoded on equipment barcodes only: uppercase alphanumerics,
 * hyphen removed, **max 5 characters** so labels stay readable (e.g. `Sarasota` → `SARAS`).
 */
export function workroomSlugForBarcode(workroom: string): string {
  const slug = workroomSlugForLabel(workroom)
  const compact = slug.replace(/-/g, '')
  return compact.slice(0, 5)
}

/**
 * Barcode and human-readable line: base asset code plus optional `-WORKROOM`
 * (e.g. `C83T-0001-LTR1-TAMPA`). Workroom suffix is capped at five characters.
 * Scanners return this full string.
 */
export function getInventoryLabelBarcodeValue(
  inventoryId: string,
  workroom?: string | null
) {
  const base = getInventoryBarcodeEncodeValue(inventoryId)
  if (!base) return ''
  const slug = workroom?.trim() ? workroomSlugForBarcode(workroom) : ''
  if (!slug) return base
  return `${base}-${slug}`
}

/** Legacy / manual search prefix (`INV:` + id). */
export function getInventoryBarcodePayload(inventoryId: string) {
  return `INV:${inventoryId}`
}

type Props = {
  inventoryId: string
  /** Appended to the asset code in the barcode as `-WORKROOM` (e.g. `...-TAMPA`). */
  workroom?: string | null
  compact?: boolean
  className?: string
  showPrint?: boolean
  alignEnd?: boolean
}

/**
 * CODE128 “price tag” style (bars + human-readable line under), matching fleet labels.
 * Encodes the short asset code plus optional `-WORKROOM` slug — not item name, SKU, or price.
 */
export function InventoryBarcode({
  inventoryId,
  workroom,
  compact = false,
  className = '',
  showPrint = true,
  alignEnd = false,
}: Props) {
  const barcodeRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)

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
    if (isMobile || compact) {
      svg.style.width = '100%'
      svg.style.maxWidth = compact ? '280px' : '100%'
      svg.style.height = 'auto'
      svg.style.display = 'block'
    } else {
      svg.style.width = ''
      svg.style.maxWidth = ''
      svg.style.height = ''
      svg.style.display = ''
    }
  }, [isMobile, compact, inventoryId, workroom])

  const labelValue = getInventoryLabelBarcodeValue(inventoryId, workroom)

  const logoAbsoluteUrl =
    typeof window !== 'undefined'
      ? (() => {
          try {
            return new URL(logoMark.src, window.location.origin).href
          } catch {
            const s = logoMark.src
            return s.startsWith('http')
              ? s
              : `${window.location.origin}${s.startsWith('/') ? '' : '/'}${s}`
          }
        })()
      : ''

  const handlePrint = () => {
    if (!inventoryId || !labelValue) return
    const wrap = barcodeRef.current
    const svg = wrap?.querySelector('svg')
    if (!svg) return

    const svgMarkup = new XMLSerializer().serializeToString(svg)

    const win = window.open('', '_blank', 'width=720,height=640')
    if (!win) return

    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Equipment label</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&family=Share+Tech+Mono&display=swap" rel="stylesheet" />
<style>
  @page { size: 4in 2in; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body {
    box-sizing: border-box;
    width: 4in;
    height: 2in;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, sans-serif;
    background: #fff;
    overflow: hidden;
  }
  /* Single outer frame only — no inner box around the barcode */
  .tag {
    box-sizing: border-box;
    width: 3.92in;
    height: 1.92in;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: left;
    border: 2px solid #111827;
    border-radius: 6px;
    background: #fff;
  }
  .labelstrip {
    width: 100%;
    max-width: 3in;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    overflow: visible;
  }
  .brandfooter {
    margin-top: 0;
    padding-top: 0;
  }
  .brandtext {
    font-family: 'Orbitron', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: #111827;
    text-transform: uppercase;
    white-space: normal;
    line-height: 1.15;
  }
  .metarow {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }
  .logoimg {
    width: 48px;
    height: 48px;
    object-fit: contain;
    flex-shrink: 0;
    filter: brightness(0) saturate(100%);
  }
  .metastack {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 2px;
  }
  .tag svg { display: block; margin: 0 auto; max-width: 100%; height: auto; }
  .barcodewrap {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    width: 100%;
    min-height: 0;
    overflow: visible;
  }
  /* Slightly larger bars on paper only (same SVG as preview). */
  .barcodewrap svg {
    width: 100%;
    max-width: 100%;
    height: auto;
    transform: scale(1.08);
    transform-origin: top center;
  }
  .code {
    width: 100%;
    margin-top: 0;
    margin-bottom: 0;
    font-family: 'Share Tech Mono', ui-monospace, monospace;
    font-size: 19px;
    font-weight: 400;
    letter-spacing: 0.05em;
    line-height: 1.05;
    text-align: left;
    color: #111827;
  }
  @media print {
    body { width: 4in; height: 2in; }
  }
</style></head><body onload="setTimeout(function(){window.print();},200)">
  <div class="tag">
    <div class="labelstrip">
      <div class="barcodewrap">${svgMarkup}</div>
      <div class="metarow">
        <img class="logoimg" src="${logoAbsoluteUrl}" alt="" />
        <div class="metastack">
          <div class="code">${escapeHtml(labelValue)}</div>
          <div class="brandfooter">
            <span class="brandtext">Floor Interior Services</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body></html>`)
    win.document.close()
  }

  const labelShellClass = alignEnd
    ? 'ml-auto mr-0 flex w-full max-w-[288px] flex-col gap-5 bg-white px-1 py-1'
    : 'mx-auto flex w-full max-w-[288px] flex-col gap-5 bg-white px-1 py-1'

  const barcodeWrapClass =
    'flex w-full items-center justify-center overflow-hidden'

  const barcodeScale = compact
    ? { w: 1.02, h: 38 }
    : isMobile
      ? { w: 1.08, h: 44 }
      : { w: 1.1, h: 48 }

  const printBtn = showPrint && !compact && (
    <button
      type="button"
      onClick={handlePrint}
      className="group flex shrink-0 items-center gap-2 rounded-lg bg-brand-green px-3 py-2 text-white transition-colors hover:bg-brand-green-dark"
      title="Print 4″×2″ label"
    >
      <Printer className="h-4 w-4 opacity-90" />
      <span className="text-xs font-semibold tracking-wide">Print</span>
    </button>
  )

  const barcodeInner = (
    <div ref={barcodeRef} className={labelShellClass}>
      <div className={barcodeWrapClass}>
        <ReactBarcode
          value={labelValue}
          format="CODE128"
          width={barcodeScale.w}
          height={barcodeScale.h}
          displayValue={false}
          font="Arial"
          textAlign="center"
          textPosition="bottom"
          textMargin={compact ? 2 : 4}
          margin={0}
          background="#ffffff"
          lineColor="#000000"
        />
      </div>
      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="relative h-12 w-12 shrink-0">
          <Image
            src={logoMark}
            alt=""
            fill
            sizes="48px"
            className="object-contain"
            style={{ filter: 'brightness(0) saturate(100%)' }}
            priority={false}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-stretch gap-0.5 text-left">
          <div
            className={`${fontAssetCode.className} w-full break-all leading-none tracking-[0.05em] text-black ${
              compact ? 'text-[11px]' : isMobile ? 'text-[15px]' : 'text-[17px]'
            }`}
          >
            {labelValue}
          </div>
          <div>
            <span
              className={`${fontBrand.className} block text-[11px] uppercase leading-tight tracking-[0.1em] text-slate-900 sm:text-[12px]`}
            >
              Floor Interior Services
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  const inner = compact ? (
    <div className={`flex gap-3 items-start ${alignEnd ? 'justify-end' : ''}`}>
      <div className={`flex flex-col gap-2 min-w-0 ${alignEnd ? 'items-end' : ''}`}>
        <div className="max-w-[min(100%,52vw)] overflow-x-auto">
          <div className={alignEnd ? 'flex justify-end' : ''}>{barcodeInner}</div>
        </div>
      </div>
    </div>
  ) : (
    <div className={`flex w-full flex-col gap-3 ${alignEnd ? 'items-end' : 'items-start'}`}>
      {printBtn && <div className="flex w-full justify-end">{printBtn}</div>}
      <div className={`flex w-full flex-col gap-3 overflow-x-auto ${alignEnd ? 'items-end' : 'items-center'}`}>
        {barcodeInner}
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className={className} aria-label={`Equipment barcode ${labelValue}`}>
        {inner}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={className}
      aria-label={`Equipment barcode ${labelValue}`}
    >
      {inner}
    </motion.div>
  )
}
