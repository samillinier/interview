'use client'

import { useEffect, useRef, useState } from 'react'
import { SmilePlus } from 'lucide-react'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉', '🔥']

export type MessageReaction = {
  id: string
  emoji: string
  reactorId: string
  reactorType: string
  reactorName?: string | null
}

type Viewer = { id: string; type: string } | null | undefined

type GroupedReaction = {
  emoji: string
  count: number
  mine: boolean
  names: string[]
}

function groupReactions(items: MessageReaction[], viewer?: Viewer): GroupedReaction[] {
  const map = new Map<string, GroupedReaction>()
  for (const r of items) {
    if (!map.has(r.emoji)) {
      map.set(r.emoji, { emoji: r.emoji, count: 0, mine: false, names: [] })
    }
    const g = map.get(r.emoji)!
    g.count += 1
    if (r.reactorName) g.names.push(r.reactorName)
    if (viewer && r.reactorId === viewer.id && r.reactorType === viewer.type) {
      g.mine = true
    }
  }
  return Array.from(map.values())
}

async function postReaction(messageId: string, emoji: string): Promise<MessageReaction[] | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const installerToken =
    typeof window !== 'undefined' ? window.localStorage.getItem('installerToken') : null
  if (installerToken) headers.Authorization = `Bearer ${installerToken}`
  const res = await fetch(`/api/notifications/${messageId}/reactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ emoji }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data.reactions) ? data.reactions : null
}

/**
 * Reaction pills. Rendered below the bubble in normal flow.
 */
export function MessageReactions({
  messageId,
  reactions = [],
  viewer,
  align = 'left',
  onToggled,
}: {
  messageId: string
  reactions?: MessageReaction[]
  viewer?: Viewer
  align?: 'left' | 'right'
  onToggled?: (reactions: MessageReaction[]) => void
}) {
  const grouped = groupReactions(reactions, viewer)
  if (grouped.length === 0) return null

  const justify = align === 'right' ? 'justify-end' : 'justify-start'

  return (
    <div className={`flex flex-wrap items-center gap-1.5 mt-1.5 ${justify}`}>
      {grouped.map((g) => (
        <button
          key={g.emoji}
          type="button"
          title={g.names.join(', ')}
          onClick={async () => {
            const next = await postReaction(messageId, g.emoji)
            if (next) onToggled?.(next)
          }}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
            g.mine
              ? 'border-brand-green bg-brand-green/10 text-brand-green'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>{g.emoji}</span>
          <span>{g.count}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * The "add reaction" button with emoji picker. Rendered inline (beside the
 * bubble) so it never pushes the bubble or gets grouped with the avatar.
 */
export function MessageReactionButton({
  messageId,
  align = 'left',
  onToggled,
}: {
  messageId: string
  align?: 'left' | 'right'
  onToggled?: (reactions: MessageReaction[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const toggle = async (emoji: string) => {
    if (busy) return
    setBusy(true)
    try {
      const next = await postReaction(messageId, emoji)
      if (next) onToggled?.(next)
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative flex-shrink-0 self-end mb-1">
      {open && (
        <div
          ref={pickerRef}
          className="absolute bottom-full mb-2 z-30 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-xl"
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => toggle(e)}
              className="text-xl leading-none p-1 rounded-full hover:bg-slate-100 transition-colors"
              aria-label={`React ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-brand-green hover:bg-brand-green/10 bg-white/80 shadow-sm transition-colors"
        aria-label="Add reaction"
        title="React"
      >
        <SmilePlus className="w-4 h-4" />
      </button>
    </div>
  )
}
