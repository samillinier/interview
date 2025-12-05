import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { extractInterviewData } from '@/lib/openai'
import { calculateScore, determinePassFail } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json()

    // Get the interview with all responses
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        installer: true,
        responses: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Build full transcript
    const transcript = interview.responses
      .map((r) => `Q: ${r.questionText}\nA: ${r.answerText}`)
      .join('\n\n')

    // Extract structured data using AI
    const extractedData = await extractInterviewData(transcript)

    // Calculate score
    const score = calculateScore({
      yearsOfExperience: extractedData.yearsOfExperience,
      hasOwnCrew: extractedData.hasOwnCrew,
      crewSize: extractedData.crewSize,
      hasOwnTools: extractedData.hasOwnTools,
      hasInsurance: extractedData.hasInsurance,
      hasLicense: extractedData.hasLicense,
      flooringSpecialties: extractedData.flooringSpecialties,
    })

    // Determine pass/fail
    const { passed, reason } = determinePassFail(score, {
      yearsOfExperience: extractedData.yearsOfExperience,
      hasInsurance: extractedData.hasInsurance,
    })

    // Update installer record with extracted data
    await prisma.installer.update({
      where: { id: interview.installerId },
      data: {
        firstName: extractedData.firstName || interview.installer.firstName,
        lastName: extractedData.lastName || interview.installer.lastName,
        phone: extractedData.phone || interview.installer.phone,
        yearsOfExperience: extractedData.yearsOfExperience,
        flooringSpecialties: extractedData.flooringSpecialties
          ? JSON.stringify(extractedData.flooringSpecialties)
          : null,
        hasOwnCrew: extractedData.hasOwnCrew ?? false,
        crewSize: extractedData.crewSize,
        hasOwnTools: extractedData.hasOwnTools ?? false,
        toolsDescription: extractedData.toolsDescription,
        hasVehicle: extractedData.hasVehicle ?? false,
        serviceAreas: extractedData.serviceAreas
          ? JSON.stringify(extractedData.serviceAreas)
          : null,
        willingToTravel: extractedData.willingToTravel ?? false,
        availability: extractedData.availability,
        canStartImmediately: extractedData.canStartImmediately ?? false,
        hasInsurance: extractedData.hasInsurance ?? false,
        insuranceType: extractedData.insuranceType,
        hasLicense: extractedData.hasLicense ?? false,
        status: passed ? 'passed' : 'failed',
        passFailReason: reason,
        overallScore: score,
        notes: extractedData.additionalNotes,
      },
    })

    // Update interview with analysis
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        extractedData: JSON.stringify(extractedData),
        aiAnalysis: JSON.stringify({
          score,
          passed,
          reason,
          extractedFields: Object.keys(extractedData),
        }),
        transcript,
      },
    })

    return NextResponse.json({
      success: true,
      result: {
        passed,
        reason,
        score,
        extractedData,
      },
    })
  } catch (error) {
    console.error('Error completing interview:', error)
    return NextResponse.json(
      { error: 'Failed to complete interview' },
      { status: 500 }
    )
  }
}

