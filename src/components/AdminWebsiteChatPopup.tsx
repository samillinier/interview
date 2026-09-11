'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ChevronLeft, Loader2, Minus, Send, X } from 'lucide-react'
import alicePhoto from '@/images/alice-interviewer.png'
import { ChatLauncherButton } from '@/components/ChatLauncherButton'
import { isStaffSender, isWebsiteChatId } from '@/lib/website-chat'

type WebsiteVisitor = {
  id: string
  name: string
  email: string
  online: boolean
  unreadCount: number
  preview: string
}

type ChatMessage = {
  id: string
  senderType: string
  content: string
  createdAt: string
}

function visitorName(row: {
  Installer?: { id?: string; firstName?: string; lastName?: string; email?: string; online?: boolean }
  installerId?: string
}) {
  const first = String(row.Installer?.firstName || '').trim()
  const last = String(row.Installer?.lastName || '').trim()
  return `${first} ${last}`.trim() || row.Installer?.email || 'Website visitor'
}

export function AdminWebsiteChatPopup() {
  const pathname = usePathname()
  const { status } = useSession()
  const [open, setOpen] = useState(false)
  const [visitors, setVisitors] = useState<WebsiteVisitor[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const persistOpen = (next: boolean) => {
    setOpen(next)
    try {
      localStorage.setItem('fis-admin-website-chat-open', next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fis-admin-website-chat-open')
      if (stored === '1') setOpen(true)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (status !== 'authenticated' && status !== 'loading') return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/admin/website-chats', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        const nextVisitors: WebsiteVisitor[] = (data.conversations || [])
          .filter((row: { installerId?: string }) => isWebsiteChatId(row.installerId))
          .map((row: any) => ({
            id: String(row.Installer?.id || row.installerId),
            name: visitorName(row),
            email: String(row.Installer?.email || ''),
            online: Boolean(row.Installer?.online),
            unreadCount: Number(row.unreadCount || 0),
            preview: String(row.lastMessage?.content || ''),
          }))
          .sort((a: WebsiteVisitor, b: WebsiteVisitor) => {
            if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
            if (a.online !== b.online) return a.online ? -1 : 1
            return a.name.localeCompare(b.name)
          })
        setVisitors(nextVisitors)
      } catch {
        // ignore
      }
    }
    void load()
    const timer = window.setInterval(load, 3000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [pathname, status])

  useEffect(() => {
    if (!open || !selectedId) {
      setMessages([])
      return
    }
    let cancelled = false
    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/admin/website-chats/${selectedId}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (cancelled || !res.ok) return
        setMessages(data.notifications || [])
        if ((data.notifications || []).some((message: ChatMessage) => message.senderType === 'visitor')) {
          void fetch(`/api/admin/website-chats/${selectedId}`, { method: 'PATCH' }).catch(() => {})
        }
      } catch {
        // ignore
      }
    }
    void loadMessages()
    const timer = window.setInterval(loadMessages, 4000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, selectedId])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, open, selectedId])

  if (status !== 'authenticated') return null
  const path = pathname || ''
  if (
    path.startsWith('/installer') ||
    path.startsWith('/property') ||
    path.startsWith('/interview') ||
    path.startsWith('/login')
  ) {
    return null
  }

  const selected = visitors.find((row) => row.id === selectedId) || null
  const onlineCount = visitors.filter((row) => row.online).length
  const unreadCount = visitors.reduce((sum, row) => sum + row.unreadCount, 0)

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !selectedId) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/website-chats/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setDraft('')
        if (data.notification) setMessages((current) => [...current, data.notification])
      }
    } finally {
      setSending(false)
    }
  }

  const positionClass = 'right-4 bottom-4'

  if (!open) {
    return (
      <ChatLauncherButton
        onClick={() => persistOpen(true)}
        className={positionClass}
        zClass="z-[200]"
        unreadCount={unreadCount}
      />
    )
  }

  return (
    <div className={`fixed bottom-4 ${positionClass} z-[200] flex h-[min(520px,78vh)] w-[min(100%-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(74,124,35,0.18)]`}>
      <div className="flex items-center justify-between bg-brand-green px-3 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-2">
          {selected ? (
            <button
              type="button"
              onClick={() => setSelectedId('')}
              className="rounded-lg p-1 hover:bg-white/10"
              aria-label="Back to visitors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/40">
              <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{selected ? selected.name : 'Chat'}</p>
            <p className="text-[11px] text-white/80">
              {selected
                ? selected.online
                  ? 'Online now'
                  : selected.email?.endsWith('@noreply.local')
                    ? 'Landing page visitor'
                    : selected.email || 'Landing page visitor'
                : onlineCount > 0
                  ? `${onlineCount} online`
                  : 'No one is on the website right now'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => persistOpen(false)} className="rounded-lg p-1 hover:bg-white/10" aria-label="Minimize chat">
            <Minus className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => persistOpen(false)} className="rounded-lg p-1 hover:bg-white/10" aria-label="Close chat">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!selected ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {visitors.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No website visitors yet.</p>
          ) : (
            visitors.map((visitor) => (
              <button
                key={visitor.id}
                type="button"
                onClick={() => setSelectedId(visitor.id)}
                className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
              >
                <span className="relative mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-green text-[11px] font-bold text-white">
                  {visitor.name.slice(0, 2).toUpperCase()}
                  {visitor.online ? (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{visitor.name}</span>
                    {visitor.online ? (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                        Online
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {visitor.preview || (visitor.online ? 'On the website now' : visitor.email?.endsWith('@noreply.local') ? 'Visited the website' : visitor.email)}
                  </span>
                </span>
                {visitor.unreadCount > 0 ? (
                  <span className="rounded-full bg-brand-green px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {visitor.unreadCount}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No messages yet. You can write first.</p>
            ) : (
              messages.map((message) => {
                const fromStaff = isStaffSender(message.senderType)
                return (
                  <div key={message.id} className={`flex items-end gap-2 ${fromStaff ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        fromStaff ? 'bg-brand-green text-white' : 'bg-white text-slate-800 shadow-sm'
                      }`}
                    >
                      <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        fromStaff ? 'text-white/70' : 'text-slate-400'
                      }`}>
                        {message.senderType === 'alice'
                          ? 'Alice'
                          : message.senderType === 'admin'
                            ? 'You'
                            : selected.name}
                      </p>
                      {message.content}
                    </div>
                    {fromStaff ? (
                      <span className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-white shadow-sm">
                        <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
                      </span>
                    ) : null}
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-slate-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Write a message..."
                rows={1}
                className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50"
                aria-label="Send"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}
