'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Loader2, Minus, Send, X } from 'lucide-react'
import alicePhoto from '@/images/alice-interviewer.png'

const TOKEN_KEY = 'fis-website-chat-token'
const OPEN_KEY = 'fis-website-chat-open'

type ChatMessage = {
  id: string
  senderType: string
  senderName?: string | null
  content: string
  createdAt: string
}

export function LandingChatWidget() {
  const [open, setOpen] = useState(false)
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
      if (stored === '1' || window.innerWidth >= 1024) setOpen(true)
    } catch {
      if (window.innerWidth >= 1024) setOpen(true)
    }
  }, [])

  const resetSession = () => {
    localStorage.removeItem(TOKEN_KEY)
    setToken('')
    setStarted(false)
    setMessages([])
  }

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || '' : ''
    if (!stored) return
    setToken(stored)
    void fetch('/api/website-chat', {
      headers: { 'x-website-chat-token': stored },
      cache: 'no-store',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.chat) {
          setStarted(true)
          setName(data.chat.name || '')
          setEmail(data.chat.email || '')
        }
      })
      .catch(() => {})
  }, [])

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
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-website-chat-token': token },
        body: JSON.stringify({ name, email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not start chat')
      const nextToken = String(data.token || '')
      localStorage.setItem(TOKEN_KEY, nextToken)
      setToken(nextToken)
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => persistOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-brand-green bg-white px-4 py-3 text-brand-green shadow-[0_8px_20px_rgba(255,255,255,0.45)] hover:bg-white hover:shadow-[0_10px_24px_rgba(255,255,255,0.6)]"
        aria-label="Open chat"
      >
        <span className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-brand-green/20">
          <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
        </span>
        <span className="text-sm font-semibold">Chat with Alice</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex h-[min(520px,78vh)] w-[min(100%-2rem,360px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_32px_rgba(74,124,35,0.18)]">
      <div className="flex items-center justify-between bg-brand-green px-3 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-2.5">
          {!adminJoined ? (
            <span className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/40">
              <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-bold">{adminJoined ? 'FIS Admin' : 'Alice'}</p>
            <p className="text-[11px] text-white/80">
              {adminJoined ? 'An admin has joined' : "I'm here to help resolve your issue."}
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
          <p className="text-sm text-slate-600">Tell us who you are and Alice will connect you with an admin.</p>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            required
          />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            required
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
                        {fromAlice ? (
                          <Image src={alicePhoto} alt="Alice" className="h-full w-full object-cover object-top" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-brand-green text-[10px] font-bold text-white">
                            FIS
                          </span>
                        )}
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                        fromStaff ? 'bg-white text-slate-800 shadow-sm' : 'bg-brand-green text-white'
                      }`}
                    >
                      {fromStaff ? (
                        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {fromAlice ? 'Alice' : 'Admin'}
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
