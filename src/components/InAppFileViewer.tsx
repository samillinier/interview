'use client'

import { Eye, FileText, X } from 'lucide-react'

export function isViewableImage(url?: string | null, name?: string | null) {
  const haystack = `${url || ''} ${name || ''}`
  return /\.(png|jpe?g|gif|webp|bmp)(\?|#|$)/i.test(haystack)
}

export function isViewablePdf(url?: string | null, name?: string | null) {
  const haystack = `${url || ''} ${name || ''}`
  return /\.pdf(\?|#|$)/i.test(haystack)
}

export function canPreviewInApp(url?: string | null, name?: string | null) {
  return Boolean(url) && (isViewableImage(url, name) || isViewablePdf(url, name))
}

type InAppFileViewerProps = {
  url: string
  name?: string | null
  onClose: () => void
}

export function InAppFileViewer({ url, name, onClose }: InAppFileViewerProps) {
  const image = isViewableImage(url, name)
  const pdf = isViewablePdf(url, name)
  const title = name || (image ? 'Photo' : 'Document')

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/90 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 text-white"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold truncate">{title}</p>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : pdf ? (
          <iframe title={title} src={url} className="w-full h-full rounded-lg bg-white" />
        ) : (
          <div className="text-center text-white px-6">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <p className="text-sm mb-4">This file type can’t preview here.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-sm font-semibold"
            >
              Open file
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

export function ViewFileButton({
  onClick,
  label = 'View',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 p-2.5 sm:p-2 text-brand-green hover:bg-brand-green/10 rounded-xl sm:rounded-lg transition-colors"
      title={label}
    >
      <Eye className="w-5 h-5" />
      <span className="text-sm font-semibold sm:hidden">{label}</span>
    </button>
  )
}
