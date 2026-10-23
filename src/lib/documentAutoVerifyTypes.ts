export type AutoVerifyVerdict = 'match' | 'review' | 'mismatch'

export type AutoVerifyCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type AutoVerifyResult = {
  verdict: AutoVerifyVerdict
  summary: string
  claimedType: string
  claimedTypeLabel: string
  detectedType: string | null
  detectedTypeLabel: string | null
  namedInsured: string | null
  expiryDate: string | null
  effectiveDate: string | null
  issueDate: string | null
  coverages: string[]
  certificateHolder: string | null
  autoWaived: boolean
  checks: AutoVerifyCheck[]
  notes: string | null
}
