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
    
    // Save interactive selections directly to installer record
    if (currentQuestion.id === 'skills' && userResponse && userResponse !== 'None') {
      try {
        // Parse the comma-separated skills into an array
        const skillsArray = userResponse.split(',').map(s => s.trim()).filter(s => s.length > 0)
        
        // Update installer with flooring skills immediately
        await prisma.installer.update({
          where: { id: interview.installerId },
          data: {
            flooringSkills: JSON.stringify(skillsArray),
          },
        })
        console.log('Flooring skills saved:', skillsArray)
      } catch (error) {
        console.error('Error saving flooring skills:', error)
      }
    }
    
    // Save travel locations if provided
    if (currentQuestion.id === 'travel_locations' && userResponse && userResponse !== 'None') {
      try {
        const locationsArray = userResponse.split(',').map(s => s.trim()).filter(s => s.length > 0)
        await prisma.installer.update({
          where: { id: interview.installerId },
          data: {
            travelLocations: JSON.stringify(locationsArray),
            openToTravel: true,
          },
        })
        console.log('Travel locations saved:', locationsArray)
      } catch (error) {
        console.error('Error saving travel locations:', error)
      }
    }
    
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

    // Determine the actual next question index (accounting for conditional skips)
    let actualNextQuestionIndex = currentQuestionIndex + 1
    
    // Skip background_details if user answered "Yes" to background_check
    if (currentQuestion.id === 'background_check' && actualNextQuestionIndex < questions.length) {
      const nextQuestion = questions[actualNextQuestionIndex]
      if (nextQuestion.id === 'background_details') {
        const responseLower = userResponse.toLowerCase().trim()
        const positiveAnswers = ['yes', 'y', 'yeah', 'yep', 'sure', 'absolutely', 'of course', 'definitely']
        const isPositive = positiveAnswers.some(answer => responseLower.includes(answer))
        
        if (isPositive) {
          actualNextQuestionIndex = actualNextQuestionIndex + 1
        }
      }
    }

    // Skip crew_size if user answered "No" to crew question
    if (currentQuestion.id === 'crew' && actualNextQuestionIndex < questions.length) {
      const nextQuestion = questions[actualNextQuestionIndex]
      if (nextQuestion.id === 'crew_size') {
        const responseLower = userResponse.toLowerCase().trim()
        const negativeAnswers = ['no', 'n', 'nope', 'nah', 'none', 'solo', 'alone', 'by myself', 'myself']
        const isNegative = negativeAnswers.some(answer => responseLower.includes(answer))
        
        if (isNegative) {
          actualNextQuestionIndex = actualNextQuestionIndex + 1
        }
      }
    }

    // Generate AI response with language
    const aiResponse = await generateInterviewResponse(
      updatedHistory,
      currentQuestionIndex,
      language as 'en' | 'es',
      actualNextQuestionIndex
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

    // Use the calculated next question index (already accounts for conditional skips)
    const nextQuestionIndex = aiResponse.shouldMoveToNextQuestion
      ? actualNextQuestionIndex
      : currentQuestionIndex

    // Check if this is the closing question or if we've reached the end
    const isClosingQuestion = currentQuestion.id === 'closing'
    const isComplete = nextQuestionIndex >= questions.length || isClosingQuestion

    if (isComplete) {
      // Mark interview as completed (but don't calculate score here - let completeInterview do it)
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
      audioBase64 = audioBuffer.toString('base64')
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
