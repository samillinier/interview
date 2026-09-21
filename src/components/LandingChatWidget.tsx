'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { ChevronDown, Loader2, Maximize2, Minimize2, Send } from 'lucide-react'
import alicePhoto from '@/images/alice-interviewer.png'
import { ChatLauncherButton } from '@/components/ChatLauncherButton'

const TOKEN_KEY = 'fis-website-chat-token'
const OPEN_KEY = 'fis-website-chat-open'
const NAME_KEY = 'fis-website-chat-name'
const EMAIL_KEY = 'fis-website-chat-email'

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
  const isStaff = status === 'authenticated'
  const [open, setOpen] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [token, setToken] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const identityRef = useRef({ name: '', email: '' })
  const tokenRef = useRef('')

  tokenRef.current = token

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
      setOpen(stored !== '0')
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
    window.parent.postMessage(
      { source: 'fis-chat', type: 'state', open, expanded, token: tokenRef.current },
      '*',
    )
  }, [embed, open, expanded, token])

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

  // Ensure a visitor token exists (associates the sent message with a chat the
  // admin can see in the dashboard). This does NOT load or display any history.
  useEffect(() => {
    if (status === 'authenticated') return
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
        if (!data?.token) return
        localStorage.setItem(TOKEN_KEY, data.token)
        tokenRef.current = data.token
        setToken(data.token)
      })
      .catch(() => {})
  }, [status, initialToken])

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const content = message.trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    try {
      const t = token || ensureVisitorToken()
      tokenRef.current = t
      setToken(t)
      localStorage.setItem(TOKEN_KEY, t)

      // Make sure the chat exists with the visitor's identity.
      const ensureRes = await fetch('/api/website-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-website-chat-token': t,
        },
        body: JSON.stringify({ name, email }),
      })
      const ensureData = await ensureRes.json().catch(() => ({}))
      const chatToken = String(ensureData.token || t || '')
      if (chatToken) {
        tokenRef.current = chatToken
        setToken(chatToken)
        localStorage.setItem(TOKEN_KEY, chatToken)
      }

      // Send the message. The reply (Alice / admin) is stored server-side for
      // the dashboard inbox, but is not shown back to the visitor.
      const res = await fetch('/api/website-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-website-chat-token': chatToken },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send')
      setMessage('')
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Could not send')
    } finally {
      setSending(false)
    }
  }

  if (isStaff) return null

  if (!open) {
    if (embed) return null
    return <ChatLauncherButton onClick={() => persistOpen(true)} ariaLabel="Open chat support" variant="white" />
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
              Send us a message
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={sendMessage} className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <p className="text-base font-semibold text-slate-800">Message sent</p>
            <p className="text-sm text-slate-500">Thanks — our team will get back to you.</p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Send another message
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">Name and email are optional.</p>
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
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your message..."
              rows={5}
              className="min-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send message
            </button>
          </>
        )}
      </form>
    </div>
  )
}
