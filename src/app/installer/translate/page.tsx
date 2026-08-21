'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeftRight,
  Languages,
  Loader2,
  Mic,
  Square,
  Volume2,
} from 'lucide-react'
import { LogoHeartbeatLoader } from '@/components/LogoHeartbeatLoader'
import {
  getSupportedMimeType,
  isIOS,
  isMediaRecorderSupported,
} from '@/lib/utils'
import './installer-translate-mobile.css'

type LangCode = 'en' | 'es' | 'pt' | 'fr' | 'ht' | 'zh' | 'vi' | 'ar' | 'hi' | 'ko' | 'tl'

type Turn = {
  id: string
  side: 'a' | 'b'
  fromLang: LangCode
  toLang: LangCode
  original: string
  translated: string
  audioBase64?: string | null
  createdAt: number
}

const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'ht', label: 'Haitian Creole' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'fr', label: 'French' },
  { code: 'zh', label: 'Chinese' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ar', label: 'Arabic' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' },
]

function langLabel(code: LangCode) {
  return LANGUAGES.find((l) => l.code === code)?.label || code
}

export default function InstallerTranslatePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [langA, setLangA] = useState<LangCode>('en')
  const [langB, setLangB] = useState<LangCode>('es')
  const [turns, setTurns] = useState<Turn[]>([])
  const [recordingSide, setRecordingSide] = useState<'a' | 'b' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [aliceSpeaking, setAliceSpeaking] = useState(false)
  const [status, setStatus] = useState('')

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('installerToken')
    if (!token) {
      router.push('/installer/login')
      return
    }
    setIsLoading(false)
  }, [router])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, processing])

  const unlockAudio = async () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
    } catch {
      // ignore
    }
  }

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const playBase64Audio = async (base64: string) => {
    try {
      await unlockAudio()
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      setAliceSpeaking(true)
      setStatus('Alice is speaking…')
      const audio = new Audio(`data:audio/mpeg;base64,${base64}`)
      audioRef.current = audio
      audio.onended = () => {
        setAliceSpeaking(false)
        setStatus('')
      }
      audio.onerror = () => {
        setAliceSpeaking(false)
        setStatus('')
      }
      await audio.play()
    } catch (err) {
      console.error('Could not play Alice audio:', err)
      setAliceSpeaking(false)
      setStatus('')
      setError('Alice could not play audio. Tap the speaker on a message to try again.')
    }
  }

  const askAliceToSpeak = async (text: string, toLang: LangCode) => {
    const token = localStorage.getItem('installerToken')
    if (!token || !text.trim()) return null
    try {
      setAliceSpeaking(true)
      setStatus('Alice is speaking…')
      const res = await fetch('/api/installer/translate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          fromLang: toLang,
          toLang,
          speak: true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.audioBase64) {
        await playBase64Audio(data.audioBase64)
        return data.audioBase64 as string
      }
      if (data.speakError) {
        setError(data.speakError)
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (!audioRef.current || audioRef.current.paused) {
        setAliceSpeaking(false)
        setStatus('')
      }
    }
    return null
  }

  const replayAlice = async (turn: Turn) => {
    if (aliceSpeaking || processing || recordingSide) return
    await unlockAudio()
    if (turn.audioBase64) {
      await playBase64Audio(turn.audioBase64)
      return
    }
    const audio = await askAliceToSpeak(turn.translated, turn.toLang)
    if (audio) {
      setTurns((prev) =>
        prev.map((t) => (t.id === turn.id ? { ...t, audioBase64: audio } : t))
      )
    }
  }

  const translateBlob = useCallback(
    async (blob: Blob, side: 'a' | 'b') => {
      const token = localStorage.getItem('installerToken')
      if (!token) {
        router.push('/installer/login')
        return
      }

      const fromLang = side === 'a' ? langA : langB
      const toLang = side === 'a' ? langB : langA

      setProcessing(true)
      setStatus('Alice is listening…')
      setError('')

      try {
        const form = new FormData()
        const mime = blob.type || (isIOS() ? 'audio/mp4' : 'audio/webm')
        let ext = 'webm'
        if (mime.includes('wav')) ext = 'wav'
        else if (mime.includes('mp4') || mime.includes('m4a')) ext = 'm4a'
        else if (mime.includes('ogg')) ext = 'ogg'
        else if (mime.includes('mp3')) ext = 'mp3'

        form.append('audio', blob, `speech.${ext}`)
        form.append('fromLang', fromLang)
        form.append('toLang', toLang)
        form.append('speak', '1')

        const res = await fetch('/api/installer/translate', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.error || 'Translation failed')
        }

        if (data.warning && !data.original) {
          setStatus(data.warning)
          return
        }

        const turn: Turn = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          side,
          fromLang,
          toLang,
          original: data.original || '',
          translated: data.translated || '',
          audioBase64: data.audioBase64 || null,
          createdAt: Date.now(),
        }
        setTurns((prev) => [...prev, turn])

        if (data.audioBase64) {
          await playBase64Audio(data.audioBase64)
        } else if (data.translated) {
          // Fallback: ask Alice to speak the line if the first TTS pass failed
          const audio = await askAliceToSpeak(data.translated, toLang)
          if (audio) {
            setTurns((prev) =>
              prev.map((t) => (t.id === turn.id ? { ...t, audioBase64: audio } : t))
            )
          } else {
            setStatus('Translation ready — tap speaker for Alice to say it')
          }
        } else {
          setStatus('')
        }
      } catch (err: any) {
        setError(err?.message || 'Translation failed')
        setStatus('')
      } finally {
        setProcessing(false)
      }
    },
    [langA, langB, router]
  )

  const startRecording = async (side: 'a' | 'b') => {
    if (processing || recordingSide) return
    setError('')
    setStatus('Listening…')

    try {
      await unlockAudio()
      if (!isMediaRecorderSupported()) {
        throw new Error('Recording is not supported on this device.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      streamRef.current = stream
      chunksRef.current = []

      const mimeType = getSupportedMimeType()
      const options: MediaRecorderOptions = {}
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType
      }

      const recorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        const blobType = recorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: blobType })
        stopStream()
        mediaRecorderRef.current = null
        setRecordingSide(null)
        if (blob.size < 800) {
          setStatus('Hold a little longer, then release.')
          return
        }
        await translateBlob(blob, side)
      }

      recorder.start(250)
      setRecordingSide(side)
    } catch (err: any) {
      stopStream()
      setRecordingSide(null)
      setStatus('')
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission is required for live translation.'
          : err?.message || 'Could not start microphone'
      )
    }
  }

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    } else {
      setRecordingSide(null)
      stopStream()
    }
  }

  const swapLanguages = () => {
    setLangA(langB)
    setLangB(langA)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen interview-gradient flex items-center justify-center">
        <LogoHeartbeatLoader />
      </div>
    )
  }

  return (
    <div className="ios-installer-translate min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-20 bg-brand-green text-white px-4 pb-4 pt-[max(env(safe-area-inset-top),12px)] shadow-md">
        <div className="flex items-center gap-3 mb-4 pr-14">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
            <Languages className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold leading-tight">Alice Translator</h1>
            <p className="text-xs text-white/80 truncate">Alice listens, then speaks the other language</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 text-slate-900 shadow-sm">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</span>
              <select
                value={langA}
                onChange={(e) => setLangA(e.target.value as LangCode)}
                disabled={!!recordingSide || processing}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} disabled={l.code === langB}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={swapLanguages}
              disabled={!!recordingSide || processing}
              className="mb-0.5 p-2.5 rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green/15 disabled:opacity-50"
              aria-label="Swap languages"
            >
              <ArrowLeftRight className="w-5 h-5" />
            </button>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</span>
              <select
                value={langB}
                onChange={(e) => setLangB(e.target.value as LangCode)}
                disabled={!!recordingSide || processing}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium"
              >
                {LANGUAGES.map((l) => (
                  <option key={`b-${l.code}`} value={l.code} disabled={l.code === langA}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-56">
        {turns.length === 0 && !processing && (
          <div className="bg-white border border-slate-200/70 rounded-2xl p-5 text-center shadow-sm">
            <Volume2 className="w-8 h-8 text-brand-green mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-900">Alice stands between both of you</p>
            <p className="text-sm text-slate-500 mt-1">
              Hold the mic for who is speaking. Alice hears them, translates, and speaks it aloud in the other language.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {turns.map((turn) => (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[92%] ${turn.side === 'a' ? 'mr-auto' : 'ml-auto'}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 shadow-sm border ${
                  turn.side === 'a'
                    ? 'bg-white border-slate-200'
                    : 'bg-brand-green text-white border-brand-green'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className={`text-[11px] font-semibold ${turn.side === 'a' ? 'text-slate-400' : 'text-white/70'}`}>
                    {langLabel(turn.fromLang)} → {langLabel(turn.toLang)}
                  </p>
                  <button
                    type="button"
                    onClick={() => void replayAlice(turn)}
                    disabled={aliceSpeaking || processing || !!recordingSide || !turn.translated}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold disabled:opacity-40 ${
                      turn.side === 'a'
                        ? 'bg-brand-green/10 text-brand-green'
                        : 'bg-white/15 text-white'
                    }`}
                    aria-label="Hear Alice say this again"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Alice
                  </button>
                </div>
                <p className={`text-sm ${turn.side === 'a' ? 'text-slate-600' : 'text-white/85'}`}>{turn.original}</p>
                <p className={`text-base font-semibold mt-2 ${turn.side === 'a' ? 'text-slate-900' : 'text-white'}`}>
                  {turn.translated}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {(processing || aliceSpeaking) && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {aliceSpeaking ? 'Alice is speaking…' : 'Alice is translating…'}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
        {status && <p className="text-center text-xs text-slate-500 mb-2">{status}</p>}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={processing || (recordingSide !== null && recordingSide !== 'a')}
            onPointerDown={(e) => {
              e.preventDefault()
              void startRecording('a')
            }}
            onPointerUp={stopRecording}
            onPointerCancel={stopRecording}
            onPointerLeave={() => {
              if (recordingSide === 'a') stopRecording()
            }}
            className={`rounded-2xl px-3 py-4 min-h-[96px] flex flex-col items-center justify-center gap-2 font-semibold transition-colors select-none touch-none ${
              recordingSide === 'a'
                ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                : 'bg-slate-900 text-white active:bg-slate-800 disabled:opacity-40'
            }`}
          >
            {recordingSide === 'a' ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span className="text-sm leading-tight text-center">Hold · {langLabel(langA)}</span>
            <span className="text-[11px] font-normal opacity-70">→ {langLabel(langB)}</span>
          </button>

          <button
            type="button"
            disabled={processing || (recordingSide !== null && recordingSide !== 'b')}
            onPointerDown={(e) => {
              e.preventDefault()
              void startRecording('b')
            }}
            onPointerUp={stopRecording}
            onPointerCancel={stopRecording}
            onPointerLeave={() => {
              if (recordingSide === 'b') stopRecording()
            }}
            className={`rounded-2xl px-3 py-4 min-h-[96px] flex flex-col items-center justify-center gap-2 font-semibold transition-colors select-none touch-none ${
              recordingSide === 'b'
                ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                : 'bg-brand-green text-white active:bg-brand-green-dark disabled:opacity-40'
            }`}
          >
            {recordingSide === 'b' ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span className="text-sm leading-tight text-center">Hold · {langLabel(langB)}</span>
            <span className="text-[11px] font-normal opacity-70">→ {langLabel(langA)}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setTurns([])}
          className="mt-3 w-full text-center text-xs text-slate-400 py-1"
          disabled={!turns.length || processing || !!recordingSide}
        >
          Clear conversation
        </button>
      </div>
    </div>
  )
}
