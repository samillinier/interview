import { NextResponse } from 'next/server'
import { generateSpeech } from '@/lib/openai'

export async function GET() {
  try {
    const testText = 'Hello, this is a voice test. The current voice setting is nova.'
    console.log('🔊 Test voice API called - generating speech with nova voice')
    const audioBuffer = await generateSpeech(testText)
    const audioBase64 = audioBuffer.toString('base64')
    
    return NextResponse.json({
      success: true,
      audioBase64,
      voice: 'nova',
      message: 'Voice test generated successfully',
    })
  } catch (error: any) {
    console.error('Error in test voice API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate test voice' },
      { status: 500 }
    )
  }
}

