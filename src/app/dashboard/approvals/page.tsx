'use client'

import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { upload } from '@vercel/blob/client'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Settings,
  Menu,
  X,
  StickyNote,
  User,
  LogOut,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileText,
  ClipboardList,
  ClipboardCheck,
  Megaphone,
  Upload,
  Copy,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import logo from '@/images/freepik_br_649d627d-2016-4108-ab09-0d2a0ad903d9.png'
import { AdminMobileMenu } from '@/components/AdminMobileMenu'
import { AdminSidebar } from '@/components/AdminSidebar'
import { useSidebarOpen } from '@/hooks/useSidebarOpen'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import { PdfMarkupEditor as SharedPdfMarkupEditor } from '@/components/PdfMarkupEditor'

type ChangeRequest = {
  id: string
  createdAt: string
  status: string
  source: string | null
  sections: string[] | null
  submittedBy: string | null
  payload: Record<string, any>
  diffs?: Array<{ field: string; from: any; to: any }>
  Installer: {
    id: string
    firstName: string
    lastName: string
    email: string
    companyName: string | null
    photoUrl?: string | null
    status?: string | null
  }
}

type ApprovalGroup = {
  key: string
  installerId: string
  source: string | null
  Installer: ChangeRequest['Installer']
  requestIds: string[]
  createdAt: string // newest
  submittedBy: string | null
  sections: string[]
  changedKeys: string[]
  actions: string[] // e.g. create_staff
}

type PdfEditorPage = {
  pageNumber: number
  width: number
  height: number
}

type PdfTextBox = {
  id: string
  pageNumber: number
  x: number
  y: number
  text: string
  color: string
  size: number
}

type PdfShape = {
  id: string
  pageNumber: number
  type: 'draw' | 'circle' | 'rectangle' | 'line' | 'arrow'
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
}

type PdfUndoAction =
  | { type: 'text'; id: string }
  | { type: 'shape'; id: string }
  | { type: 'draw'; pageNumber: number; imageData: ImageData }

function isPdfUrl(url: string) {
  return /\.pdf(\?|#|$)/i.test(url)
}

async function loadPdfJs() {
  const win = window as any
  if (win.pdfjsLib) return win.pdfjsLib

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pdfjs="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load PDF editor.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    script.async = true
    script.dataset.pdfjs = 'true'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load PDF editor.'))
    document.head.appendChild(script)
  })

  if (!win.pdfjsLib) throw new Error('PDF editor did not initialize.')
  win.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  return win.pdfjsLib
}

function asciiBytes(value: string) {
  return new TextEncoder().encode(value)
}

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

async function canvasToJpegBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) resolve(nextBlob)
      else reject(new Error('Could not export edited page.'))
    }, 'image/jpeg', 0.92)
  })
  return new Uint8Array(await blob.arrayBuffer())
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) resolve(nextBlob)
        else reject(new Error('Could not copy edited image.'))
      },
      type,
      quality
    )
  })
}

