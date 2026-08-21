import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import {
  getInstallerTokenFromRequest,
  verifyInstallerToken,
} from '@/lib/installerToken'
import { generateSpeech } from '@/lib/openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPPORTED = new Set([
  'en',
  'es',
  'pt',
  'fr',
  'ht',
  'zh',
  'vi',
  'ar',
  'hi',
  'ko',
  'tl',
])

const LANG_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  fr: 'French',
  ht: 'Haitian Creole',
  zh: 'Chinese',
  vi: 'Vietnamese',
  ar: 'Arabic',
  hi: 'Hindi',
  ko: 'Korean',
  tl: 'Tagalog',
}

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured')
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function normalizeLang(value: string | null | undefined): string {
  const code = String(value || 'en').toLowerCase().split('-')[0]
  return SUPPORTED.has(code) ? code : 'en'
}

async function translateText(text: string, fromLang: string, toLang: string) {
  const openai = getOpenAI()
  const fromName = LANG_NAMES[fromLang] || fromLang
  const toName = LANG_NAMES[toLang] || toLang

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `You are Alice, the live conversation interpreter for Floor Interior Services.
You stand between two people and translate what one person just said from ${fromName} into ${toName}.
Return ONLY the natural spoken translation Alice would say out loud — no quotes, no labels, no "they said", no explanations.
Keep meaning, tone, and short conversational style. If the input is empty or unclear noise, return an empty string.`,
      },
      { role: 'user', content: text },
    ],
  })

  return (completion.choices[0]?.message?.content || '').trim()
}

async function transcribeAudio(audio: Blob, filename: string, language: string) {
  const mimeType = audio.type || ''
  let extension = 'webm'
  if (mimeType.includes('wav') || filename.endsWith('.wav')) extension = 'wav'
  else if (mimeType.includes('mp4') || mimeType.includes('m4a') || filename.endsWith('.m4a')) extension = 'm4a'
  else if (mimeType.includes('aac')) extension = 'aac'
  else if (mimeType.includes('ogg')) extension = 'ogg'
  else if (mimeType.includes('mp3')) extension = 'mp3'

  const typeByExt: Record<string, string> = {
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    mp3: 'audio/mpeg',
    webm: 'audio/webm',
  }

  const bytes = Buffer.from(await audio.arrayBuffer())
  const file = new File([bytes], `audio.${extension}`, {
    type: typeByExt[extension] || 'audio/webm',
  })

  const form = new FormData()
  form.append('file', file)
  form.append('model', 'whisper-1')
  // Whisper expects ISO-639-1; Haitian Creole is "ht"
  form.append('language', language)

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  })

  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data?.error?.message || 'Failed to transcribe audio')
  }
  return String(data.text || '').trim()
}

export async function POST(request: NextRequest) {
  try {
    const token = getInstallerTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      verifyInstallerToken(token)
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const contentType = request.headers.get('content-type') || ''
    let fromLang = 'en'
    let toLang = 'es'
    let originalText = ''
    let speak = true

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      fromLang = normalizeLang(String(formData.get('fromLang') || 'en'))
      toLang = normalizeLang(String(formData.get('toLang') || 'es'))
      speak = String(formData.get('speak') || '1') !== '0'
      const typed = String(formData.get('text') || '').trim()
      const audio = formData.get('audio')
      const filename = audio instanceof File ? audio.name : ''

      if (typed) {
        originalText = typed
      } else if (audio instanceof Blob && audio.size > 0) {
        originalText = await transcribeAudio(audio, filename, fromLang)
      } else {
        return NextResponse.json({ error: 'Provide audio or text to translate' }, { status: 400 })
      }
    } else {
      const body = await request.json().catch(() => ({}))
      fromLang = normalizeLang(body.fromLang)
      toLang = normalizeLang(body.toLang)
      speak = body.speak !== false
      originalText = String(body.text || '').trim()
      if (!originalText) {
        return NextResponse.json({ error: 'Provide text to translate' }, { status: 400 })
      }
    }

    if (fromLang === toLang) {
      let audioBase64: string | null = null
      let speakError: string | null = null
      if (speak && originalText) {
        try {
          const audioBuffer = await generateSpeech(originalText)
          audioBase64 = audioBuffer.toString('base64')
        } catch (err: any) {
          speakError = err?.message || 'Alice could not speak this line'
        }
      }
      return NextResponse.json({
        success: true,
        original: originalText,
        translated: originalText,
        fromLang,
        toLang,
        audioBase64,
        speaker: 'Alice',
        speakError,
      })
    }

    if (!originalText) {
      return NextResponse.json({
        success: true,
        original: '',
        translated: '',
        fromLang,
        toLang,
        audioBase64: null,
        warning: 'Nothing clear was heard. Try again closer to the mic.',
      })
    }

    const translated = await translateText(originalText, fromLang, toLang)

    let audioBase64: string | null = null
    let speakError: string | null = null
    if (speak && translated) {
      try {
        // Same Alice voice used in the installer interview (OpenAI "nova")
        const audioBuffer = await generateSpeech(translated)
        audioBase64 = audioBuffer.toString('base64')
      } catch (err: any) {
        console.error('Alice TTS failed (translation still returned):', err)
        speakError = err?.message || 'Alice could not speak this line'
      }
    }

    return NextResponse.json({
      success: true,
      original: originalText,
      translated,
      fromLang,
      toLang,
      audioBase64,
      speaker: 'Alice',
      speakError,
    })
  } catch (error: any) {
    console.error('Installer translate error:', error)
    return NextResponse.json(
      { error: error?.message || 'Translation failed' },
      { status: 500 }
    )
  }
}
