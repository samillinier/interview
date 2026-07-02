'use client'

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Copy, Keyboard, RefreshCw, Upload, X } from 'lucide-react'

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

type EditorDocumentType = 'pdf' | 'image'

const MARKUP_COLOR_SHORTCUTS: Record<string, string> = {
  '1': '#dc2626',
  '2': '#2563eb',
  '3': '#16a34a',
  '4': '#f59e0b',
  '5': '#111827',
  '6': '#9333ea',
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

function isModifierKey(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey
}

function getDocumentType(documentName: string, explicitType?: EditorDocumentType): EditorDocumentType | null {
  if (explicitType) return explicitType
  if (/\.pdf$/i.test(documentName)) return 'pdf'
  if (/\.(png|jpe?g)$/i.test(documentName)) return 'image'
  return null
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

export function PdfMarkupEditor({
  documentUrl,
  documentName,
  documentType,
  onEditedFile,
}: {
  documentUrl: string
  documentName: string
  documentType?: EditorDocumentType
  onEditedFile: (file: File) => void
}) {
  const resolvedDocumentType = getDocumentType(documentName, documentType)
  const isImageDocument = resolvedDocumentType === 'image'
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
  const imageRef = useRef<HTMLImageElement | null>(null)
  const renderTokenRef = useRef(0)
  const baseCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const markCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({})
  const snapshotRef = useRef<ImageData | null>(null)
  const undoStackRef = useRef<PdfUndoAction[]>([])
  const keyboardHandlersRef = useRef({
    undoLastMarkup: () => {},
    copyEditedImage: async () => {},
    exportEditedDocument: async () => {},
    clearMarks: () => {},
    deleteSelectedMarkup: () => {},
    pasteFromClipboard: async () => {},
    setTool: (_tool: 'shape' | 'text') => {},
    setShapeTool: (_shape: PdfShape['type']) => {},
    setSelectedTextBoxId: (_id: string | null) => {},
    setSelectedShapeId: (_id: string | null) => {},
    applyMarkupColor: (_color: string) => {},
  })
  const [undoVersion, setUndoVersion] = useState(0)
  const [showShortcuts, setShowShortcuts] = useState(false)

  useEffect(() => {
    let cancelled = false

    const resetEditor = () => {
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
      imageRef.current = null
      baseCanvasRefs.current = {}
      markCanvasRefs.current = {}
    }

    const loadDocument = async () => {
      if (!documentUrl || !resolvedDocumentType) return
      resetEditor()

      try {
        if (resolvedDocumentType === 'image') {
          const image = new Image()
          image.crossOrigin = 'anonymous'
          image.src = documentUrl
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error('Could not load this image for editing.'))
          })
          const maxWidth = 1600
          const scale = Math.min(1, maxWidth / image.naturalWidth)
          if (!cancelled) {
            imageRef.current = image
            setPages([
              {
                pageNumber: 1,
                width: Math.max(1, Math.round(image.naturalWidth * scale)),
                height: Math.max(1, Math.round(image.naturalHeight * scale)),
              },
            ])
          }
          return
        }

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
        if (!cancelled) setError(e?.message || 'Could not load this document for editing.')
        if (!cancelled) setLoading(false)
      }
    }

    loadDocument()
    return () => {
      cancelled = true
      renderTokenRef.current += 1
    }
  }, [documentUrl, resolvedDocumentType])

  useEffect(() => {
    const pdf = pdfDocRef.current
    const image = imageRef.current
    if ((!pdf && !image) || pages.length === 0) return

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

        if (image) {
          const pageInfo = pages[0]
          const canvas = baseCanvasRefs.current[pageInfo.pageNumber]
          const marks = markCanvasRefs.current[pageInfo.pageNumber]
          if (!canvas) throw new Error('Image canvas is not ready yet.')
          canvas.width = pageInfo.width
          canvas.height = pageInfo.height
          if (marks) {
            marks.width = pageInfo.width
            marks.height = pageInfo.height
          }
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Could not prepare image canvas.')
          context.clearRect(0, 0, pageInfo.width, pageInfo.height)
          context.drawImage(image, 0, 0, pageInfo.width, pageInfo.height)
          return
        }

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
        if (!cancelled) setError(e?.message || 'Could not render this document.')
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
      if (!base) throw new Error('Document page is not ready yet.')
      const merged = document.createElement('canvas')
      merged.width = base.width
      merged.height = base.height
      const ctx = merged.getContext('2d')
      if (!ctx) throw new Error('Could not prepare edited document.')
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

  const createEditedFile = async () => {
    const mergedCanvases = createMergedCanvases()
    const baseName = (documentName || 'correction').replace(/\.(pdf|png|jpe?g)$/i, '')
    if (isImageDocument) {
      const blob = await canvasToBlob(mergedCanvases[0], 'image/jpeg', 0.9)
      return new File([blob], `${baseName}-correction.jpg`, { type: 'image/jpeg' })
    }
    const blob = await buildPdfFromCanvases(mergedCanvases)
    return new File([blob], `${baseName}-correction.pdf`, { type: 'application/pdf' })
  }

  const createCopiedImageBlob = async () => {
    const mergedCanvases = createMergedCanvases()
    if (mergedCanvases.length === 0) throw new Error('Document page is not ready yet.')

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

  const exportEditedDocument = async () => {
    setExporting(true)
    setError('')
    try {
      const file = await createEditedFile()
      onEditedFile(file)
    } catch (e: any) {
      setError(e?.message || 'Could not create edited document.')
    } finally {
      setExporting(false)
    }
  }

  const deleteSelectedMarkup = () => {
    if (selectedTextBoxId) {
      const id = selectedTextBoxId
      setTextBoxes((prev) => prev.filter((box) => box.id !== id))
      setSelectedTextBoxId(null)
      return
    }
    if (selectedShapeId) {
      const id = selectedShapeId
      setShapes((prev) => prev.filter((shape) => shape.id !== id))
      setSelectedShapeId(null)
    }
  }

  const pasteImageBlob = async (blob: Blob) => {
    const pageNumber = pages[0]?.pageNumber ?? 1
    const canvas = markCanvasRefs.current[pageNumber]
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) throw new Error('Document is not ready for paste.')

    const img = await createImageBitmap(blob)
    pushUndo({ type: 'draw', pageNumber, imageData: ctx.getImageData(0, 0, canvas.width, canvas.height) })
    const maxSize = Math.min(canvas.width, canvas.height) * 0.45
    const scale = Math.min(1, maxSize / img.width, maxSize / img.height)
    const width = img.width * scale
    const height = img.height * scale
    const x = (canvas.width - width) / 2
    const y = (canvas.height - height) / 2
    ctx.drawImage(img, x, y, width, height)
  }

  const pasteFromClipboard = async () => {
    if (pages.length === 0) return
    setError('')
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((type) => type.startsWith('image/'))
          if (imageType) {
            const blob = await item.getType(imageType)
            await pasteImageBlob(blob)
            return
          }
        }
      }
      const text = await navigator.clipboard.readText()
      if (text?.trim()) {
        setTool('text')
        setTextToPlace(text)
        return
      }
      setError('Clipboard is empty or does not contain text or an image.')
    } catch (e: any) {
      setError(e?.message || 'Could not paste from clipboard. Allow clipboard access and try again.')
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

  keyboardHandlersRef.current = {
    undoLastMarkup,
    copyEditedImage,
    exportEditedDocument,
    clearMarks,
    deleteSelectedMarkup,
    pasteFromClipboard,
    setTool,
    setShapeTool,
    setSelectedTextBoxId,
    setSelectedShapeId,
    applyMarkupColor,
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const mod = isModifierKey(event)
      const handlers = keyboardHandlersRef.current
      const editorBusy = loading || exporting || copying

      if (mod && key === 's') {
        event.preventDefault()
        if (!editorBusy && pages.length > 0) void handlers.exportEditedDocument()
        return
      }

      if (isEditableTarget(event.target)) return

      if (mod && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handlers.undoLastMarkup()
        return
      }

      if (mod && key === 'c') {
        event.preventDefault()
        if (!editorBusy && pages.length > 0) void handlers.copyEditedImage()
        return
      }

      if (mod && key === 'v') {
        event.preventDefault()
        if (!editorBusy && pages.length > 0) void handlers.pasteFromClipboard()
        return
      }

      if ((key === 'delete' || key === 'backspace') && !mod) {
        event.preventDefault()
        handlers.deleteSelectedMarkup()
        return
      }

      if (key === 'escape') {
        handlers.setSelectedTextBoxId(null)
        handlers.setSelectedShapeId(null)
        return
      }

      if (key === '?' && !mod) {
        event.preventDefault()
        setShowShortcuts((prev) => !prev)
        return
      }

      const shortcutColor = MARKUP_COLOR_SHORTCUTS[key]
      if (shortcutColor && !mod) {
        handlers.applyMarkupColor(shortcutColor)
        return
      }

      if (mod) return

      switch (key) {
        case 't':
          handlers.setTool('text')
          break
        case 'd':
          handlers.setTool('shape')
          handlers.setShapeTool('draw')
          break
        case 'o':
          handlers.setTool('shape')
          handlers.setShapeTool('circle')
          break
        case 'r':
          handlers.setTool('shape')
          handlers.setShapeTool('rectangle')
          break
        case 'l':
          handlers.setTool('shape')
          handlers.setShapeTool('line')
          break
        case 'a':
          handlers.setTool('shape')
          handlers.setShapeTool('arrow')
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [loading, exporting, copying, pages.length])

  if (!resolvedDocumentType) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        In-browser editing is available for PDF, JPG, and PNG files.
      </div>
    )
  }

  const canUndo = undoVersion >= 0 && undoStackRef.current.length > 0
  const modLabel = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl'

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-bold text-slate-900">{isImageDocument ? 'Image editor' : 'PDF editor'}</div>
          <div className="text-xs text-slate-600">
            Draw, circle, or add text directly on the {isImageDocument ? 'image' : 'PDF'}, then use it as the correction file.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              showShortcuts ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3.5 w-3.5" />
            Shortcuts
          </button>
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${
              tool === 'shape' ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
            }`}
          >
            <button
              type="button"
              onClick={() => setTool('shape')}
              className={`text-xs font-semibold ${tool === 'shape' ? 'text-red-700' : 'text-slate-700'}`}
              title="Shape tools (D draw, O circle, R box, L line, A arrow)"
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
            title="Text tool (T)"
          >
            Text
          </button>
          <button
            type="button"
            onClick={undoLastMarkup}
            disabled={!canUndo}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            title={`Undo (${modLabel}+Z)`}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={clearMarks}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            title="Clear all markup"
          >
            Clear
          </button>
        </div>
      </div>

      {showShortcuts ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Keyboard shortcuts</div>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close shortcuts"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs text-slate-700">
            <div>
              <div className="mb-2 font-bold uppercase tracking-wide text-slate-500">General</div>
              <ul className="space-y-1.5">
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">{modLabel}+Z</kbd> Undo</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">{modLabel}+C</kbd> Copy edited image</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">{modLabel}+V</kbd> Paste text or image</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">{modLabel}+S</kbd> Use edited file</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">Delete</kbd> Remove selected item</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">Esc</kbd> Deselect</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">?</kbd> Toggle this panel</li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-bold uppercase tracking-wide text-slate-500">Tools</div>
              <ul className="space-y-1.5">
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">T</kbd> Text</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">D</kbd> Draw</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">O</kbd> Circle</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">R</kbd> Box</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">L</kbd> Line</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">A</kbd> Arrow</li>
              </ul>
            </div>
            <div>
              <div className="mb-2 font-bold uppercase tracking-wide text-slate-500">Colors</div>
              <ul className="space-y-1.5">
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">1</kbd> Red</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">2</kbd> Blue</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">3</kbd> Green</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">4</kbd> Yellow</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">5</kbd> Black</li>
                <li><kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">6</kbd> Purple</li>
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Shortcuts work when you are not typing in a text field. Paste supports clipboard images and text.
          </p>
        </div>
      ) : null}

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
            placeholder={`Type text, then click anywhere on the ${isImageDocument ? 'image' : 'PDF'} to place it`}
          />
          <p className="mt-2 text-xs text-red-700">
            Click the {isImageDocument ? 'image' : 'PDF'} to place text. Drag placed text to move it, or edit it from the list below.
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
          Loading {isImageDocument ? 'image' : 'PDF'} editor...
        </div>
      ) : null}

      {error ? <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="mt-4 max-h-[68vh] space-y-4 overflow-auto rounded-xl bg-slate-200/60 p-3">
        {pages.map((page) => (
          <div key={page.pageNumber} className="mx-auto w-fit rounded-lg bg-white p-2 shadow-sm">
            <div className="mb-2 text-xs font-semibold text-slate-500">{isImageDocument ? 'Image' : `Page ${page.pageNumber}`}</div>
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
          title={`Copy edited image (${modLabel}+C)`}
        >
          {copying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={exportEditedDocument}
          disabled={loading || exporting || copying || pages.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          title={`Use edited file (${modLabel}+S)`}
        >
          {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Use Edited {isImageDocument ? 'Image' : 'PDF'}
        </button>
      </div>
    </div>
  )
}
