import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

export function generateInterviewLink(installerId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/interview/${installerId}`
}

export function calculateScore(data: {
  yearsOfExperience?: number
  hasOwnCrew?: boolean
  crewSize?: number
  hasOwnTools?: boolean
  hasInsurance?: boolean
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
  hasLicense?: boolean
  hasBusinessLicense?: boolean
  isSunbizRegistered?: boolean
  flooringSpecialties?: string[]
  flooringSkills?: string[]
}): number {
  let score = 0
  const maxScore = 100

  // Experience (max 25 points)
  if (data.yearsOfExperience) {
    if (data.yearsOfExperience >= 10) score += 25
    else if (data.yearsOfExperience >= 5) score += 20
    else if (data.yearsOfExperience >= 3) score += 15
    else if (data.yearsOfExperience >= 1) score += 10
    else score += 5
  }

  // Has crew (max 10 points)
  if (data.hasOwnCrew) {
    score += 7
    if (data.crewSize && data.crewSize >= 3) score += 3
  }

  // Has tools (10 points)
  if (data.hasOwnTools) score += 10

  // Insurance - check any type (max 20 points)
  const hasAnyInsurance = data.hasInsurance || data.hasGeneralLiability || data.hasCommercialAutoLiability || data.hasWorkersComp || data.hasWorkersCompExemption
  if (hasAnyInsurance) score += 20

  // Business registration (max 15 points)
  if (data.hasBusinessLicense) score += 8
  if (data.isSunbizRegistered) score += 7

  // License (10 points)
  if (data.hasLicense) score += 10

  // Flooring specialties/skills (max 10 points)
  const skills = data.flooringSkills || data.flooringSpecialties
  if (skills && skills.length > 0) {
    score += Math.min(skills.length * 2, 10)
  }

  return Math.min(score, maxScore)
}

export function determinePassFail(score: number, data: {
  yearsOfExperience?: number
  hasInsurance?: boolean
  hasGeneralLiability?: boolean
  hasCommercialAutoLiability?: boolean
  hasWorkersComp?: boolean
  hasWorkersCompExemption?: boolean
}): { passed: boolean; reason: string } {
  // Check if they have any type of insurance
  const hasAnyInsurance = data.hasInsurance || data.hasGeneralLiability || data.hasCommercialAutoLiability || data.hasWorkersComp || data.hasWorkersCompExemption

  // Minimum requirements
  if (!data.yearsOfExperience || data.yearsOfExperience < 1) {
    return { passed: false, reason: 'Minimum 1 year of experience required' }
  }

  if (!hasAnyInsurance) {
    return { passed: false, reason: 'Insurance is required (General Liability, Commercial Auto, or Worker\'s Comp)' }
  }

  // Score threshold
  if (score >= 50) {
    return { passed: true, reason: 'Meets all minimum requirements' }
  }

  return { passed: false, reason: 'Does not meet minimum qualification score' }
}

