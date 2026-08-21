'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeftRight,
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
import { encodeWav, mergeFloat32 } from '@/lib/wavRecorder'
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
  const wavChunksRef = useRef<Float32Array[]>([])
  const wavProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const wavSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const recordingSideRef = useRef<'a' | 'b' | null>(null)
  const startingRef = useRef(false)
  const pendingStopRef = useRef(false)
  const pressStartedAtRef = useRef(0)
  const playBase64AudioRef = useRef<(base64: string) => Promise<void>>(async () => {})
  const translateBlobRef = useRef<(blob: Blob, side: 'a' | 'b') => Promise<void>>(async () => {})
  const stopRecordingRef = useRef<() => void>(() => {})

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

  // Hold-to-talk: listen on window so release still stops even if the button re-renders
  // (common on iPhone when the button turns red mid-press).
  useEffect(() => {
    if (!recordingSide) return

    const onRelease = (e: Event) => {
      // Ignore release events that aren't from a primary finger/button
      if ('button' in e && typeof (e as PointerEvent).button === 'number' && (e as PointerEvent).button !== 0) {
        return
      }
      stopRecordingRef.current()
    }

    window.addEventListener('pointerup', onRelease)
    window.addEventListener('pointercancel', onRelease)
    window.addEventListener('mouseup', onRelease)
    window.addEventListener('touchend', onRelease)
    window.addEventListener('touchcancel', onRelease)
    return () => {
      window.removeEventListener('pointerup', onRelease)
      window.removeEventListener('pointercancel', onRelease)
      window.removeEventListener('mouseup', onRelease)
      window.removeEventListener('touchend', onRelease)
      window.removeEventListener('touchcancel', onRelease)
    }
  }, [recordingSide])

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  const base64ToBlobUrl = (base64: string, mime = 'audio/mpeg') => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    return URL.createObjectURL(blob)
  }

  const unlockAudio = async () => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return
      if (!audioCtxRef.current) audioCtxRef.current = new AC()
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume()
      }

      // Unlock HTMLAudioElement playback inside the user gesture (required on iPhone).
      if (!audioRef.current) {
        const audio = document.createElement('audio')
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')
        audio.preload = 'auto'
        audio.style.display = 'none'
        document.body.appendChild(audio)
        audioRef.current = audio
      }

      // Tiny silent wav — must play during the hold gesture.
      const silent =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA=='
      const el = audioRef.current
      el.src = silent
      el.volume = 0.01
      try {
        await el.play()
        el.pause()
        el.currentTime = 0
      } catch {
        // ignore unlock failures; Play button still works with a fresh gesture
      }
    } catch {
      // ignore
    }
  }

  const playViaWebAudio = async (base64: string) => {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) throw new Error('No AudioContext')
    if (!audioCtxRef.current) audioCtxRef.current = new AC()
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') await ctx.resume()

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0))
    const source = ctx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(ctx.destination)
    await new Promise<void>((resolve, reject) => {
      source.onended = () => resolve()
      try {
        source.start(0)
      } catch (err) {
        reject(err)
      }
    })
  }

  const playBase64Audio = async (base64: string) => {
    if (!base64) return
    setAliceSpeaking(true)
    setStatus('Speaking…')
    setError('')

    let objectUrl: string | null = null
    try {
      // Resume context only — do NOT reset the audio element to silent here
      // (that breaks playback right after translation).
      try {
        if (audioCtxRef.current?.state === 'suspended') {
          await audioCtxRef.current.resume()
        }
      } catch {
        // ignore
      }

      objectUrl = base64ToBlobUrl(base64)
      const audio = audioRef.current || document.createElement('audio')
      if (!audioRef.current) {
        audio.setAttribute('playsinline', 'true')
        audio.setAttribute('webkit-playsinline', 'true')
        audio.preload = 'auto'
        audio.style.display = 'none'
        document.body.appendChild(audio)
        audioRef.current = audio
      }

      audio.pause()
      audio.src = objectUrl
      audio.volume = 1
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const finish = (fn: () => void) => {
          if (settled) return
          settled = true
          cleanup()
          fn()
        }
        const onEnded = () => finish(() => resolve())
        const onError = () => finish(() => reject(new Error('audio element error')))
        const cleanup = () => {
          audio.removeEventListener('ended', onEnded)
          audio.removeEventListener('error', onError)
        }
        audio.addEventListener('ended', onEnded)
        audio.addEventListener('error', onError)
        const playPromise = audio.play()
        if (playPromise) {
          playPromise.catch((err) => finish(() => reject(err)))
        }
      })
    } catch (err) {
      console.warn('HTML audio play failed, trying Web Audio:', err)
      try {
        await playViaWebAudio(base64)
      } catch (err2) {
        console.error('Could not play translation audio:', err2)
        setStatus('Tap Play on the message to hear it')
        setAliceSpeaking(false)
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        return
      }
    }

    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl)
      } catch {
        // ignore
      }
    }
    setAliceSpeaking(false)
    setStatus('')
  }
  playBase64AudioRef.current = playBase64Audio

  const askAliceToSpeak = async (text: string, toLang: LangCode) => {
    const token = localStorage.getItem('installerToken')
    if (!token || !text.trim()) return null
    try {
      setStatus('Speaking…')
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
        await playBase64AudioRef.current(data.audioBase64)
        return data.audioBase64 as string
      }
      if (data.speakError) {
        setError(data.speakError)
      }
    } catch (err) {
      console.error(err)
    }
    return null
  }

  const replayAlice = async (turn: Turn) => {
    if (aliceSpeaking || processing || recordingSide) return
    try {
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume()
      }
    } catch {
      // ignore
    }
    if (turn.audioBase64) {
      await playBase64AudioRef.current(turn.audioBase64)
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
      setStatus('Listening…')
      setError('')

      try {
        const form = new FormData()
        const mime = blob.type || (isIOS() ? 'audio/wav' : 'audio/webm')
        let ext = 'webm'
        if (mime.includes('wav')) ext = 'wav'
        else if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) ext = 'm4a'
        else if (mime.includes('ogg')) ext = 'ogg'
        else if (mime.includes('mp3') || mime.includes('mpeg')) ext = 'mp3'
        else if (isIOS()) ext = 'wav'

        // Always send a Whisper-supported filename + type (iPhone MediaRecorder formats often fail).
        const uploadType =
          ext === 'wav'
            ? 'audio/wav'
            : ext === 'm4a'
              ? 'audio/mp4'
              : ext === 'mp3'
                ? 'audio/mpeg'
                : ext === 'ogg'
                  ? 'audio/ogg'
                  : 'audio/webm'
        const file = new File([blob], `speech.${ext}`, { type: uploadType })
        form.append('audio', file)
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
          await playBase64AudioRef.current(data.audioBase64)
        } else if (data.translated) {
          const audio = await askAliceToSpeak(data.translated, toLang)
          if (audio) {
            setTurns((prev) =>
              prev.map((t) => (t.id === turn.id ? { ...t, audioBase64: audio } : t))
            )
          } else {
            setStatus('Translation ready — tap Play to hear it')
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
  translateBlobRef.current = translateBlob

  const finishIosRecording = () => {
    const processor = wavProcessorRef.current
    const source = wavSourceRef.current
    const sampleRate = audioCtxRef.current?.sampleRate || 44100
    const recordedSide = recordingSideRef.current
    try {
      processor?.disconnect()
      source?.disconnect()
    } catch {
      // already disconnected
    }
    stopStream()
    wavProcessorRef.current = null
    wavSourceRef.current = null
    recordingSideRef.current = null
    setRecordingSide(null)
    startingRef.current = false
    pendingStopRef.current = false

    const samples = mergeFloat32(wavChunksRef.current)
    wavChunksRef.current = []
    if (!recordedSide) return
    if (samples.length < 4000) {
      setStatus('Hold a little longer, then release.')
      return
    }
    const wavBlob = encodeWav(samples, sampleRate)
    void translateBlobRef.current(wavBlob, recordedSide)
  }

  const startRecording = async (side: 'a' | 'b') => {
    if (processing || recordingSideRef.current || startingRef.current) return

    startingRef.current = true
    pendingStopRef.current = false
    recordingSideRef.current = side
    setRecordingSide(side)
    setError('')
    setStatus('Listening…')

    try {
      await unlockAudio()
      if (pendingStopRef.current) {
        recordingSideRef.current = null
        setRecordingSide(null)
        startingRef.current = false
        pendingStopRef.current = false
        setStatus('Hold a little longer, then release.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      if (pendingStopRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        recordingSideRef.current = null
        setRecordingSide(null)
        startingRef.current = false
        pendingStopRef.current = false
        setStatus('Hold a little longer, then release.')
        return
      }

      streamRef.current = stream
      chunksRef.current = []
      wavChunksRef.current = []

      // iPhone MediaRecorder files are often rejected by Whisper — capture PCM → WAV.
      if (isIOS()) {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        if (!audioCtxRef.current) audioCtxRef.current = new AC()
        await audioCtxRef.current.resume()
        const source = audioCtxRef.current.createMediaStreamSource(stream)
        const processor = audioCtxRef.current.createScriptProcessor(4096, 1, 1)
        const mute = audioCtxRef.current.createGain()
        mute.gain.value = 0
        processor.onaudioprocess = (event) => {
          wavChunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)))
        }
        source.connect(processor)
        processor.connect(mute)
        mute.connect(audioCtxRef.current.destination)
        wavSourceRef.current = source
        wavProcessorRef.current = processor
        startingRef.current = false
        if (pendingStopRef.current) {
          finishIosRecording()
        }
        return
      }

      if (!isMediaRecorderSupported()) {
        throw new Error('Recording is not supported on this device.')
      }

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
        const recordedSide = recordingSideRef.current
        recordingSideRef.current = null
        setRecordingSide(null)
        startingRef.current = false
        pendingStopRef.current = false
        if (!recordedSide) return
        if (blob.size < 800) {
          setStatus('Hold a little longer, then release.')
          return
        }
        await translateBlobRef.current(blob, recordedSide)
      }

      recorder.start(250)
      startingRef.current = false
      if (pendingStopRef.current) {
        try {
          recorder.requestData()
        } catch {
          // ignore
        }
        recorder.stop()
      }
    } catch (err: any) {
      stopStream()
      recordingSideRef.current = null
      setRecordingSide(null)
      startingRef.current = false
      pendingStopRef.current = false
      setStatus('')
      setError(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission is required for live translation.'
          : err?.message || 'Could not start microphone'
      )
    }
  }

  const stopRecording = () => {
    // Already idle
    if (
      !recordingSideRef.current &&
      !startingRef.current &&
      !wavProcessorRef.current &&
      !mediaRecorderRef.current
    ) {
      return
    }

    // Finger released before mic finished starting — finish as soon as ready.
    if (startingRef.current || (recordingSideRef.current && !wavProcessorRef.current && !mediaRecorderRef.current)) {
      pendingStopRef.current = true
      return
    }

    if (isIOS() && wavProcessorRef.current) {
      finishIosRecording()
      return
    }

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        if (recorder.state === 'recording') recorder.requestData()
      } catch {
        // ignore
      }
      recorder.stop()
    } else if (recordingSideRef.current) {
      recordingSideRef.current = null
      setRecordingSide(null)
      stopStream()
      setStatus('Hold a little longer, then release.')
    }
  }
  stopRecordingRef.current = stopRecording

  const beginHold = (side: 'a' | 'b') => {
    if (processing) return
    pressStartedAtRef.current = Date.now()
    void startRecording(side)
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
      <header className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur px-4 pb-3 pt-[max(calc(env(safe-area-inset-top)+64px),118px)] border-b border-slate-200/80">
        <div className="bg-white rounded-2xl p-3 text-slate-900 shadow-sm border border-slate-200/70">
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
              className="mb-0.5 p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
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
            <p className="text-sm font-semibold text-slate-900">Stand between both people</p>
            <p className="text-sm text-slate-500 mt-1">
              Hold the mic for who is speaking. It translates and plays the other language out loud.
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
                    aria-label="Play translation again"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Play
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
            {aliceSpeaking ? 'Speaking…' : 'Translating…'}
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
              if (e.button !== 0) return
              e.preventDefault()
              try {
                ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
              } catch {
                // ignore
              }
              beginHold('a')
            }}
            className={`rounded-2xl px-3 py-4 min-h-[96px] flex flex-col items-center justify-center gap-2 font-semibold transition-colors select-none touch-none ${
              recordingSide === 'a'
                ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                : 'bg-slate-900 text-white active:bg-slate-800 disabled:opacity-40'
            }`}
          >
            {recordingSide === 'a' ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span className="text-sm leading-tight text-center">
              {recordingSide === 'a' ? 'Release to stop' : `Hold · ${langLabel(langA)}`}
            </span>
            <span className="text-[11px] font-normal opacity-70">→ {langLabel(langB)}</span>
          </button>

          <button
            type="button"
            disabled={processing || (recordingSide !== null && recordingSide !== 'b')}
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              try {
                ;(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId)
              } catch {
                // ignore
              }
              beginHold('b')
            }}
            className={`rounded-2xl px-3 py-4 min-h-[96px] flex flex-col items-center justify-center gap-2 font-semibold transition-colors select-none touch-none ${
              recordingSide === 'b'
                ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
                : 'bg-brand-green text-white active:bg-brand-green-dark disabled:opacity-40'
            }`}
          >
            {recordingSide === 'b' ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            <span className="text-sm leading-tight text-center">
              {recordingSide === 'b' ? 'Release to stop' : `Hold · ${langLabel(langB)}`}
            </span>
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
