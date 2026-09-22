/** Short admin-facing labels for AI interview question IDs. */
export const INTERVIEW_RECAP_LABELS: Record<string, string> = {
  intro: 'Name',
  experience: 'Years of experience',
  skills: 'Flooring skills',
  primary_surface: 'Primary / strongest surface',
  general_liability: 'General liability insurance',
  auto_liability: 'Commercial auto liability',
  workers_comp: "Workers' compensation",
  crew: 'Works with crew / helper',
  crew_size: 'Crew size',
  workroom: 'Workroom applied to',
  workers_comp_exemption: "Workers' comp exemption",
  sunbiz_registered: 'State business registration',
  sunbiz_active: 'Registration active',
  business_license: 'Business tax receipt / license',
  background_check: 'Can pass background check',
  background_details: 'Background details',
  vehicle: 'Vehicle',
  work_schedule: 'Mon–Fri availability',
  saturday_availability: 'Saturday availability',
  open_to_travel: 'Open to travel',
  travel_locations: 'Travel locations',
  closing: 'Additional notes',
  contact: 'Contact',
}

export type InterviewRecapAnswer = {
  questionId: string
  label: string
  question: string
  answer: string
}

export type InterviewRecapPayload = {
  interviewId: string
  status: string
  startedAt: string | null
  completedAt: string | null
  score: number | null
  passed: boolean | null
  reason: string | null
  highlights: string[]
  answers: InterviewRecapAnswer[]
}

function shortQuestion(text: string) {
  const cleaned = String(text || '').replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 140) return cleaned
  return `${cleaned.slice(0, 137)}…`
}

function formatHighlightValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null
  if (Array.isArray(value)) {
    const parts = value.map((v) => String(v || '').trim()).filter(Boolean)
    return parts.length ? parts.join(', ') : null
  }
  const text = String(value).trim()
  return text || null
}

/** Build a short “what admins need to know” list from extracted interview JSON. */
export function buildInterviewHighlights(
  extracted: Record<string, unknown> | null | undefined,
  analysis?: { score?: number; passed?: boolean; reason?: string } | null
): string[] {
  const highlights: string[] = []
  if (analysis?.passed === true) highlights.push('Result: Passed / qualified')
  if (analysis?.passed === false) highlights.push('Result: Not passed')
  if (typeof analysis?.score === 'number' && Number.isFinite(analysis.score)) {
    highlights.push(`Score: ${analysis.score}`)
  }
  if (analysis?.reason) highlights.push(`Reason: ${analysis.reason}`)

  if (!extracted || typeof extracted !== 'object') return highlights

  const rows: Array<[string, unknown]> = [
    ['Experience', extracted.yearsOfExperience],
    ['Skills', extracted.flooringSkills],
    ['Primary surface', extracted.primaryFlooringSurface],
    ['Crew', extracted.hasOwnCrew],
    ['Crew size', extracted.crewSize],
    ['General liability', extracted.hasGeneralLiability],
    ['Commercial auto', extracted.hasCommercialAutoLiability],
    ["Workers' comp", extracted.hasWorkersComp],
    ["Workers' comp exemption", extracted.hasWorkersCompExemption],
    ['Business license', extracted.hasBusinessLicense],
    ['SunBiz / state registration', extracted.isSunbizRegistered],
    ['Background check', extracted.canPassBackgroundCheck],
    ['Vehicle', extracted.vehicleDescription || extracted.hasVehicle],
    ['Mon–Fri', extracted.mondayToFridayAvailability],
    ['Saturday', extracted.saturdayAvailability],
    ['Open to travel', extracted.openToTravel],
    ['Travel locations', extracted.travelLocations],
  ]

  for (const [label, value] of rows) {
    const formatted = formatHighlightValue(value)
    if (formatted) highlights.push(`${label}: ${formatted}`)
  }

  return highlights
}

export function mapInterviewAnswers(
  responses: Array<{ questionId: string; questionText: string; answerText?: string | null }>
): InterviewRecapAnswer[] {
  return responses
    .map((row) => {
      const answer = String(row.answerText || '').trim()
      if (!answer) return null
      const questionId = String(row.questionId || '')
      return {
        questionId,
        label: INTERVIEW_RECAP_LABELS[questionId] || shortQuestion(row.questionText) || questionId || 'Answer',
        question: String(row.questionText || ''),
        answer,
      }
    })
    .filter((row): row is InterviewRecapAnswer => Boolean(row))
}
