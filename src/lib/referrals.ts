import crypto from 'crypto'
import prisma from '@/lib/db'

export function normalizeReferralCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const v = code.trim().toLowerCase()
  return v ? v : null
}

export async function generateUniqueReferralCode(): Promise<string> {
  // 8 hex chars (e.g. "a1b2c3d4") is short and URL-friendly.
  for (let attempt = 0; attempt < 15; attempt++) {
    const code = crypto.randomBytes(4).toString('hex')
    const existing = await prisma.installer.findUnique({
      where: { referralCode: code },
      select: { id: true },
    })
    if (!existing) return code
  }
  throw new Error('Unable to generate unique referral code')
}

export async function ensureInstallerReferralCode(installerId: string): Promise<string> {
  const existing = await prisma.installer.findUnique({
    where: { id: installerId },
    select: { referralCode: true },
  })

  if (existing?.referralCode) return existing.referralCode

  const code = await generateUniqueReferralCode()
  await prisma.installer.update({
    where: { id: installerId },
    data: { referralCode: code },
  })
  return code
}

export async function resolveReferrerInstallerId(referralCode: unknown): Promise<string | null> {
  const code = normalizeReferralCode(referralCode)
  if (!code) return null

  const referrer = await prisma.installer.findUnique({
    where: { referralCode: code },
    select: { id: true },
  })

  return referrer?.id || null
}

