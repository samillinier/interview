import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  generateInterviewResponse,
  generateSpeech,
} from '@/lib/openai'
import { getInterviewQuestions } from '@/lib/questions'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const interviewId = formData.get('interviewId') as string
    const currentQuestionIndex = parseInt(formData.get('questionIndex') as string)
    const textResponse = formData.get('textResponse') as string | null
    const language = (formData.get('language') as string) || 'en'
    const conversationHistory = JSON.parse(
      formData.get('conversationHistory') as string || '[]'
    )

    // Get questions for the selected language
    const questions = getInterviewQuestions(language as 'en' | 'es')

    // Get the interview
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { installer: true },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Use text response directly (transcription is done separately now)
    const userResponse = textResponse || ''

    // Save the response
    const currentQuestion = questions[currentQuestionIndex]
    await prisma.interviewResponse.create({
      data: {
        interviewId,
        questionId: currentQuestion.id,
        questionText: currentQuestion.text,
        answerText: userResponse,
      },
    })

    // Update conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userResponse },
    ]

    // Generate AI response with language
    const aiResponse = await generateInterviewResponse(
      updatedHistory,
      currentQuestionIndex,
      language as 'en' | 'es'
    )

    // Update conversation history with AI response
    updatedHistory.push({ role: 'assistant', content: aiResponse.response })

    // Update extracted data if available
    if (aiResponse.extractedInfo) {
      // Store extracted info in interview
      const currentExtracted = interview.extractedData
        ? JSON.parse(interview.extractedData)
        : {}
      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          extractedData: JSON.stringify({
            ...currentExtracted,
            ...aiResponse.extractedInfo,
          }),
        },
      })
    }

    // Check if interview is complete
    const nextQuestionIndex = aiResponse.shouldMoveToNextQuestion
      ? currentQuestionIndex + 1
      : currentQuestionIndex

    const isComplete = nextQuestionIndex >= questions.length

    if (isComplete) {
      // Mark interview as completed
      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          transcript: JSON.stringify(updatedHistory),
        },
      })
    }

    // Generate speech for AI response
    let audioBase64 = null
    try {
      const audioBuffer = await generateSpeech(aiResponse.response)
      audioBase64 = Buffer.from(audioBuffer).toString('base64')
    } catch (error) {
      console.error('Error generating speech:', error)
    }

    return NextResponse.json({
      success: true,
      userTranscript: userResponse,
      aiResponse: aiResponse.response,
      audioBase64,
      nextQuestionIndex,
      isComplete,
      extractedInfo: aiResponse.extractedInfo,
      conversationHistory: updatedHistory,
    })
  } catch (error) {
    console.error('Error processing response:', error)
    return NextResponse.json(
      { error: 'Failed to process response' },
      { status: 500 }
    )
  }
}
