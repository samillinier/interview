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
      hasOwnTools: false, // Not currently asked in interview
      hasInsurance: extractedData.hasInsurance,
      hasGeneralLiability: extractedData.hasGeneralLiability,
      hasCommercialAutoLiability: extractedData.hasCommercialAutoLiability,
      hasWorkersComp: extractedData.hasWorkersComp,
      hasWorkersCompExemption: extractedData.hasWorkersCompExemption,
      hasLicense: extractedData.hasLicense,
      hasBusinessLicense: extractedData.hasBusinessLicense,
      isSunbizRegistered: extractedData.isSunbizRegistered,
      flooringSpecialties: extractedData.flooringSpecialties,
      flooringSkills: extractedData.flooringSkills,
    })

    // Determine pass/fail
    const { passed, reason } = determinePassFail(score, {
      yearsOfExperience: extractedData.yearsOfExperience,
      hasInsurance: extractedData.hasInsurance,
      hasGeneralLiability: extractedData.hasGeneralLiability,
      hasCommercialAutoLiability: extractedData.hasCommercialAutoLiability,
      hasWorkersComp: extractedData.hasWorkersComp,
      hasWorkersCompExemption: extractedData.hasWorkersCompExemption,
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
        flooringSkills: extractedData.flooringSkills
          ? JSON.stringify(extractedData.flooringSkills)
          : null,
        hasOwnCrew: extractedData.hasOwnCrew ?? false,
        crewSize: extractedData.crewSize,
        hasOwnTools: false, // Not currently asked in interview
        toolsDescription: null, // Not currently extracted
        hasVehicle: false, // Not currently asked in interview
        vehicleDescription: extractedData.vehicleDescription,
        serviceAreas: null, // Not currently extracted
        willingToTravel: extractedData.openToTravel ?? false,
        availability: null, // Not currently extracted
        canStartImmediately: false, // Not currently asked in interview
        hasInsurance: extractedData.hasInsurance ?? false,
        insuranceType: null, // Not currently extracted
        hasLicense: extractedData.hasLicense ?? false,
        // New insurance & licensing fields
        hasGeneralLiability: extractedData.hasGeneralLiability ?? false,
        hasCommercialAutoLiability: extractedData.hasCommercialAutoLiability ?? false,
        hasWorkersComp: extractedData.hasWorkersComp ?? false,
        hasWorkersCompExemption: extractedData.hasWorkersCompExemption ?? false,
        isSunbizRegistered: extractedData.isSunbizRegistered ?? false,
        isSunbizActive: false, // Not currently extracted
        hasBusinessLicense: extractedData.hasBusinessLicense ?? false,
        // Background check
        canPassBackgroundCheck: extractedData.canPassBackgroundCheck,
        backgroundCheckDetails: null, // Not currently extracted
        // Schedule availability
        mondayToFridayAvailability: null, // Not currently extracted
        saturdayAvailability: null, // Not currently extracted
        // Travel
        openToTravel: extractedData.openToTravel ?? false,
        travelLocations: extractedData.travelLocations
          ? JSON.stringify(extractedData.travelLocations)
          : null,
        // Status & scoring
        status: passed ? 'passed' : 'failed',
        passFailReason: reason,
        overallScore: score,
        notes: null, // Not currently extracted
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

