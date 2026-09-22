import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  buildInterviewHighlights,
  mapInterviewAnswers,
  type InterviewRecapPayload,
} from '@/lib/interviewRecap'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

/**
 * Admin-facing AI interview recap: Q&A answers + key highlights from the
 * latest interview for this installer.
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
            questionId: true,
            questionText: true,
            answerText: true,
          },
        },
      },
    })

    if (!interview) {
      return NextResponse.json(
        { success: true, recap: null },
        { status: 200, headers: noStore }
      )
    }

    let extracted: Record<string, unknown> = {}
    let analysis: { score?: number; passed?: boolean; reason?: string } = {}
    try {
      if (interview.extractedData) extracted = JSON.parse(interview.extractedData)
    } catch {
      extracted = {}
    }
    try {
      if (interview.aiAnalysis) analysis = JSON.parse(interview.aiAnalysis)
    } catch {
      analysis = {}
    }

    const answers = mapInterviewAnswers(interview.InterviewResponse)
    const highlights = buildInterviewHighlights(extracted, analysis)

    const recap: InterviewRecapPayload = {
      interviewId: interview.id,
      status: interview.status,
      startedAt: interview.startedAt?.toISOString?.() || null,
      completedAt: interview.completedAt?.toISOString?.() || null,
      score: typeof analysis.score === 'number' ? analysis.score : null,
      passed: typeof analysis.passed === 'boolean' ? analysis.passed : null,
      reason: analysis.reason ? String(analysis.reason) : null,
      highlights,
      answers,
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