async function buildPdfFromCanvases(canvases: HTMLCanvasElement[]) {
  const pageImages = await Promise.all(
    canvases.map(async (canvas) => ({
      width: canvas.width,
      height: canvas.height,
      bytes: await canvasToJpegBytes(canvas),
    }))
  )

  const objectCount = 2 + pageImages.length * 3
  const pageObjectIds = pageImages.map((_, index) => 3 + index * 3)
  const parts: Uint8Array[] = [asciiBytes('%PDF-1.4\n')]
  const offsets: number[] = [0]
  let position = parts[0].length

  const push = (part: Uint8Array) => {
    parts.push(part)
    position += part.length
  }
  const addObject = (id: number, bodyParts: Uint8Array[]) => {
    offsets[id] = position
    push(asciiBytes(`${id} 0 obj\n`))
    bodyParts.forEach(push)
    push(asciiBytes('\nendobj\n'))
  }

  addObject(1, [asciiBytes('<< /Type /Catalog /Pages 2 0 R >>')])
  addObject(2, [asciiBytes(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageImages.length} >>`)])

  pageImages.forEach((image, index) => {
    const pageId = 3 + index * 3
    const contentId = pageId + 1
    const imageId = pageId + 2
    const content = `q\n${image.width} 0 0 ${image.height} 0 0 cm\n/Im${index + 1} Do\nQ\n`

    addObject(pageId, [
      asciiBytes(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${image.width} ${image.height}] /Resources << /XObject << /Im${index + 1} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
      ),
    ])
    addObject(contentId, [asciiBytes(`<< /Length ${content.length} >>\nstream\n${content}endstream`)])
    addObject(imageId, [
      asciiBytes(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`
      ),
      image.bytes,
      asciiBytes('\nendstream'),
    ])
  })

  const xrefOffset = position
  push(asciiBytes(`xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`))
  for (let id = 1; id <= objectCount; id += 1) {
    push(asciiBytes(`${String(offsets[id] || 0).padStart(10, '0')} 00000 n \n`))
  }
  push(asciiBytes(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`))

  return new Blob(parts, { type: 'application/pdf' })
}

function PdfMarkupEditor({
  documentUrl,
  documentName,
  onEditedFile,
}: {
  documentUrl: string
  documentName: string
  onEditedFile: (file: File) => void
}) {
  const [pages, setPages] = useState<PdfEditorPage[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [tool, setTool] = useState<'shape' | 'text'>('shape')
  const [shapeTool, setShapeTool] = useState<PdfShape['type']>('draw')
  const [markupColor, setMarkupColor] = useState('#dc2626')
  const [textSize, setTextSize] = useState(26)
  const [lineWidth, setLineWidth] = useState(5)
  const [textToPlace, setTextToPlace] = useState('Please correct')
  const [textBoxes, setTextBoxes] = useState<PdfTextBox[]>([])
  const [showTextBoxList, setShowTextBoxList] = useState(false)
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null)
  const [draggingTextBox, setDraggingTextBox] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [shapes, setShapes] = useState<PdfShape[]>([])
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null)
  const [activeShapeId, setActiveShapeId] = useState<string | null>(null)
  const [draggingShape, setDraggingShape] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [resizingShape, setResizingShape] = useState<{ id: string; startX: number; startY: number; width: number; height: number } | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const pdfDocRef = useRef<any>(null)
  const renderTokenRef = useRef(0)
  const baseCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const markCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const snapshotRef = useRef<ImageData | null>(null)
  const undoStackRef = useRef<PdfUndoAction[]>([])
  const [undoVersion, setUndoVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadPdf = async () => {
      if (!documentUrl || !isPdfUrl(documentUrl)) return
      setLoading(true)
      setError('')
      setPages([])
      setTextBoxes([])
      setShapes([])
      setShowTextBoxList(false)
      setSelectedTextBoxId(null)
      setSelectedShapeId(null)
      setActiveShapeId(null)
      setDraggingTextBox(null)
      setDraggingShape(null)
      setResizingShape(null)
      undoStackRef.current = []
      setUndoVersion((prev) => prev + 1)
      pdfDocRef.current = null
      baseCanvasRefs.current = {}
      markCanvasRefs.current = {}

      try {
        const pdfjsLib = await loadPdfJs()
        const pdf = await pdfjsLib.getDocument({
          url: documentUrl,
          withCredentials: false,
        }).promise
        const nextPages: PdfEditorPage[] = []

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber)
          const viewport = page.getViewport({ scale: 1.45 })
          nextPages.push({
            pageNumber,
            width: Math.floor(viewport.width),
            height: Math.floor(viewport.height),
          })
        }

        if (!cancelled) {
          pdfDocRef.current = pdf
          setPages(nextPages)
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load this PDF for editing.')
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()
    return () => {
      cancelled = true
      renderTokenRef.current += 1
    }
  }, [documentUrl])

  useEffect(() => {
    const pdf = pdfDocRef.current
    if (!pdf || pages.length === 0) return

    let cancelled = false
    const token = renderTokenRef.current + 1
    renderTokenRef.current = token

    const renderPages = async () => {
      setLoading(true)
      setError('')

      try {
        // Wait for React to attach all canvas refs before painting PDF pages.
        await new Promise((resolve) => requestAnimationFrame(resolve))
        await new Promise((resolve) => requestAnimationFrame(resolve))

        for (const pageInfo of pages) {
          if (cancelled || renderTokenRef.current !== token) return
          const page = await pdf.getPage(pageInfo.pageNumber)
          const canvas = baseCanvasRefs.current[pageInfo.pageNumber]
          const marks = markCanvasRefs.current[pageInfo.pageNumber]
          if (!canvas) throw new Error('PDF canvas is not ready yet.')

          const viewport = page.getViewport({ scale: 1.45 })
          const width = Math.floor(viewport.width)
          const height = Math.floor(viewport.height)
          canvas.width = width
          canvas.height = height
          if (marks) {
            marks.width = width
            marks.height = height
          }

          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not prepare PDF canvas.')
          context.clearRect(0, 0, width, height)
          await page.render({ canvasContext: context, viewport }).promise
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not render this PDF.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    renderPages()
    return () => {
      cancelled = true
    }
  }, [pages])

  const getCanvasPoint = (canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  const applyTextSize = (size: number) => {
    setTextSize(size)
    if (selectedTextBoxId) {
      setTextBoxes((prev) => prev.map((box) => (box.id === selectedTextBoxId ? { ...box, size } : box)))
    }
  }

  const applyMarkupColor = (color: string) => {
    setMarkupColor(color)
    if (selectedTextBoxId) {
      setTextBoxes((prev) => prev.map((box) => (box.id === selectedTextBoxId ? { ...box, color } : box)))
    }
    if (selectedShapeId) {
      setShapes((prev) => prev.map((shape) => (shape.id === selectedShapeId ? { ...shape, color } : shape)))
    }
  }

  const applyLineWidth = (width: number) => {
    setLineWidth(width)
    if (selectedShapeId) {
      setShapes((prev) => prev.map((shape) => (shape.id === selectedShapeId ? { ...shape, lineWidth: width } : shape)))
    }
  }

  const selectTextBox = (box: PdfTextBox) => {
    setSelectedTextBoxId(box.id)
    setSelectedShapeId(null)
    setMarkupColor(box.color)
    setTextSize(box.size)
  }

  const selectShape = (shape: PdfShape) => {
    setSelectedShapeId(shape.id)
    setSelectedTextBoxId(null)
    setMarkupColor(shape.color)
    setLineWidth(shape.lineWidth)
  }

  const pushUndo = (action: PdfUndoAction) => {
    undoStackRef.current = [...undoStackRef.current, action]
    setUndoVersion((prev) => prev + 1)
  }

  const undoLastMarkup = () => {
    const action = undoStackRef.current[undoStackRef.current.length - 1]
    if (!action) return
    undoStackRef.current = undoStackRef.current.slice(0, -1)
    setUndoVersion((prev) => prev + 1)

    if (action.type === 'text') {
      setTextBoxes((prev) => prev.filter((box) => box.id !== action.id))
      if (selectedTextBoxId === action.id) setSelectedTextBoxId(null)
      return
    }

    if (action.type === 'shape') {
      setShapes((prev) => prev.filter((shape) => shape.id !== action.id))
      if (selectedShapeId === action.id) setSelectedShapeId(null)
      return
    }

    const canvas = markCanvasRefs.current[action.pageNumber]
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.putImageData(action.imageData, 0, 0)
    }
  }

  const startMarkup = (pageNumber: number, event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = markCanvasRefs.current[pageNumber]
    if (!canvas) return
    const point = getCanvasPoint(canvas, event)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'text') {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setTextBoxes((prev) => [
        ...prev,
        {
          id,
          pageNumber,
          x: point.x,
          y: point.y,
          text: textToPlace || 'Please correct',
          color: markupColor,
          size: textSize,
        },
      ])
      setSelectedTextBoxId(id)
      setSelectedShapeId(null)
      pushUndo({ type: 'text', id })
      return
    }

    if (tool === 'shape' && shapeTool !== 'draw') {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setShapes((prev) => [
        ...prev,
        {
          id,
          pageNumber,
          type: shapeTool,
          x: point.x,
          y: point.y,
          width: 1,
          height: 1,
          color: markupColor,
          lineWidth,
        },
      ])
      setActiveShapeId(id)
      setSelectedShapeId(id)
      setSelectedTextBoxId(null)
      pushUndo({ type: 'shape', id })
      canvas.setPointerCapture(event.pointerId)
      return
    }

    canvas.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    setStartPoint(point)
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height)

    if (tool === 'shape' && shapeTool === 'draw') {
      pushUndo({ type: 'draw', pageNumber, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) })
      ctx.strokeStyle = markupColor
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
    }
  }

  const moveMarkup = (pageNumber: number, event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = markCanvasRefs.current[pageNumber]
    const start = startPoint
    if (!canvas || !start) return
    const point = getCanvasPoint(canvas, event)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (activeShapeId) {
      setShapes((prev) =>
        prev.map((shape) =>
          shape.id === activeShapeId
            ? {
                ...shape,
                width: point.x - shape.x,
                height: point.y - shape.y,
              }
            : shape
        )
      )
      return
    }

    if (tool === 'shape' && shapeTool === 'draw') {
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
      return
    }
  }

  const endMarkup = () => {
    setIsDrawing(false)
    setActiveShapeId(null)
    setStartPoint(null)
    snapshotRef.current = null
  }

  const getTextBoxStyle = (page: PdfEditorPage, box: PdfTextBox) => ({
    left: `${(box.x / page.width) * 100}%`,
    top: `${(box.y / page.height) * 100}%`,
    color: box.color,
    fontSize: `${box.size}px`,
    transform: 'translate(-2px, -80%)',
  })

  const getNormalizedShape = (shape: PdfShape) => ({
    x: shape.width < 0 ? shape.x + shape.width : shape.x,
    y: shape.height < 0 ? shape.y + shape.height : shape.y,
    width: Math.abs(shape.width),
    height: Math.abs(shape.height),
  })

  const getShapeStyle = (page: PdfEditorPage, shape: PdfShape) => {
    const normalized = getNormalizedShape(shape)
    return {
      left: `${(normalized.x / page.width) * 100}%`,
      top: `${(normalized.y / page.height) * 100}%`,
      width: `${(Math.max(normalized.width, 8) / page.width) * 100}%`,
      height: `${(Math.max(normalized.height, 8) / page.height) * 100}%`,
    }
  }

  const getArrowGeometry = (x1: number, y1: number, x2: number, y2: number, lineWidthValue: number) => {
    const angle = Math.atan2(y2 - y1, x2 - x1)
    const headLength = Math.max(10, lineWidthValue * 4)
    const headAngle = Math.PI / 9
    const leftX = x2 - headLength * Math.cos(angle - headAngle)
    const leftY = y2 - headLength * Math.sin(angle - headAngle)
    const rightX = x2 - headLength * Math.cos(angle + headAngle)
    const rightY = y2 - headLength * Math.sin(angle + headAngle)
    return {
      points: `${x2},${y2} ${leftX},${leftY} ${rightX},${rightY}`,
      shaftEndX: (leftX + rightX) / 2,
      shaftEndY: (leftY + rightY) / 2,
    }
  }

  const startShapeDrag = (page: PdfEditorPage, shape: PdfShape, event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    const normalized = getNormalizedShape(shape)
    selectShape(shape)
    setDraggingShape({
      id: shape.id,
      offsetX: point.x - normalized.x,
      offsetY: point.y - normalized.y,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveShapeDrag = (page: PdfEditorPage, event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingShape) return
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    setShapes((prev) =>
      prev.map((shape) => {
        if (shape.id !== draggingShape.id) return shape
        const normalized = getNormalizedShape(shape)
        return {
          ...shape,
          x: Math.max(0, Math.min(page.width - normalized.width, point.x - draggingShape.offsetX)),
          y: Math.max(0, Math.min(page.height - normalized.height, point.y - draggingShape.offsetY)),
          width: normalized.width,
          height: normalized.height,
        }
      })
    )
  }

  const startShapeResize = (page: PdfEditorPage, shape: PdfShape, event: React.PointerEvent<HTMLButtonElement>) => {
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    const normalized = getNormalizedShape(shape)
    selectShape(shape)
    setResizingShape({
      id: shape.id,
      startX: point.x,
      startY: point.y,
      width: normalized.width,
      height: normalized.height,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveShapeResize = (page: PdfEditorPage, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizingShape) return
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    setShapes((prev) =>
      prev.map((shape) =>
        shape.id === resizingShape.id
          ? {
              ...shape,
              width: Math.max(8, Math.min(page.width - shape.x, resizingShape.width + point.x - resizingShape.startX)),
              height: Math.max(8, Math.min(page.height - shape.y, resizingShape.height + point.y - resizingShape.startY)),
            }
          : shape
      )
    )
  }

  const endShapeEdit = () => {
    setDraggingShape(null)
    setResizingShape(null)
  }

  const drawShapeOnCanvas = (ctx: CanvasRenderingContext2D, shape: PdfShape) => {
    const normalized = getNormalizedShape(shape)
    ctx.strokeStyle = shape.color
    ctx.lineWidth = shape.lineWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    if (shape.type === 'rectangle') {
      ctx.rect(normalized.x, normalized.y, normalized.width, normalized.height)
    } else if (shape.type === 'line') {
      ctx.moveTo(shape.x, shape.y)
      ctx.lineTo(shape.x + shape.width, shape.y + shape.height)
    } else if (shape.type === 'arrow') {
      const x1 = shape.x
      const y1 = shape.y
      const x2 = shape.x + shape.width
      const y2 = shape.y + shape.height
      const arrow = getArrowGeometry(x1, y1, x2, y2, shape.lineWidth)
      ctx.lineCap = 'butt'
      ctx.moveTo(x1, y1)
      ctx.lineTo(arrow.shaftEndX, arrow.shaftEndY)
      ctx.stroke()
      ctx.beginPath()
      const [tip, left, right] = arrow.points.split(' ').map((point) => point.split(',').map(Number))
      ctx.moveTo(tip[0], tip[1])
      ctx.lineTo(left[0], left[1])
      ctx.lineTo(right[0], right[1])
      ctx.closePath()
      ctx.fillStyle = shape.color
      ctx.fill()
      return
    } else {
      ctx.ellipse(
        normalized.x + normalized.width / 2,
        normalized.y + normalized.height / 2,
        normalized.width / 2,
        normalized.height / 2,
        0,
        0,
        Math.PI * 2
      )
    }
    ctx.stroke()
  }

  const startTextBoxDrag = (page: PdfEditorPage, box: PdfTextBox, event: React.PointerEvent<HTMLDivElement>) => {
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    selectTextBox(box)
    setDraggingTextBox({
      id: box.id,
      offsetX: point.x - box.x,
      offsetY: point.y - box.y,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveTextBoxDrag = (page: PdfEditorPage, event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingTextBox) return
    const canvas = markCanvasRefs.current[page.pageNumber]
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    const point = getCanvasPoint(canvas, event as any)
    setTextBoxes((prev) =>
      prev.map((box) =>
        box.id === draggingTextBox.id
          ? {
              ...box,
              x: Math.max(0, Math.min(page.width, point.x - draggingTextBox.offsetX)),
              y: Math.max(0, Math.min(page.height, point.y - draggingTextBox.offsetY)),
            }
          : box
      )
    )
  }

  const endTextBoxDrag = () => {
    setDraggingTextBox(null)
  }

  const clearMarks = () => {
    Object.values(markCanvasRefs.current).forEach((canvas) => {
      const ctx = canvas?.getContext('2d')
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    })
    setTextBoxes([])
    setShapes([])
    setShowTextBoxList(false)
    setSelectedTextBoxId(null)
    setSelectedShapeId(null)
    undoStackRef.current = []
    setUndoVersion((prev) => prev + 1)
  }

  const createMergedCanvases = () =>
    pages.map((page) => {
      const base = baseCanvasRefs.current[page.pageNumber]
      const marks = markCanvasRefs.current[page.pageNumber]
      if (!base) throw new Error('PDF page is not ready yet.')
      const merged = document.createElement('canvas')
      merged.width = base.width
      merged.height = base.height
      const ctx = merged.getContext('2d')
      if (!ctx) throw new Error('Could not prepare edited PDF.')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, merged.width, merged.height)
      ctx.drawImage(base, 0, 0)
      if (marks) ctx.drawImage(marks, 0, 0)
      shapes
        .filter((shape) => shape.pageNumber === page.pageNumber)
        .forEach((shape) => drawShapeOnCanvas(ctx, shape))
      textBoxes
        .filter((box) => box.pageNumber === page.pageNumber)
        .forEach((box) => {
          ctx.fillStyle = box.color
          ctx.font = `bold ${box.size}px Arial`
          ctx.fillText(box.text || 'Please correct', box.x, box.y)
        })
      return merged
    })

  const createEditedPdfFile = async () => {
    const mergedCanvases = createMergedCanvases()
    const blob = await buildPdfFromCanvases(mergedCanvases)
    const baseName = (documentName || 'correction.pdf').replace(/\.pdf$/i, '')
    return new File([blob], `${baseName}-correction.pdf`, { type: 'application/pdf' })
  }

  const createCopiedImageBlob = async () => {
    const mergedCanvases = createMergedCanvases()
    if (mergedCanvases.length === 0) throw new Error('PDF page is not ready yet.')

    const gap = 18
    const maxWidth = 1100
    const scale = Math.min(1, maxWidth / Math.max(...mergedCanvases.map((canvas) => canvas.width)))
    const outputWidth = Math.ceil(Math.max(...mergedCanvases.map((canvas) => canvas.width * scale)))
    const outputHeight = Math.ceil(
      mergedCanvases.reduce((total, canvas) => total + canvas.height * scale, 0) + gap * Math.max(0, mergedCanvases.length - 1)
    )
    const output = document.createElement('canvas')
    output.width = outputWidth
    output.height = outputHeight
    const ctx = output.getContext('2d')
    if (!ctx) throw new Error('Could not prepare copied image.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, output.width, output.height)

    let y = 0
    mergedCanvases.forEach((canvas) => {
      const width = canvas.width * scale
      const height = canvas.height * scale
      const x = (outputWidth - width) / 2
      ctx.drawImage(canvas, x, y, width, height)
      y += height + gap
    })

    return canvasToBlob(output, 'image/jpeg', 0.82)
  }

  const exportEditedPdf = async () => {
    setExporting(true)
    setError('')
    try {
      const file = await createEditedPdfFile()
      onEditedFile(file)
    } catch (e: any) {
      setError(e?.message || 'Could not create edited PDF.')
    } finally {
      setExporting(false)
    }
  }

  const copyEditedImage = async () => {
    setCopying(true)
    setCopied(false)
    setError('')
    try {
      const ClipboardItemCtor = (window as any).ClipboardItem
      if (!navigator.clipboard?.write || !ClipboardItemCtor) {
        throw new Error('This browser does not support copying images.')
      }
      const jpegBlob = await createCopiedImageBlob()
      try {
        await navigator.clipboard.write([new ClipboardItemCtor({ 'image/jpeg': jpegBlob })])
      } catch {
        const imageBitmap = await createImageBitmap(jpegBlob)
        const pngCanvas = document.createElement('canvas')
        pngCanvas.width = imageBitmap.width
        pngCanvas.height = imageBitmap.height
        const pngCtx = pngCanvas.getContext('2d')
        if (!pngCtx) throw new Error('Could not prepare copied image.')
        pngCtx.drawImage(imageBitmap, 0, 0)
        const pngBlob = await canvasToBlob(pngCanvas, 'image/png')
        await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': pngBlob })])
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (e: any) {
      setError(e?.message || 'Could not copy the edited image.')
    } finally {
      setCopying(false)
    }
  }

  if (!isPdfUrl(documentUrl)) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        In-browser editing is available for PDF files. For images or Word files, upload a marked-up correction file below.
      </div>
    )
  }

  const canUndo = undoVersion >= 0 && undoStackRef.current.length > 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">PDF editor</div>
          <div className="text-xs text-slate-600">Draw, circle, or add text directly on the PDF, then use it as the correction file.</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
              tool === 'shape' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setTool('shape')}
              className={`text-xs font-semibold ${tool === 'shape' ? 'text-red-700' : 'text-slate-700'}`}
            >
              Shape
            </button>
            <select
              value={shapeTool}
              onChange={(e) => {
                setTool('shape')
                setShapeTool(e.target.value as PdfShape['type'])
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              <option value="draw">Draw</option>
              <option value="circle">Circle</option>
              <option value="rectangle">Box</option>
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => setTool('text')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              tool === 'text' ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={undoLastMarkup}
            disabled={!canUndo}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo
          </button>
          <button type="button" onClick={clearMarks} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            Clear
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Color</span>
          {[
            { name: 'Red', value: '#dc2626' },
            { name: 'Blue', value: '#2563eb' },
            { name: 'Green', value: '#16a34a' },
            { name: 'Yellow', value: '#f59e0b' },
            { name: 'Black', value: '#111827' },
            { name: 'Purple', value: '#9333ea' },
          ].map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => applyMarkupColor(color.value)}
              className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                markupColor === color.value ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white shadow'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`Use ${color.name}`}
            />
          ))}
          <label className="ml-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700">
            Custom
            <input
              type="color"
              value={markupColor}
              onChange={(e) => applyMarkupColor(e.target.value)}
              className="h-6 w-8 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
              title="Custom markup color"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="pdf-editor-text-size">
            Text size
          </label>
          <select
            id="pdf-editor-text-size"
            value={textSize}
            onChange={(e) => applyTextSize(Number(e.target.value))}
            className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72, 84, 96].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="pdf-editor-line-width">
            Stroke
          </label>
          <select
            id="pdf-editor-line-width"
            value={lineWidth}
            onChange={(e) => applyLineWidth(Number(e.target.value))}
            className="w-16 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20].map((width) => (
              <option key={width} value={width}>
                {width}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tool === 'text' ? (
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50/60 p-3">
          <label className="block text-xs font-bold uppercase tracking-wide text-red-700 mb-2">
            Text to add
          </label>
          <textarea
            value={textToPlace}
            onChange={(e) => setTextToPlace(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-200"
            placeholder="Type text, then click anywhere on the PDF to place it"
          />
          <p className="mt-2 text-xs text-red-700">
            Click the PDF to place text. Drag placed text to move it, or edit it from the list below.
          </p>
        </div>
      ) : null}

      {textBoxes.length > 0 ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <button
            type="button"
            onClick={() => setShowTextBoxList((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1 text-left"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Text boxes ({textBoxes.length})
            </span>
            <span className="text-xs font-semibold text-brand-green">
              {showTextBoxList ? 'Hide' : 'Edit'}
            </span>
          </button>
          {showTextBoxList ? (
            <div className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
              {textBoxes.map((box) => (
                <div
                  key={box.id}
                  className={`grid gap-2 rounded-xl border p-2 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center ${
                    selectedTextBoxId === box.id ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <input
                    value={box.text}
                    onChange={(e) =>
                      setTextBoxes((prev) => prev.map((nextBox) => (nextBox.id === box.id ? { ...nextBox, text: e.target.value } : nextBox)))
                    }
                    onFocus={() => selectTextBox(box)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  />
                  <select
                    value={box.size}
                    onChange={(e) =>
                      setTextBoxes((prev) =>
                        prev.map((nextBox) => (nextBox.id === box.id ? { ...nextBox, size: Number(e.target.value) } : nextBox))
                      )
                    }
                    className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                    title="Text size"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 26, 28, 32, 36, 40, 44, 48, 56, 64, 72, 84, 96].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <input
                    type="color"
                    value={box.color}
                    onChange={(e) =>
                      setTextBoxes((prev) => prev.map((nextBox) => (nextBox.id === box.id ? { ...nextBox, color: e.target.value } : nextBox)))
                    }
                    className="h-9 w-12 rounded-lg border border-slate-200 bg-white p-1"
                    title="Text color"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setTextBoxes((prev) => prev.filter((nextBox) => nextBox.id !== box.id))
                      if (selectedTextBoxId === box.id) setSelectedTextBoxId(null)
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading PDF editor...
        </div>
      ) : null}

      {error ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="mt-4 max-h-[68vh] space-y-4 overflow-auto rounded-xl bg-slate-200/60 p-3">
        {pages.map((page) => (
          <div key={page.pageNumber} className="mx-auto w-fit rounded-lg bg-white p-2 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-slate-500">Page {page.pageNumber}</div>
            <div className="relative max-w-full overflow-auto">
              <canvas
                ref={(node) => {
                  baseCanvasRefs.current[page.pageNumber] = node
                }}
                width={page.width}
                height={page.height}
                className="block max-w-full"
              />
              <canvas
                ref={(node) => {
                  markCanvasRefs.current[page.pageNumber] = node
                }}
                width={page.width}
                height={page.height}
                className="absolute inset-0 block max-w-full cursor-crosshair touch-none"
                onPointerDown={(e) => startMarkup(page.pageNumber, e)}
                onPointerMove={(e) => moveMarkup(page.pageNumber, e)}
                onPointerUp={endMarkup}
                onPointerCancel={endMarkup}
                onPointerLeave={endMarkup}
              />
              {textBoxes
                .filter((box) => box.pageNumber === page.pageNumber)
                .map((box) => (
                  <div
                    key={box.id}
                    className={`absolute min-w-[90px] max-w-[360px] cursor-move whitespace-pre-wrap rounded-md px-1.5 py-0.5 font-bold leading-tight ${
                      selectedTextBoxId === box.id ? 'ring-2 ring-red-400 bg-white/70' : 'bg-white/30'
                    }`}
                    style={getTextBoxStyle(page, box)}
                    onPointerDown={(e) => startTextBoxDrag(page, box, e)}
                    onPointerMove={(e) => moveTextBoxDrag(page, e)}
                    onPointerUp={endTextBoxDrag}
                    onPointerCancel={endTextBoxDrag}
                    onClick={(e) => {
                      e.stopPropagation()
                      selectTextBox(box)
                    }}
                    title="Drag to move this text"
                  >
                    {box.text || 'Please correct'}
                  </div>
                ))}
              {shapes
                .filter((shape) => shape.pageNumber === page.pageNumber)
                .map((shape) => {
                  const normalized = getNormalizedShape(shape)
                  const shapeWidth = Math.max(normalized.width, 8)
                  const shapeHeight = Math.max(normalized.height, 8)
                  const lineStartX = shape.width < 0 ? shapeWidth : 0
                  const lineStartY = shape.height < 0 ? shapeHeight : 0
                  const lineEndX = shape.width < 0 ? 0 : shapeWidth
                  const lineEndY = shape.height < 0 ? 0 : shapeHeight
                  const arrow = getArrowGeometry(lineStartX, lineStartY, lineEndX, lineEndY, shape.lineWidth)
                  return (
                    <div
                      key={shape.id}
                      className={`absolute cursor-move ${selectedShapeId === shape.id ? 'ring-2 ring-blue-400' : ''}`}
                      style={getShapeStyle(page, shape)}
                      onPointerDown={(e) => startShapeDrag(page, shape, e)}
                      onPointerMove={(e) => moveShapeDrag(page, e)}
                      onPointerUp={endShapeEdit}
                      onPointerCancel={endShapeEdit}
                      onClick={(e) => {
                        e.stopPropagation()
                        selectShape(shape)
                      }}
                    >
                      <svg viewBox={`0 0 ${shapeWidth} ${shapeHeight}`} className="h-full w-full overflow-visible">
                        {shape.type === 'rectangle' ? (
                          <rect
                            x={shape.lineWidth / 2}
                            y={shape.lineWidth / 2}
                            width={shapeWidth - shape.lineWidth}
                            height={shapeHeight - shape.lineWidth}
                            fill="none"
                            stroke={shape.color}
                            strokeWidth={shape.lineWidth}
                          />
                        ) : shape.type === 'line' || shape.type === 'arrow' ? (
                          <>
                            <line
                              x1={lineStartX}
                              y1={lineStartY}
                              x2={shape.type === 'arrow' ? arrow.shaftEndX : lineEndX}
                              y2={shape.type === 'arrow' ? arrow.shaftEndY : lineEndY}
                              stroke={shape.color}
                              strokeWidth={shape.lineWidth}
                              strokeLinecap={shape.type === 'arrow' ? 'butt' : 'round'}
                            />
                            {shape.type === 'arrow' ? (
                              <polygon
                                points={arrow.points}
                                fill={shape.color}
                              />
                            ) : null}
                          </>
                        ) : (
                          <ellipse
                            cx={shapeWidth / 2}
                            cy={shapeHeight / 2}
                            rx={Math.max(1, shapeWidth / 2 - shape.lineWidth / 2)}
                            ry={Math.max(1, shapeHeight / 2 - shape.lineWidth / 2)}
                            fill="none"
                            stroke={shape.color}
                            strokeWidth={shape.lineWidth}
                          />
                        )}
                      </svg>
                      {selectedShapeId === shape.id ? (
                        <button
                          type="button"
                          className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow cursor-se-resize"
                          aria-label="Resize shape"
                          onPointerDown={(e) => startShapeResize(page, shape, e)}
                          onPointerMove={(e) => moveShapeResize(page, e)}
                          onPointerUp={endShapeEdit}
                          onPointerCancel={endShapeEdit}
                        />
                      ) : null}
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={copyEditedImage}
          disabled={loading || exporting || copying || pages.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          title="Copy edited image"
        >
          {copying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={exportEditedPdf}
          disabled={loading || exporting || copying || pages.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Use Edited PDF
        </button>
      </div>
    </div>
  )
}

export default function ApprovalsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const normalizedRole = String((session?.user as any)?.role || '').toUpperCase()
  const canViewApprovals = normalizedRole !== 'MANAGER'
  const { sidebarOpen } = useSidebarOpen()

  const [requests, setRequests] = useState<ChangeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pendingCount, setPendingCount] = useState(0)
  const [signatureNotSignedCount, setSignatureNotSignedCount] = useState(0)
  const [updatesCount, setUpdatesCount] = useState(0)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 50
  const [rejectModal, setRejectModal] = useState<{
    open: boolean
    ids: string[]
    label: string
    reason: string
  }>({ open: false, ids: [], label: '', reason: '' })

  const [correctionModal, setCorrectionModal] = useState<{
    open: boolean
    id: string
    label: string
    documentName: string
    documentUrl: string
    reason: string
    file: File | null
  }>({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })

  const [agreementModal, setAgreementModal] = useState<{
    open: boolean
    id: string
    label: string
    signature: string
    signedDate: string
  }>({
    open: false,
    id: '',
    label: '',
    signature: '',
    signedDate: new Date().toISOString().slice(0, 10),
  })

  const getInitialsFromName = (firstName?: string | null, lastName?: string | null) => {
    const a = String(firstName || '').trim()[0] || ''
    const b = String(lastName || '').trim()[0] || ''
    return (a + b).toUpperCase() || '—'
  }

  const getAvatarRingClass = (status?: string | null) => {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return 'ring-4 ring-brand-green'
    if (s === 'deactive' || s === 'deactivated') return 'ring-4 ring-slate-900'
    if (s === 'passed' || s === 'qualified') return 'ring-4 ring-blue-500'
    if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified') return 'ring-4 ring-red-500'
    return 'ring-4 ring-yellow-500'
  }

  const getAvatarInitialsBgClass = (status?: string | null) => {
    const s = String(status || '').toLowerCase()
    if (s === 'active') return 'bg-brand-green'
    if (s === 'deactive' || s === 'deactivated') return 'bg-slate-900'
    if (s === 'passed' || s === 'qualified') return 'bg-blue-500'
    if (s === 'failed' || s === 'notqualified' || s === 'not_qualified' || s === 'not qualified') return 'bg-red-500'
    return 'bg-yellow-500'
  }

  const requestsById = useMemo(() => {
    const m = new Map<string, ChangeRequest>()
    for (const r of requests) m.set(r.id, r)
    return m
  }, [requests])

  const humanizeField = (field: string): string => {
    const parts = String(field).split('.').filter(Boolean)
    const pretty = parts.map((p) =>
      p
        .replace(/_/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim()
    )
    return pretty.join(' › ')
  }

  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    if (typeof val === 'number') return String(val)
    if (typeof val === 'string') {
      const s = val.trim()
      if (!s) return '—'
      // ISO date-ish strings
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        const d = new Date(s)
        if (!Number.isNaN(d.getTime())) return d.toLocaleString()
      }
      // JSON arrays/objects stored as strings
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
          const parsed = JSON.parse(s)
          if (Array.isArray(parsed)) return parsed.map(formatValue).join(', ')
          return JSON.stringify(parsed)
        } catch {
          // fall through
        }
      }
      return s
    }
    if (Array.isArray(val)) return val.map(formatValue).join(', ')
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val)
      } catch {
        return String(val)
      }
    }
    return String(val)
  }

  const getAgreementRoute = (agreementType: string | null | undefined, installerId: string): string | null => {
    if (!agreementType) return null
    
    // Map agreement types to admin view routes
    const agreementRoutes: Record<string, string> = {
      'background-authorization-release': `/dashboard/installers/${installerId}/agreements/background-authorization`,
      'background-authorization': `/dashboard/installers/${installerId}/agreements/background-authorization`,
      'form-w-9': `/dashboard/installers/${installerId}/agreements/w-9`,
      'form-w9': `/dashboard/installers/${installerId}/agreements/w-9`,
      'formw-9': `/dashboard/installers/${installerId}/agreements/w-9`,
      'w-9': `/dashboard/installers/${installerId}/agreements/w-9`,
      'w9': `/dashboard/installers/${installerId}/agreements/w-9`,
      'nda': `/dashboard/installers/${installerId}/agreements/nda`,
      'service-agreement': `/dashboard/installers/${installerId}/agreements/service-agreement`,
    }
    
    const route = agreementRoutes[agreementType.toLowerCase()]
    if (!route) return null
    
    return route
  }

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
    if (status === 'authenticated' && !canViewApprovals) router.replace('/dashboard')
  }, [status, canViewApprovals, router])

  useEffect(() => {
    if (!rejectModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRejectModal({ open: false, ids: [], label: '', reason: '' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rejectModal.open])

  useEffect(() => {
    if (!correctionModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCorrectionModal({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [correctionModal.open])

  useEffect(() => {
    if (!agreementModal.open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgreementModal((p) => ({ ...p, open: false }))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [agreementModal.open])

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/admin/change-requests/count')
      if (res.status === 401) {
        // Session missing/expired on this domain
        setPendingCount(0)
        return
      }
      if (res.ok) {
        const data = await res.json()
        setPendingCount(data.count || 0)
      }
    } catch (e) {
      // ignore
    }
  }

  const fetchUpdatesCount = async () => {
    try {
      const res = await fetch('/api/admin/updates/count', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      setUpdatesCount(Number(data?.count || 0))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadSignatureCount = async () => {
      try {
        const res = await fetch('/api/admin/signatures/independent-contractor-services/count', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const count = Number(data?.count ?? 0)
        if (!cancelled && Number.isFinite(count)) setSignatureNotSignedCount(count)
      } catch {
        // ignore
      }
    }
    loadSignatureCount()
    return () => {
      cancelled = true
    }
  }, [])

  const fetchRequests = async (refresh = false, page: number = currentPage) => {
    try {
      if (refresh) setIsRefreshing(true)
      else setLoading(true)
      setError('')

      const res = await fetch(`/api/admin/change-requests?status=pending&page=${page}&limit=${itemsPerPage}`)
      if (res.status === 401) {
        setError('Your admin session expired. Please sign in again.')
        router.push('/login')
        return
      }
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Admin access required.')
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || data.details || `Failed to fetch change requests (HTTP ${res.status})`)
      }
      const data = await res.json()
      // Ensure sections are parsed correctly (Prisma returns JSON as object/array)
      const requestsWithParsedSections = (data.requests || []).map((r: any) => ({
        ...r,
        sections: r.sections ? (Array.isArray(r.sections) ? r.sections : JSON.parse(r.sections || '[]')) : null,
      }))
      setRequests(requestsWithParsedSections)
      
      // Update pagination state
      if (data.pagination) {
        setCurrentPage(data.pagination.page || page)
        setTotalPages(data.pagination.totalPages || 1)
        setTotalCount(data.pagination.total || 0)
      }
      
      await fetchPendingCount()
    } catch (e: any) {
      setError(e.message || 'Failed to fetch approvals')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      fetchRequests(false, page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && canViewApprovals) {
      fetchRequests(false, 1)
      fetchPendingCount()
      fetchUpdatesCount()
      const interval = setInterval(() => {
        fetchPendingCount()
        fetchUpdatesCount()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [status, canViewApprovals])

  const handleApprove = async (id: string) => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to approve'}: ${data.details}` : data.error || 'Failed to approve')

      setSuccess('Approved and applied changes.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to approve')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const handleApproveAgreement = async (id: string, adminSignature: string, adminSignedDate: string) => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', adminSignature, adminSignedDate }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error(
          data.details ? `${data.error || 'Failed to approve agreement'}: ${data.details}` : data.error || 'Failed to approve agreement'
        )

      setSuccess('Agreement approved and signed.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to approve agreement')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const handleApproveMany = async (ids: string[]) => {
    for (const id of ids) {
      // eslint-disable-next-line no-await-in-loop
      await handleApprove(id)
    }
  }

  const handleReject = async (id: string, reason = '', correction?: { url: string; name: string }) => {
    setApproving((p) => ({ ...p, [id]: true }))
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/change-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason || '',
          correctionUrl: correction?.url || null,
          correctionName: correction?.name || null,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to reject'}: ${data.details}` : data.error || 'Failed to reject')

      setSuccess('Rejected change request.')
      setRequests((prev) => prev.filter((r) => r.id !== id))
      await fetchPendingCount()
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to reject')
    } finally {
      setApproving((p) => ({ ...p, [id]: false }))
    }
  }

  const openCorrectionModal = (id: string, label: string) => {
    const req = requestsById.get(id)
    const payload = (req?.payload || {}) as any
    setCorrectionModal({
      open: true,
      id,
      label,
      documentName: String(payload.documentName || 'Attachment'),
      documentUrl: payload.documentUrl ? String(payload.documentUrl) : '',
      reason: '',
      file: null,
    })
  }

  const confirmCorrection = async () => {
    if (!correctionModal.id) return
    if (!correctionModal.file && !correctionModal.reason.trim()) {
      setError('Add a note or upload a correction file before sending correction.')
      setTimeout(() => setError(''), 5000)
      return
    }

    setApproving((p) => ({ ...p, [correctionModal.id]: true }))
    setError('')
    setSuccess('')
    try {
      let correction: { url: string; name: string } | undefined
      if (correctionModal.file) {
        const timestamp = Date.now()
        const sanitizedFileName = correctionModal.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const blobPath = `corrections/${correctionModal.id}_${timestamp}_${sanitizedFileName}`
        const blob = await upload(blobPath, correctionModal.file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
        })
        correction = { url: blob.url, name: correctionModal.file.name }
      }

      await handleReject(correctionModal.id, correctionModal.reason.trim(), correction)
      setCorrectionModal({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })
      setSuccess('Correction sent to installer.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e.message || 'Failed to send correction')
    } finally {
      setApproving((p) => ({ ...p, [correctionModal.id]: false }))
    }
  }

  const handleRejectMany = async (ids: string[], reason = '') => {
    for (const id of ids) {
      setApproving((p) => ({ ...p, [id]: true }))
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await fetch(`/api/admin/change-requests/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject', rejectionReason: reason || '' }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.details ? `${data.error || 'Failed to reject'}: ${data.details}` : data.error || 'Failed to reject')
        setRequests((prev) => prev.filter((r) => r.id !== id))
      } catch (e: any) {
        setError(e.message || 'Failed to reject')
      } finally {
        setApproving((p) => ({ ...p, [id]: false }))
      }
    }
    await fetchPendingCount()
    setSuccess('Rejected change request(s).')
    setTimeout(() => setSuccess(''), 3000)
  }

  const openRejectModal = (ids: string[], label: string) => {
    setRejectModal({
      open: true,
      ids,
      label,
      reason: '',
    })
  }

  const confirmRejectFromModal = async () => {
    const ids = rejectModal.ids || []
    if (!ids.length) {
      setRejectModal({ open: false, ids: [], label: '', reason: '' })
      return
    }
    const reason = (rejectModal.reason || '').trim()
    setRejectModal({ open: false, ids: [], label: '', reason: '' })
    if (ids.length === 1) await handleReject(ids[0], reason)
    else await handleRejectMany(ids, reason)
  }

  const openAgreementModal = (id: string, label: string) => {
    setAgreementModal({
      open: true,
      id,
      label,
      signature: '',
      signedDate: new Date().toISOString().slice(0, 10),
    })
  }

  const confirmAgreementFromModal = async () => {
    const id = agreementModal.id
    const sig = (agreementModal.signature || '').trim()
    const date = (agreementModal.signedDate || '').trim()
    if (!id || !sig) {
      setAgreementModal((p) => ({ ...p, open: false }))
      setError('Admin signature is required to approve the agreement.')
      return
    }
    setAgreementModal((p) => ({ ...p, open: false }))
    await handleApproveAgreement(id, sig, date)
  }

  const groups = useMemo((): ApprovalGroup[] => {
    const map = new Map<string, ApprovalGroup>()
    for (const r of requests) {
      const action = typeof (r.payload as any)?.action === 'string' ? String((r.payload as any).action) : ''
      const baseKey = `${r.Installer.id}::${r.source || ''}`
      // One approval card per attachment so admins can approve/reject each file separately.
      const key = action === 'verify_document' ? `${baseKey}::doc::${r.id}` : baseKey
      const existing = map.get(key)
      const keys = Object.keys(r.payload || {})
      const sections = Array.isArray(r.sections) ? r.sections : []

      const createdAt = r.createdAt
      if (!existing) {
        map.set(key, {
          key,
          installerId: r.Installer.id,
          source: r.source,
          Installer: r.Installer,
          requestIds: [r.id],
          createdAt,
          submittedBy: r.submittedBy,
          sections: [...sections],
          changedKeys: [...keys],
          actions: action ? [action] : [],
        })
      } else {
        existing.requestIds.push(r.id)
        // newest timestamp (for display)
        if (new Date(createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          existing.createdAt = createdAt
          existing.submittedBy = r.submittedBy
        }
        existing.sections = Array.from(new Set([...(existing.sections || []), ...sections])).filter(Boolean)
        existing.changedKeys = Array.from(new Set([...(existing.changedKeys || []), ...keys])).filter(Boolean)
        if (action) existing.actions = Array.from(new Set([...(existing.actions || []), action])).filter(Boolean)
      }
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [requests])

  if (status === 'loading' || !canViewApprovals || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">
                    {rejectModal.ids.length > 1 ? 'Reject changes' : 'Reject change'}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Add a note for the installer (recommended). They will see it in Notifications and on the Attachments page for that file.
                  </div>
                  {rejectModal.label && (
                    <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="font-semibold">For:</span> {rejectModal.label}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">Reason for rejection (optional)</label>
              <textarea
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((p) => ({ ...p, reason: e.target.value }))}
                rows={4}
                placeholder="e.g., Please upload the updated insurance certificate with the correct expiry date."
                className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
              />
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, ids: [], label: '', reason: '' })}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRejectFromModal}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors font-medium"
                >
                  {rejectModal.ids.length > 1 ? 'Reject All' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setCorrectionModal({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })
            }
          />
          <div className="relative w-full max-w-6xl max-h-[96vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden overflow-y-auto">
            <button
              type="button"
              onClick={() =>
                setCorrectionModal({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })
              }
              className="absolute right-3 top-3 z-10 p-2 rounded-xl bg-white/90 shadow-sm hover:bg-slate-100 text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="p-3 space-y-3">
              <SharedPdfMarkupEditor
                documentUrl={correctionModal.documentUrl}
                documentName={correctionModal.documentName}
                onEditedFile={(file) => setCorrectionModal((p) => ({ ...p, file }))}
              />

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Correction note</label>
                <textarea
                  value={correctionModal.reason}
                  onChange={(e) => setCorrectionModal((p) => ({ ...p, reason: e.target.value }))}
                  rows={4}
                  placeholder="e.g., Please update the named insured and upload the corrected certificate."
                  className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setCorrectionModal({ open: false, id: '', label: '', documentName: '', documentUrl: '', reason: '', file: null })
                  }
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCorrection}
                  disabled={!!approving[correctionModal.id]}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors font-medium disabled:opacity-50"
                >
                  {approving[correctionModal.id] ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Send Correction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Approve / Sign Modal */}
      {agreementModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Close modal"
            className="absolute inset-0 bg-black/40"
            onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
          />
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-slate-900">Sign &amp; approve agreement</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Add your signature to approve the installer&rsquo;s submitted agreement.
                  </div>
                  {agreementModal.label && (
                    <div className="mt-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="font-semibold">For:</span> {agreementModal.label}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Admin signature</label>
                <input
                  value={agreementModal.signature}
                  onChange={(e) => setAgreementModal((p) => ({ ...p, signature: e.target.value }))}
                  placeholder="Type your full name"
                  className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Date</label>
                <input
                  type="date"
                  value={agreementModal.signedDate}
                  onChange={(e) => setAgreementModal((p) => ({ ...p, signedDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 px-4 py-3 text-sm text-slate-900 outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAgreementModal((p) => ({ ...p, open: false }))}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAgreementFromModal}
                  className="px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors font-medium"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <AdminSidebar pathname={pathname} />

      <AdminMobileMenu pathname={pathname} />

      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} w-full`}>
        <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 pt-20 lg:pt-8 pb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-brand-green/10 rounded-xl">
                  <ShieldAlert className="w-6 h-6 text-brand-green" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Approvals</h1>
              </div>
              <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
                Review installer-submitted changes and approve or reject them
              </p>
            </div>
            <button
              onClick={() => fetchRequests(true)}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green text-white hover:bg-brand-green-dark rounded-xl transition-all font-medium shadow-sm hover:shadow-md disabled:opacity-50 shrink-0 self-start sm:self-auto"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-start gap-3">
              <XCircle className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 mt-0.5" />
              <div className="text-sm">{success}</div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-10 text-center text-slate-600">
              No pending approvals.
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {groups.map((g) => (
                <motion.div
                  key={g.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-md border border-slate-200/60 p-6"
                >
                  {(() => {
                    const rawDiffs =
                      g.requestIds
                        .flatMap((id) => requestsById.get(id)?.diffs || [])
                        .filter(Boolean) || []
                    const deduped = new Map<string, { field: string; from: any; to: any }>()
                    for (const d of rawDiffs) deduped.set(String(d.field), d)
                    const diffs = Array.from(deduped.values())
                    const isExpanded = !!expanded[g.key]
                    const visibleDiffs = isExpanded ? diffs : diffs.slice(0, 4)

                    return (
                      <>
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="relative">
                              <div
                                className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md transition-all ${getAvatarRingClass(
                                  g.Installer.status
                                )}`}
                              >
                                {!g.Installer.photoUrl && (
                                  <div
                                    className={`absolute inset-0 flex items-center justify-center text-white font-bold text-sm ${getAvatarInitialsBgClass(
                                      g.Installer.status
                                    )}`}
                                  >
                                    {getInitialsFromName(g.Installer.firstName, g.Installer.lastName)}
                                  </div>
                                )}
                                {g.Installer.photoUrl && (
                                  <Image
                                    src={g.Installer.photoUrl}
                                    alt={`${g.Installer.firstName} ${g.Installer.lastName}`}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none'
                                    }}
                                  />
                                )}
                              </div>
                              {String(g.Installer.status || '').toLowerCase() === 'active' ||
                              String(g.Installer.status || '').toLowerCase() === 'passed' ||
                              String(g.Installer.status || '').toLowerCase() === 'qualified' ? (
                                <div
                                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-lg z-20 ${
                                    String(g.Installer.status || '').toLowerCase() === 'active'
                                      ? 'bg-brand-green'
                                      : 'bg-blue-500'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3 h-3 text-white" />
                                </div>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 break-words">
                                {g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}
                                {g.Installer.firstName} {g.Installer.lastName}
                              </div>
                              <div className="text-sm text-slate-600 break-all">{g.Installer.email}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {g.source && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {g.source}
                              </span>
                            )}
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Pending
                            </span>
                            {g.requestIds.length > 1 && (
                              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                                {g.requestIds.length} requests
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sections</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {g.sections.length > 0 ? (
                                g.sections.map((section) => (
                                  <span
                                    key={section}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    {section}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">None</span>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Changed fields</div>
                            <div className="mt-2 text-sm text-slate-700 leading-6">
                              {(() => {
                                const changed = diffs.map((d) => humanizeField(String(d.field)))
                                if (!changed.length) return <span className="text-slate-400">(none)</span>
                                const shown = isExpanded ? changed : changed.slice(0, 10)
                                const more = Math.max(0, changed.length - shown.length)
                                return (
                                  <>
                                    {shown.join(', ')}
                                    {more > 0 ? ` +${more} more` : ''}
                                  </>
                                )
                              })()}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Action</div>
                            <div className="mt-2 text-sm font-medium text-slate-700">
                              {g.actions.length > 0
                                ? g.actions
                                    .map((a) => {
                                      if (a === 'create_staff') return 'Add Team Member'
                                      if (a === 'update_staff') return 'Update Team Member'
                                      if (a === 'delete_staff') return 'Delete Team Member'
                                      if (a === 'approve_agreement') return 'Agreement Approval'
                                      if (a === 'verify_document') return 'Attachment Verification'
                                      return a
                                    })
                                    .join(', ')
                                : '—'}
                            </div>
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Submitted</div>
                            <div className="mt-2 text-sm font-medium text-slate-700">
                              {new Date(g.createdAt).toLocaleString()}
                            </div>
                            {g.submittedBy ? (
                              <div className="mt-1 text-xs text-slate-500">by {g.submittedBy}</div>
                            ) : null}
                          </div>
                        </div>

                        {g.requestIds.length === 1 &&
                          String((requestsById.get(g.requestIds[0])?.payload as any)?.action || '') ===
                            'verify_document' &&
                          (() => {
                            const req = requestsById.get(g.requestIds[0])
                            const p = (req?.payload || {}) as any
                            const name = String(p.documentName || 'Attachment')
                            const docType = p.documentType ? String(p.documentType) : ''
                            const url = p.documentUrl ? String(p.documentUrl) : ''
                            return (
                              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <FileText className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                        Review this file
                                      </div>
                                      <div className="text-sm font-semibold text-slate-900 mt-1 break-words">{name}</div>
                                      {docType ? (
                                        <div className="text-xs text-slate-600 mt-0.5">Type: {docType}</div>
                                      ) : null}
                                      <p className="text-xs text-amber-950/80 mt-2 leading-relaxed">
                                        Open the file, then approve or reject. If you reject, add a note — the installer will
                                        see it on their Attachments page for this file.
                                      </p>
                                    </div>
                                  </div>
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-amber-300 bg-white text-sm font-semibold text-amber-900 hover:bg-amber-100/80 transition-colors"
                                    >
                                      Open file
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:max-w-[420px] xl:justify-end">
                      <Link
                        href={`/dashboard/installers/${g.Installer.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-sm font-medium">View Profile</span>
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      {(() => {
                        const firstId = g.requestIds[0]
                        const first = firstId ? requestsById.get(firstId) : null
                        const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                        const isAgreement = action === 'approve_agreement' && g.requestIds.length === 1
                        const isDocument = action === 'verify_document'
                        
                        if (isDocument) {
                          const docs = g.requestIds
                            .map((id) => (id ? requestsById.get(id) : null))
                            .filter(Boolean)
                            .map((r: any) => ({
                              id: String(r.id),
                              url: r?.payload?.documentUrl ? String(r.payload.documentUrl) : '',
                              name: r?.payload?.documentName ? String(r.payload.documentName) : 'Attachment',
                            }))
                            .filter((d) => !!d.url)

                          if (docs.length > 0) {
                            return (
                              <div className="flex flex-wrap items-center gap-2">
                                {docs.slice(0, 2).map((d) => (
                                  <a
                                    key={d.id}
                                    href={d.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="text-sm font-medium">
                                      {docs.length > 1 ? `View ${d.name}` : 'View Attachment'}
                                    </span>
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                ))}
                                {docs.length > 2 && (
                                  <Link
                                    href={`/dashboard/installers/${g.Installer.id}#attachments`}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                                  >
                                    <span className="text-sm font-medium">+{docs.length - 2} more</span>
                                    <ExternalLink className="w-4 h-4" />
                                  </Link>
                                )}
                              </div>
                            )
                          }

                          return (
                            <Link
                              href={`/dashboard/installers/${g.Installer.id}#attachments`}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <span className="text-sm font-medium">View Attachments</span>
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )
                        }
                        
                        if (!isAgreement) return null
                        
                        const agreementType = (first?.payload as any)?.agreementType
                        const agreementRoute = getAgreementRoute(agreementType, g.Installer.id)
                        if (!agreementRoute) return null
                        
                        return (
                          <Link
                            href={agreementRoute}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-sm font-medium">View Agreement</span>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )
                      })()}
                      <button
                        type="button"
                        onClick={() =>
                          openRejectModal(
                            g.requestIds,
                            `${g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}${g.Installer.firstName} ${
                              g.Installer.lastName
                            }`
                          )
                        }
                        disabled={g.requestIds.some((id) => !!approving[id])}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{g.requestIds.length > 1 ? 'Reject All' : 'Reject'}</span>
                      </button>
                      {(() => {
                        const firstId = g.requestIds[0]
                        const first = firstId ? requestsById.get(firstId) : null
                        const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                        if (action !== 'verify_document' || g.requestIds.length !== 1 || !firstId) return null
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              openCorrectionModal(
                                firstId,
                                `${g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}${g.Installer.firstName} ${
                                  g.Installer.lastName
                                }`
                              )
                            }
                            disabled={!!approving[firstId]}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors disabled:opacity-50"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="text-sm font-medium">Correction</span>
                          </button>
                        )
                      })()}
                      <button
                        onClick={() => {
                          const firstId = g.requestIds[0]
                          const first = firstId ? requestsById.get(firstId) : null
                          const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                          const isAgreement = action === 'approve_agreement' && g.requestIds.length === 1
                          const label = `${g.Installer.companyName ? `${g.Installer.companyName} — ` : ''}${g.Installer.firstName} ${g.Installer.lastName}`
                          if (isAgreement && firstId) openAgreementModal(firstId, label)
                          else g.requestIds.length > 1 ? handleApproveMany(g.requestIds) : handleApprove(g.requestIds[0])
                        }}
                        disabled={g.requestIds.some((id) => !!approving[id])}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {(() => {
                            const firstId = g.requestIds[0]
                            const first = firstId ? requestsById.get(firstId) : null
                            const action = typeof (first?.payload as any)?.action === 'string' ? String((first?.payload as any).action) : ''
                            const isAgreement = action === 'approve_agreement' && g.requestIds.length === 1
                            return isAgreement ? 'Sign & Approve' : g.requestIds.length > 1 ? 'Approve All' : 'Approve'
                          })()}
                        </span>
                      </button>
                    </div>
                  </div>

                  {diffs.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-800">Changes (from → to)</div>
                        {diffs.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setExpanded((p) => ({ ...p, [g.key]: !p[g.key] }))}
                            className="text-sm text-brand-green hover:underline"
                          >
                            {isExpanded ? 'Show less' : `Show all (${diffs.length})`}
                          </button>
                        )}
                      </div>
                      {/* Mobile Card View */}
                      <div className="lg:hidden mt-2 space-y-2">
                        {visibleDiffs.map((d) => (
                          <div key={d.field} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="font-semibold text-slate-800 text-sm mb-2">{humanizeField(d.field)}</div>
                            <div className="space-y-1.5">
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">From:</div>
                                <div className="text-sm text-slate-600 break-words">{formatValue(d.from)}</div>
                              </div>
                              <div>
                                <div className="text-xs text-slate-500 mb-0.5">To:</div>
                                <div className="text-sm text-slate-900 font-medium break-words">{formatValue(d.to)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Desktop Table View */}
                      <div className="hidden lg:block mt-2 overflow-x-auto">
                        <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">Field</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">From</th>
                              <th className="text-left px-3 py-2 font-semibold text-slate-700 border-b border-slate-200">To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleDiffs.map((d) => (
                              <tr key={d.field} className="align-top">
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-800 whitespace-nowrap">
                                  {humanizeField(d.field)}
                                </td>
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-600 max-w-[360px]">
                                  <div className="break-words">{formatValue(d.from)}</div>
                                </td>
                                <td className="px-3 py-2 border-b border-slate-100 text-slate-900 max-w-[360px]">
                                  <div className="break-words font-medium">{formatValue(d.to)}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                      </>
                    )
                  })()}
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl shadow-md border border-slate-200/60 p-4 sm:p-6">
              <div className="text-sm text-slate-700">
                Showing <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                <span className="font-semibold text-slate-900">{totalCount}</span> approvals
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                          currentPage === pageNum
                            ? 'bg-gradient-to-r from-brand-green to-emerald-600 text-white shadow-lg shadow-brand-green/30'
                            : 'text-slate-700 hover:bg-brand-green/10 hover:text-brand-green border-2 border-transparent hover:border-brand-green/20'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border-2 border-slate-200 rounded-xl hover:bg-brand-green/10 hover:border-brand-green/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200"
                >
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

