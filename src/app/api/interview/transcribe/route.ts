import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as Blob | null
    const language = (formData.get('language') as string) || 'en'

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Create form data for OpenAI
    const openaiFormData = new FormData()
    openaiFormData.append('file', audioFile, 'audio.webm')
    openaiFormData.append('model', 'whisper-1')
    openaiFormData.append('language', language === 'es' ? 'es' : 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: openaiFormData,
    })

    const data = await response.json()

    if (data.error) {
      console.error('Whisper API error:', data.error)
      return NextResponse.json({ error: data.error.message }, { status: 500 })
    }

    return NextResponse.json({ text: data.text })
  } catch (error: any) {
    console.error('Error transcribing audio:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

