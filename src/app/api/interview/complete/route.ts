import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { extractInterviewData } from '@/lib/openai'
import { calculateScore, determinePassFail } from '@/lib/utils'
import { Resend } from 'resend'

const QUALIFIED_LOGIN_URL = 'https://job.floorinteriorservices.com/installer/login'

function buildQualifiedEmailHtml(logoUrl: string) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 640px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px; padding: 20px 0;">
          <img src="${logoUrl}" alt="Floor Interior Services" style="max-width: 200px; height: auto; display: block; margin: 0 auto;" />
        </div>

        <h1 style="font-size: 22px; color: #0f172a; margin: 0 0 18px 0;">Action Required: Complete Your AI Interview &amp; Profile</h1>

        <p>Thank you for your interest in partnering with Floor Interior Services. We’re excited to move forward with your onboarding.</p>

        <p>At the moment, it looks like your AI interview has not been completed, which is required to proceed to the next steps in the onboarding process.</p>

        <p>Please log in to the installer portal using the link below and complete your on boarding process along with the required profile information. Make sure to use the same email address you used to start the process, as this is how your profile is tracked in our system.</p>

        <div style="text-align: center; margin: 26px 0;">
          <a href="${QUALIFIED_LOGIN_URL}" style="background-color: #22c55e; color: white; padding: 13px 20px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Continue Onboarding
          </a>
        </div>

        <p style="font-size: 13px; color: #666;">If the button doesn't work, copy and paste this link:</p>
        <p style="word-break: break-all; font-size: 13px; color: #2563eb;">${QUALIFIED_LOGIN_URL}</p>

        <p>Once completed, your profile will be reviewed, and we will guide you through the remaining onboarding steps.</p>

        <p>If you have any questions or need assistance at any point, please don’t hesitate to reach out — we’re here to help.</p>

        <p>We look forward to working with you.</p>

        <p>Best regards,<br />Floor Interior Services Team</p>
      </body>
    </html>
  `
}

const qualifiedText = `Action Required: Complete Your AI Interview & Profile

Thank you for your interest in partnering with Floor Interior Services. We’re excited to move forward with your onboarding.

At the moment, it looks like your AI interview has not been completed, which is required to proceed to the next steps in the onboarding process.

Please log in to the installer portal using the link below and complete your on boarding process along with the required profile information. Make sure to use the same email address you used to start the process, as this is how your profile is tracked in our system.

${QUALIFIED_LOGIN_URL}

Once completed, your profile will be reviewed, and we will guide you through the remaining onboarding steps.

If you have any questions or need assistance at any point, please don’t hesitate to reach out — we’re here to help.

We look forward to working with you.

Best regards,`

export async function POST(request: NextRequest) {
  try {
    const { interviewId } = await request.json()

    // Get the interview with all responses
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        Installer: true,
        InterviewResponse: true,
      },
    })

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Build full transcript
    const transcript = interview.InterviewResponse
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
    const updatedInstaller = await prisma.installer.update({
      where: { id: interview.installerId },
      data: {
        firstName: extractedData.firstName || interview.Installer.firstName,
        lastName: extractedData.lastName || interview.Installer.lastName,
        phone: extractedData.phone || interview.Installer.phone,
        yearsOfExperience: extractedData.yearsOfExperience,
        flooringSkills: extractedData.flooringSkills
          ? JSON.stringify(extractedData.flooringSkills)
          : null,
        hasOwnCrew: extractedData.hasOwnCrew ?? false,
        crewSize: extractedData.crewSize,
        hasOwnTools: false, // Not currently asked in interview
        toolsDescription: null, // Not currently extracted
        hasVehicle: extractedData.hasVehicle ?? (extractedData.vehicleDescription ? true : false), // Set to true if vehicle description is provided or explicitly extracted
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
        mondayToFridayAvailability: extractedData.mondayToFridayAvailability || null,
        saturdayAvailability: extractedData.saturdayAvailability || null,
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

    // Send email when installer passes (qualified).
    if (passed && updatedInstaller.email) {
      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const resend = new Resend(resendApiKey)
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
        const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Services'
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://job.floorinteriorservices.com'
        const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`

        try {
          await resend.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: updatedInstaller.email,
            subject: 'Action Required: Complete Your AI Interview & Profile',
            html: buildQualifiedEmailHtml(logoUrl),
            text: qualifiedText,
          })
        } catch (e: any) {
          console.error('Failed to send passed interview email:', e?.message || e)
        }
      } else {
        console.warn('RESEND_API_KEY not configured - passed interview email not sent')
      }
    }

    return NextResponse.json({
      success: true,
      result: {
        passed,
        reason,
        score,
        extractedData,
        installerId: interview.installerId,
        email: interview.Installer.email,
        hasAccount: !!(interview.Installer.username && interview.Installer.passwordHash),
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

