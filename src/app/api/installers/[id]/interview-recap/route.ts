import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { generateInterviewAdminRecap } from '@/lib/openai'
import {
  buildTranscriptFromResponses,
  parseInterviewAnalysis,
  type InterviewRecapPayload,
} from '@/lib/interviewRecap'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/**
 * Admin-facing AI interview recap: a short summary note + “don’t miss” watch notes.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: noStore })
    }

    const resolved = context.params instanceof Promise ? await context.params : context.params
    const installerId = String(resolved.id || '').trim()
    if (!installerId) {
      return NextResponse.json({ error: 'Installer id required' }, { status: 400, headers: noStore })
    }

    const interview = await prisma.interview.findFirst({
      where: { installerId },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
      include: {
        InterviewResponse: {
          orderBy: { createdAt: 'asc' },
          select: {
            questionText: true,
            answerText: true,
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json({ success: true, recap: null }, { status: 200, headers: noStore })
    }

    let extracted: Record<string, unknown> = {}
    try {
      if (interview.extractedData) extracted = JSON.parse(interview.extractedData)
    } catch {
      extracted = {}
    }

    let analysis = parseInterviewAnalysis(interview.aiAnalysis)
    let summary = String(analysis.adminSummary || '').trim()
    let watchNotes = Array.isArray(analysis.adminWatchNotes)
      ? analysis.adminWatchNotes.map((n) => String(n || '').trim()).filter(Boolean)
      : []

    const transcript =
      String(interview.transcript || '').trim() ||
      buildTranscriptFromResponses(interview.InterviewResponse)

    // Lazy-generate once for older interviews that never got an admin memo.
    if (!summary && transcript.length > 40) {
      try {
        const generated = await generateInterviewAdminRecap({
          transcript,
          extractedData: extracted,
          analysis,
        })
        summary = generated.summary
        watchNotes = generated.watchNotes

        analysis = {
          ...analysis,
          adminSummary: summary,
          adminWatchNotes: watchNotes,
        }
        await prisma.interview.update({
          where: { id: interview.id },
          data: { aiAnalysis: JSON.stringify(analysis) },
        })
      } catch (err) {
        console.error('Failed to generate interview admin recap:', err)
        summary = analysis.reason
          ? `Interview reviewed. ${analysis.reason}`
          : 'Interview on file. Open the profile for extracted details.'
      }
    }

    const recap: InterviewRecapPayload = {
      interviewId: interview.id,
      status: interview.status,
      startedAt: interview.startedAt?.toISOString?.() || null,
      completedAt: interview.completedAt?.toISOString?.() || null,
      score: typeof analysis.score === 'number' ? analysis.score : null,
      passed: typeof analysis.passed === 'boolean' ? analysis.passed : null,
      reason: analysis.reason ? String(analysis.reason) : null,
      summary:
        summary ||
        (transcript
          ? 'Interview answers are on file. Summary is still generating — reopen remarks in a moment.'
          : ''),
      watchNotes,
    }

    return NextResponse.json({ success: true, recap }, { headers: noStore })
  } catch (error: any) {
    console.error('interview-recap failed', error)
    return NextResponse.json(
      { error: 'Failed to load interview recap', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
