'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { Loader2, Minus, Send, X } from 'lucide-react'
import alicePhoto from '@/images/alice-interviewer.png'

const TOKEN_KEY = 'fis-website-chat-token'
const OPEN_KEY = 'fis-website-chat-open'
const NAME_KEY = 'fis-website-chat-name'
const EMAIL_KEY = 'fis-website-chat-email'

type ChatMessage = {
  id: string
  senderType: string
  senderName?: string | null
  content: string
  createdAt: string
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

export function LandingChatWidget() {
  const { data: session, status } = useSession()
  const isStaff = status === 'authenticated'
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const identityRef = useRef({ name: '', email: '' })

  const persistOpen = (next: boolean) => {
    setOpen(next)
    try {
      sessionStorage.setItem(OPEN_KEY, next ? '1' : '0')
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(OPEN_KEY)
      if (stored === '0') {
        setOpen(false)
        return
      }
      setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [])

  const resetSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setStarted(false)
    setMessages([])
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
    if (status === 'loading' || status === 'authenticated') return
    let cancelled = false
    const stored = ensureVisitorToken()
    if (stored) setToken(stored)
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
        setToken(data.token)
        applyKnownIdentity(data.chat?.name, data.chat?.email)
        if (Number(data.chat?.messageCount || 0) > 0) setStarted(true)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [status])

  useEffect(() => {
    if (status === 'loading' || status === 'authenticated') return
    const stored = ensureVisitorToken()
    if (stored) setToken((prev) => prev || stored)
    let currentToken = stored
    const ping = () => {
      const headerToken = currentToken || ensureVisitorToken()
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
  }, [status])

  const loadMessages = useCallback(async (nextToken = token) => {
    if (!nextToken) return
    const res = await fetch('/api/website-chat/messages', {
      headers: { 'x-website-chat-token': nextToken },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 404) {
      resetSession()
      return
    }
    if (res.ok && Array.isArray(data.messages)) setMessages(data.messages)
  }, [token])

  useEffect(() => {
    if (!open || !started || !token) return
    void loadMessages(token).catch(() => {})
    const timer = window.setInterval(() => {
      void loadMessages(token).catch(() => {})
    }, 6000)
    return () => window.clearInterval(timer)
  }, [open, started, token, loadMessages])

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
      if (chatToken) setToken(chatToken)
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
      const nextToken = String(data.token || '')
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
      if (data.chat?.name) setName(data.chat.name)
      if (data.chat?.email && !String(data.chat.email).endsWith('@noreply.local')) {
        setEmail(data.chat.email)
      }
      setStarted(true)
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
      if (data.message) setMessages((current) => [...current, data.message])
      else await loadMessages(token)
    } catch (err: any) {
      setError(err.message || 'Could not send')
    } finally {
      setSending(false)
    }
  }

  const adminJoined = messages.some((message) => message.senderType === 'admin')

  if (isStaff) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => persistOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-brand-green bg-white px-4 py-3 text-brand-green shadow-[0_8px_20px_rgba(255,255,255,0.45)] hover:bg-white hover:shadow-[0_10px_24px_rgba(255,255,255,0.6)]"
        aria-label="Open chat support"
      >
        <span className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-brand-green/20">
          <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
        </span>
        <span className="text-sm font-semibold">Chat Support</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex h-[min(520px,78vh)] w-[min(100%-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(74,124,35,0.18)]">
      <div className="flex items-center justify-between bg-brand-green px-3 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/40">
            <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold">Chat Support</p>
            <p className="text-[11px] text-white/80">
              {adminJoined ? 'A team member has joined' : "I'm here to help resolve your issue."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => persistOpen(false)}
            className="rounded-lg p-1 hover:bg-white/10"
            aria-label="Minimize chat"
            title="Minimize"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => persistOpen(false)}
            className="rounded-lg p-1 hover:bg-white/10"
            aria-label="Close chat"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!started ? (
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
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Say hello and Alice will get an admin for you.</p>
            ) : (
              messages.map((message) => {
                const fromStaff = message.senderType === 'admin' || message.senderType === 'alice'
                const fromAlice = message.senderType === 'alice' || (!adminJoined && fromStaff)
                return (
                  <div key={message.id} className={`flex items-end gap-2 ${fromStaff ? 'justify-start' : 'justify-end'}`}>
                    {fromStaff ? (
                      <span className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full bg-white shadow-sm">
                        <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        fromStaff ? 'bg-white text-slate-800 shadow-sm' : 'bg-brand-green text-white'
                      }`}
                    >
                      {fromStaff ? (
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {fromAlice ? 'Alice' : 'Support'}
                        </p>
                      ) : null}
                      {message.content}
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
