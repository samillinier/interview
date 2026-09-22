export type InterviewRecapPayload = {
  interviewId: string
  status: string
  startedAt: string | null
  completedAt: string | null
  score: number | null
  passed: boolean | null
  reason: string | null
  /** Short admin-facing memo summarizing the interview. */
  summary: string
  /** Small “don’t miss this” notes (gaps, concerns, things not on profile). */
  watchNotes: string[]
}

export type InterviewAnalysisBlob = {
  score?: number
  passed?: boolean
  reason?: string
  extractedFields?: string[]
  adminSummary?: string
  adminWatchNotes?: string[]
}

export function parseInterviewAnalysis(raw?: string | null): InterviewAnalysisBlob {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as InterviewAnalysisBlob) : {}
  } catch {
    return {}
  }
}

export function buildTranscriptFromResponses(
  responses: Array<{ questionText?: string | null; answerText?: string | null }>
): string {
  return responses
    .map((r) => {
      const q = String(r.questionText || '').trim()
      const a = String(r.answerText || '').trim()
      if (!q && !a) return ''
      return `Q: ${q}\nA: ${a || '(no answer)'}`
    })
    .filter(Boolean)
    .join('\n\n')
}
