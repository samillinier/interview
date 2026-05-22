import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  generateInterviewResponse,
  generateSpeech,
} from '@/lib/openai'
import { getInterviewQuestions, WORKROOM_OPTIONS, FLOORING_SURFACE_OPTIONS } from '@/lib/questions'
import { extractLikelyPhone } from '@/lib/phone'

function isNoValue(input: string): boolean {
  const value = (input || '').trim().toLowerCase()
  if (!value) return true
  return ['none', 'n/a', 'na', 'skip', 'prefer not to say'].includes(value)
}

function extractLikelyNumber(input: string): number | null {
  const match = (input || '').match(/\d+/)
  if (!match) return null
  const value = parseInt(match[0], 10)
  return Number.isFinite(value) ? value : null
}

function parseLikelyBoolean(input: string): boolean | null {
  const value = (input || '').trim().toLowerCase()
  if (!value) return null

  const yesWords = [
    'yes', 'y', 'yeah', 'yep', 'sure', 'true', 'si', 'sí', 'claro',
  ]
  const noWords = [
    'no', 'n', 'nope', 'nah', 'false',
  ]

  if (yesWords.some((w) => value === w || value.startsWith(`${w} `) || value.includes(` ${w} `))) return true
  if (noWords.some((w) => value === w || value.startsWith(`${w} `) || value.includes(` ${w} `))) return false
  return null
}

function splitCsv(input: string): string[] {
  return (input || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

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
      include: { Installer: true },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Use text response directly (transcription is done separately now)
    const userResponse = textResponse || ''

    // Save the response
    const currentQuestion = questions[currentQuestionIndex]
    
    // Persist core profile fields as soon as they are answered in interview.
    if (userResponse && !isNoValue(userResponse)) {
      try {
        const installerUpdateData: Record<string, any> = {}
        const qid = currentQuestion.id

        if (qid === 'intro') {
          const cleaned = userResponse.trim()
          const parts = cleaned.split(/\s+/).filter(Boolean)
          if (parts.length >= 2) {
            installerUpdateData.firstName = parts[0]
            installerUpdateData.lastName = parts.slice(1).join(' ')
          }
        } else if (qid === 'contact') {
          const phone = extractLikelyPhone(userResponse)
          if (phone) installerUpdateData.phone = phone
        } else if (qid === 'experience') {
          const years = extractLikelyNumber(userResponse)
          if (years !== null) installerUpdateData.yearsOfExperience = years
        } else if (qid === 'skills') {
          const skillsArray = splitCsv(userResponse)
          if (skillsArray.length > 0) installerUpdateData.flooringSkills = JSON.stringify(skillsArray)
        } else if (qid === 'primary_surface') {
          const t = userResponse.trim()
          const allowed = new Set(FLOORING_SURFACE_OPTIONS as readonly string[])
          if (t && allowed.has(t)) installerUpdateData.primaryFlooringSurface = t
        } else if (qid === 'general_liability') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasGeneralLiability = value
        } else if (qid === 'auto_liability') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasCommercialAutoLiability = value
        } else if (qid === 'workers_comp') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasWorkersComp = value
        } else if (qid === 'crew') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasOwnCrew = value
        } else if (qid === 'crew_size') {
          const crewSize = extractLikelyNumber(userResponse)
          if (crewSize !== null) installerUpdateData.crewSize = String(crewSize)
        } else if (qid === 'workroom') {
          const selectedWorkroom = WORKROOM_OPTIONS.find((opt) =>
            userResponse.toLowerCase().includes(opt.toLowerCase()),
          ) || userResponse.trim()
          installerUpdateData.workroom = selectedWorkroom
        } else if (qid === 'workers_comp_exemption') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasWorkersCompExemption = value
        } else if (qid === 'sunbiz_registered') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.isSunbizRegistered = value
        } else if (qid === 'sunbiz_active') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.isSunbizActive = value
        } else if (qid === 'business_license') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.hasBusinessLicense = value
        } else if (qid === 'background_check') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) installerUpdateData.canPassBackgroundCheck = value
        } else if (qid === 'background_details') {
          installerUpdateData.backgroundCheckDetails = userResponse.trim()
        } else if (qid === 'vehicle') {
          installerUpdateData.vehicleDescription = userResponse.trim()
          installerUpdateData.hasVehicle = true
        } else if (qid === 'work_schedule') {
          installerUpdateData.mondayToFridayAvailability = userResponse.trim()
        } else if (qid === 'saturday_availability') {
          installerUpdateData.saturdayAvailability = userResponse.trim()
        } else if (qid === 'open_to_travel') {
          const value = parseLikelyBoolean(userResponse)
          if (value !== null) {
            installerUpdateData.openToTravel = value
            installerUpdateData.willingToTravel = value
          }
        } else if (qid === 'travel_locations') {
          const locationsArray = splitCsv(userResponse)
          if (locationsArray.length > 0) {
            installerUpdateData.travelLocations = JSON.stringify(locationsArray)
            installerUpdateData.openToTravel = true
            installerUpdateData.willingToTravel = true
          }
        }

        if (Object.keys(installerUpdateData).length > 0) {
          await prisma.installer.update({
            where: { id: interview.installerId },
            data: installerUpdateData,
          })
          console.log('Installer interview fields saved immediately:', Object.keys(installerUpdateData))
        }
      } catch (error) {
        console.error('Error saving interview fields immediately:', error)
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
    let aiResponse
    try {
      aiResponse = await generateInterviewResponse(
      updatedHistory,
      currentQuestionIndex,
      language as 'en' | 'es',
      actualNextQuestionIndex
    )
    } catch (error: any) {
      console.error('Error generating AI response:', error?.message || error)
      return NextResponse.json(
        { 
          error: error?.message || 'Failed to generate AI response',
          details: 'The AI interview service is currently unavailable. Please try again later or contact support.'
        },
        { status: 500 }
      )
    }

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

    // Generate speech for AI response (optional - won't block if it fails)
    let audioBase64 = null
    try {
      const audioBuffer = await generateSpeech(aiResponse.response)
      audioBase64 = audioBuffer.toString('base64')
      console.log('AI response speech generated successfully')
    } catch (error: any) {
      console.error('Error generating speech (continuing without audio):', error?.message || error)
      // Continue without audio - the interview can still work with text
      // This is not a critical error - the interview can proceed with text-only
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
