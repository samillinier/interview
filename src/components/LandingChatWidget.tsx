'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { ChevronDown, Loader2, Maximize2, Minimize2, Send } from 'lucide-react'
import alicePhoto from '@/images/alice-interviewer.png'
import { ChatLauncherButton } from '@/components/ChatLauncherButton'
import { LinkifiedText } from '@/components/LinkifiedText'
import { AI_FALLBACK_WAIT_MS } from '@/lib/website-chat'

const TOKEN_KEY = 'fis-website-chat-token'
const OPEN_KEY = 'fis-website-chat-open'
const NAME_KEY = 'fis-website-chat-name'
const EMAIL_KEY = 'fis-website-chat-email'
const SEEN_KEY = 'fis-website-chat-seen-at'

type ChatMessage = {
  id: string
  senderType: string
  senderName?: string | null
  content: string
  createdAt: string
}

function formatRelativeTime(dateString: string) {
  const diff = Date.now() - new Date(dateString).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'Just now'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

function ensureVisitorToken() {
  try {
    const existing = localStorage.getItem(TOKEN_KEY) || ''
    if (existing.length >= 16) return existing
    const bytes = new Uint8Array(24)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(TOKEN_KEY, token)
    return token
  } catch {
    return ''
  }
}

export function LandingChatWidget({
  embed = false,
  initialToken = '',
}: { embed?: boolean; initialToken?: string } = {}) {
  const { data: session, status } = useSession()
  // Embed (WordPress iframe) must always show the visitor chat — never hide for
  // staff or let the admin inbox take over this surface.
  const isStaff = !embed && status === 'authenticated'
  const [open, setOpen] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [started, setStarted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [seenAt, setSeenAt] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const identityRef = useRef({ name: '', email: '' })
  const tokenRef = useRef('')
  const startedRef = useRef(false)
  const lastIdRef = useRef('')
  const aiFallbackTimerRef = useRef<number | null>(null)

  tokenRef.current = token
  startedRef.current = started
  lastIdRef.current = messages[messages.length - 1]?.id || ''

  const markSeen = () => {
    const next = Date.now()
    setSeenAt(next)
    try {
      localStorage.setItem(SEEN_KEY, String(next))
    } catch {
      // ignore
    }
  }

  const persistOpen = (next: boolean) => {
    setOpen(next)
    try {
      sessionStorage.setItem(OPEN_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (embed) return
    try {
      const stored = sessionStorage.getItem(OPEN_KEY)
      if (stored === '0') {
        setOpen(false)
      } else {
        setOpen(true)
      }
      const seen = Number(localStorage.getItem(SEEN_KEY) || 0)
      if (Number.isFinite(seen) && seen > 0) setSeenAt(seen)
    } catch {
      setOpen(true)
    }
  }, [embed])

  useEffect(() => {
    if (!embed) return
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (data && data.source === 'fis-chat-parent' && data.type === 'open') {
        setOpen(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [embed])

  useEffect(() => {
    if (!embed) return
    const unread = open
      ? 0
      : messages.filter(
          (message) =>
            (message.senderType === 'admin' || message.senderType === 'alice') &&
            new Date(message.createdAt).getTime() > seenAt,
        ).length
    window.parent.postMessage(
      { source: 'fis-chat', type: 'state', open, expanded, unread, token: tokenRef.current },
      '*',
    )
  }, [embed, open, expanded, messages, seenAt, token])

  const resetSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SEEN_KEY)
    setToken('')
    setStarted(false)
    setMessages([])
    setSeenAt(0)
  }

  const applyKnownIdentity = (nextName?: string | null, nextEmail?: string | null) => {
    setName((current) => {
      if (current.trim()) return current
      if (nextName && !String(nextName).startsWith('Visitor ')) {
        try {
          localStorage.setItem(NAME_KEY, nextName)
        } catch {
          // ignore
        }
        return nextName
      }
      return current
    })
    setEmail((current) => {
      if (current.trim()) return current
      if (nextEmail && !String(nextEmail).endsWith('@noreply.local')) {
        try {
          localStorage.setItem(EMAIL_KEY, nextEmail)
        } catch {
          // ignore
        }
        return nextEmail
      }
      return current
    })
  }

  useEffect(() => {
    identityRef.current = {
      name: name.trim() || session?.user?.name || '',
      email: email.trim() || session?.user?.email || '',
    }
    try {
      if (name.trim()) localStorage.setItem(NAME_KEY, name.trim())
      if (email.trim()) localStorage.setItem(EMAIL_KEY, email.trim())
    } catch {
      // ignore
    }
  }, [name, email, session])

  useEffect(() => {
    try {
      const storedName = localStorage.getItem(NAME_KEY) || ''
      const storedEmail = localStorage.getItem(EMAIL_KEY) || ''
      if (storedName) setName(storedName)
      if (storedEmail) setEmail(storedEmail)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!name && session?.user?.name) setName(session.user.name)
    if (!email && session?.user?.email) setEmail(session.user.email)
  }, [session, name, email])

  useEffect(() => {
    if (!embed && status === 'authenticated') return
    let cancelled = false
    const stored = initialToken || ensureVisitorToken()
    if (stored) {
      tokenRef.current = stored
      setToken(stored)
    }
    void fetch('/api/website-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(stored ? { 'x-website-chat-token': stored } : {}),
      },
      body: JSON.stringify({ presence: true, ...identityRef.current }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data?.token) return
        localStorage.setItem(TOKEN_KEY, data.token)
        tokenRef.current = data.token
        setToken(data.token)
        applyKnownIdentity(data.chat?.name, data.chat?.email)
        if (Number(data.chat?.messageCount || 0) > 0) {
          startedRef.current = true
          setStarted(true)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status, initialToken, embed])

  useEffect(() => {
    if (!embed && status === 'authenticated') return
    const stored = initialToken || ensureVisitorToken()
    if (stored) setToken((prev) => prev || stored)
    let currentToken = stored
    const ping = () => {
      const headerToken = currentToken || tokenRef.current || ensureVisitorToken()
      if (!headerToken) return
      currentToken = headerToken
      void fetch('/api/website-chat/ping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-website-chat-token': headerToken,
        },
        body: JSON.stringify(identityRef.current),
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {})
    }
    ping()
    const timer = window.setInterval(ping, 4000)
    return () => window.clearInterval(timer)
  }, [status, initialToken, embed])

  const loadMessages = useCallback(async (nextToken = tokenRef.current, wait = false, signal?: AbortSignal) => {
    if (!nextToken) return
    const res = await fetch('/api/website-chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-website-chat-token': nextToken,
      },
      body: JSON.stringify({
        poll: true,
        sinceId: lastIdRef.current,
        waitMs: wait ? 8000 : 0,
        t: Date.now(),
      }),
      signal,
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 404) return
    if (res.ok && Array.isArray(data.messages)) {
      const next = data.messages as ChatMessage[]
      const previousLastId = lastIdRef.current
      const nextLastId = next[next.length - 1]?.id || ''
      lastIdRef.current = nextLastId || previousLastId
      setMessages((current) => {
        if (
          current.length === next.length &&
          current[current.length - 1]?.id === next[next.length - 1]?.id
        ) {
          return current
        }
        return next
      })
      const staffWrote = next.some((message) => message.senderType === 'admin' || message.senderType === 'alice')
      if (next.length > 0 && staffWrote) {
        startedRef.current = true
        setStarted(true)
      }
      const newestIsStaff = next[next.length - 1]?.senderType === 'admin' || next[next.length - 1]?.senderType === 'alice'
      if (newestIsStaff && nextLastId && nextLastId !== previousLastId) {
        if (aiFallbackTimerRef.current) {
          window.clearTimeout(aiFallbackTimerRef.current)
          aiFallbackTimerRef.current = null
        }
      }
      const newestIsAdmin = next[next.length - 1]?.senderType === 'admin'
      if (newestIsAdmin && nextLastId && nextLastId !== previousLastId) {
        setOpen(true)
        try {
          sessionStorage.setItem(OPEN_KEY, '1')
        } catch {
          // ignore
        }
      }
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') return
    let cancelled = false
    const controller = new AbortController()

    const run = async () => {
      while (!cancelled) {
        const nextToken = tokenRef.current || ensureVisitorToken()
        if (nextToken) tokenRef.current = nextToken
        if (!nextToken) {
          await new Promise((resolve) => window.setTimeout(resolve, 400))
          continue
        }
        try {
          await loadMessages(nextToken, true, controller.signal)
        } catch (err) {
          if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return
          await new Promise((resolve) => window.setTimeout(resolve, 800))
        }
      }
    }

    void run()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadMessages(tokenRef.current).catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      cancelled = true
      controller.abort()
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [status, loadMessages])

  useEffect(() => {
    return () => {
      if (aiFallbackTimerRef.current) window.clearTimeout(aiFallbackTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    markSeen()
  }, [open, messages.length])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, open])

  const startChat = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setStarting(true)
    try {
      const chatToken = token || ensureVisitorToken()
      if (chatToken) {
        tokenRef.current = chatToken
        setToken(chatToken)
      }
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(chatToken ? { 'x-website-chat-token': chatToken } : {}),
        },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not start chat')
      const nextToken = String(data.token || chatToken || '')
      if (nextToken) {
        localStorage.setItem(TOKEN_KEY, nextToken)
        tokenRef.current = nextToken
        setToken(nextToken)
      }
      if (data.chat?.name) setName(data.chat.name)
      if (data.chat?.email && !String(data.chat.email).endsWith('@noreply.local')) {
        setEmail(data.chat.email)
      }
      startedRef.current = true
      setStarted(true)
      await loadMessages(nextToken || tokenRef.current)
    } catch (err: any) {
      setError(err.message || 'Could not start chat')
    } finally {
      setStarting(false)
    }
  }

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !token) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/website-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-website-chat-token': token },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 404) {
        resetSession()
        throw new Error('Chat ended. Please start a new chat.')
      }
      if (!res.ok) throw new Error(data.error || 'Could not send')
      setDraft('')
      setMessages((current) => {
        const next = [...current]
        if (data.message && !next.some((message) => message.id === data.message.id)) {
          next.push(data.message)
        }
        if (data.aliceMessage && !next.some((message) => message.id === data.aliceMessage.id)) {
          next.push(data.aliceMessage)
        }
        return next
      })
      if (data.aliceMessage) {
        if (aiFallbackTimerRef.current) {
          window.clearTimeout(aiFallbackTimerRef.current)
          aiFallbackTimerRef.current = null
        }
      } else {
        const chatToken = token
        if (aiFallbackTimerRef.current) window.clearTimeout(aiFallbackTimerRef.current)
        aiFallbackTimerRef.current = window.setTimeout(async () => {
          aiFallbackTimerRef.current = null
          try {
            const res = await fetch('/api/website-chat/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-website-chat-token': chatToken },
              body: JSON.stringify({ requestAi: true }),
            })
            const fallback = await res.json().catch(() => ({}))
            if (fallback.aliceMessage) {
              setMessages((current) => {
                if (current.some((message) => message.id === fallback.aliceMessage.id)) return current
                return [...current, fallback.aliceMessage]
              })
            }
          } catch {
            // ignore
          }
        }, AI_FALLBACK_WAIT_MS)
      }
    } catch (err: any) {
      setError(err.message || 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const adminJoined = messages.some((message) => message.senderType === 'admin')
  const showThread = started || adminJoined || messages.some((message) => message.senderType === 'alice')
  const unreadCount = open
    ? 0
    : messages.filter(
        (message) =>
          (message.senderType === 'admin' || message.senderType === 'alice') &&
          new Date(message.createdAt).getTime() > seenAt,
      ).length

  if (isStaff) return null

  if (!open) {
    if (embed) return null
    return (
      <ChatLauncherButton
        onClick={() => persistOpen(true)}
        ariaLabel={unreadCount > 0 ? `Open chat support, ${unreadCount} new messages` : 'Open chat support'}
        variant="white"
        unreadCount={unreadCount}
      />
    )
  }

  const sizeClass = embed
    ? (expanded ? 'h-[720px] w-[420px]' : 'h-[560px] w-[380px]')
    : (expanded ? 'h-[min(720px,90vh)] w-[min(100%-1.5rem,420px)]' : 'h-[min(560px,82vh)] w-[min(100%-1.5rem,380px)]')
  const positionClass = embed ? 'bottom-0 right-0' : 'bottom-4 right-4'

  const handleMinimize = () => {
    if (embed) {
      window.parent.postMessage({ source: 'fis-chat', type: 'minimize' }, '*')
      return
    }
    persistOpen(false)
  }

  return (
    <div className={`fixed ${positionClass} z-40 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(74,124,35,0.18)] ${sizeClass}`}>
      <div className="bg-brand-green px-4 pb-4 pt-2 text-white">
        <div className="mb-3 flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label={expanded ? 'Shrink chat' : 'Expand chat'}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleMinimize}
            className="rounded-lg p-1.5 hover:bg-white/10"
            aria-label="Minimize chat"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-white ring-2 ring-white">
            <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
          </span>
          <div className="min-w-0">
            <p className="text-[22px] font-semibold leading-tight tracking-tight">How can we help?</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4ADE80]" />
              {adminJoined ? 'A team member has joined' : 'Alice can help with onboarding'}
            </p>
          </div>
        </div>
      </div>

      {!showThread ? (
        <form onSubmit={startChat} className="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <p className="text-sm text-slate-600">
            Name and email are optional. If you skip them, we will start the chat as a visitor.
          </p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name (optional)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email (optional)"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={starting}
            className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
          >
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Start chat
          </button>
        </form>
      ) : (
        <>
          <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-white px-4 py-5">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Ask about onboarding, insurance, or required documents.</p>
            ) : (
              messages.map((message) => {
                const fromStaff = message.senderType === 'admin' || message.senderType === 'alice'
                return (
                  <div key={message.id} className={`flex ${fromStaff ? 'items-end gap-2.5 justify-start' : 'justify-end'}`}>
                    {fromStaff ? (
                      <span className="relative mb-6 h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-white shadow-sm">
                        <Image src={alicePhoto} alt="Support" className="h-full w-full object-cover object-top" />
                      </span>
                    ) : null}
                    <div className={`min-w-0 ${fromStaff ? 'max-w-[calc(100%-2.75rem)]' : 'max-w-[78%]'}`}>
                      <div className="relative">
                        <div
                          className={`relative z-[1] break-words text-[15px] leading-relaxed [overflow-wrap:anywhere] ${
                            fromStaff
                              ? 'whitespace-pre-wrap rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-slate-800'
                              : 'rounded-2xl rounded-br-md bg-brand-green px-4 py-2.5 font-medium text-white'
                          }`}
                        >
                          {fromStaff ? <LinkifiedText text={message.content} /> : message.content}
                        </div>
                        <span
                          aria-hidden
                          className={`absolute bottom-3 h-2.5 w-2.5 rotate-45 ${
                            fromStaff ? '-left-[5px] bg-slate-100' : '-right-[5px] bg-brand-green'
                          }`}
                        />
                      </div>
                      {fromStaff ? (
                        <p className="mt-1.5 pl-1 text-xs text-slate-400">{formatRelativeTime(message.createdAt)}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="border-t border-slate-100 p-3">
            {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50"
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
