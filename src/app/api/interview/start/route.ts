import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateSpeech } from '@/lib/openai'
import { getInterviewQuestions } from '@/lib/questions'

export async function POST(request: NextRequest) {
  console.log('Starting interview API called')
  
  try {
    const body = await request.json()
    const { email, firstName, lastName, language = 'en' } = body
    console.log('Request body:', { email, firstName, lastName, language })

    // Check if installer already exists
    let installer = await prisma.installer.findUnique({
      where: { email },
    })
    console.log('Existing installer:', installer?.id || 'none')

    if (!installer) {
      // Create new installer
      installer = await prisma.installer.create({
        data: {
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          status: 'pending',
        },
      })
      console.log('Created new installer:', installer.id)
    }

    // Create new interview
    const interview = await prisma.interview.create({
      data: {
        installerId: installer.id,
        status: 'in_progress',
      },
    })
    console.log('Created interview:', interview.id)

    // Get first question based on language
    const questions = getInterviewQuestions(language as 'en' | 'es')
    const firstQuestion = questions[0]
    console.log('First question:', firstQuestion.id, 'Language:', language)

    // Generate speech for first question (optional - won't block if it fails)
    let audioBase64 = null
    try {
      console.log('Generating speech...')
      const audioBuffer = await generateSpeech(firstQuestion.text)
      audioBase64 = Buffer.from(audioBuffer).toString('base64')
      console.log('Speech generated successfully')
    } catch (error) {
      console.error('Error generating speech (continuing without audio):', error)
      // Continue without audio - the interview can still work with text
    }

    const response = {
      success: true,
      interviewId: interview.id,
      installerId: installer.id,
      currentQuestion: {
        index: 0,
        id: firstQuestion.id,
        text: firstQuestion.text,
      },
      audioBase64,
      totalQuestions: questions.length,
      language,
    }
    console.log('Returning success response')
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error starting interview:', error.message || error)
    return NextResponse.json(
      { error: error.message || 'Failed to start interview' },
      { status: 500 }
    )
  }
}

