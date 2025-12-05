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
  hasLicense?: boolean
  flooringSpecialties?: string[]
}): number {
  let score = 0
  const maxScore = 100

  // Experience (max 30 points)
  if (data.yearsOfExperience) {
    if (data.yearsOfExperience >= 10) score += 30
    else if (data.yearsOfExperience >= 5) score += 25
    else if (data.yearsOfExperience >= 3) score += 20
    else if (data.yearsOfExperience >= 1) score += 15
    else score += 5
  }

  // Has crew (max 15 points)
  if (data.hasOwnCrew) {
    score += 10
    if (data.crewSize && data.crewSize >= 3) score += 5
  }

  // Has tools (15 points)
  if (data.hasOwnTools) score += 15

  // Insurance (20 points)
  if (data.hasInsurance) score += 20

  // License (10 points)
  if (data.hasLicense) score += 10

  // Flooring specialties (max 10 points)
  if (data.flooringSpecialties && data.flooringSpecialties.length > 0) {
    score += Math.min(data.flooringSpecialties.length * 2, 10)
  }

  return Math.min(score, maxScore)
}

export function determinePassFail(score: number, data: {
  yearsOfExperience?: number
  hasInsurance?: boolean
}): { passed: boolean; reason: string } {
  // Minimum requirements
  if (!data.yearsOfExperience || data.yearsOfExperience < 1) {
    return { passed: false, reason: 'Minimum 1 year of experience required' }
  }

  if (!data.hasInsurance) {
    return { passed: false, reason: 'Insurance is required' }
  }

  // Score threshold
  if (score >= 50) {
    return { passed: true, reason: 'Meets all minimum requirements' }
  }

  return { passed: false, reason: 'Does not meet minimum qualification score' }
}

