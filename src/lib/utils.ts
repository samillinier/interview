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
  flooringSkills?: string[]
}): number {
  let score = 0
  const maxScore = 90

  // General Liability Insurance = 40 points (40%)
  if (data.hasGeneralLiability) {
    score += 40
  }

  // Auto Liability Insurance = 20 points (20%)
  if (data.hasCommercialAutoLiability) {
    score += 20
  }

  // Business registration = 30 points (30%)
  // Business License + State Registration
  if (data.hasBusinessLicense) {
    score += 15
  }
  if (data.isSunbizRegistered) {
    score += 15
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
  // Pass threshold: 70% of 90 points = 63 points
  const passThreshold = 63

  if (score >= passThreshold) {
    return { passed: true, reason: 'Meets minimum qualification score (70%)' }
  }

  return { passed: false, reason: `Score ${score}/90 (${Math.round((score/90)*100)}%) - Does not meet minimum qualification score of 70%` }
}

// Mobile audio compatibility utilities
export function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  // Fallback to default
  return 'audio/webm'
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
}

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

export async function resumeAudioContext(audioContext: AudioContext): Promise<void> {
  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume()
    } catch (error) {
      console.error('Error resuming audio context:', error)
    }
  }
}

export function isMediaRecorderSupported(): boolean {
  if (typeof window === 'undefined') return false
  return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported !== undefined
}
