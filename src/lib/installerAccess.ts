import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { getInstallerTokenFromRequest, verifyInstallerToken } from "@/lib/installerToken"
import type { NextRequest } from "next/server"
import {
  storedInstallerPlatform,
  classifyNativeOs,
  isNativeAppPlatform,
  type DeviceChannel,
} from "@/lib/deviceDetection"

export async function requireActiveAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: "Unauthorized" }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive) return { ok: false as const, status: 403, error: "Admin access required" }

  return { ok: true as const, actor: "admin" as const, email, admin }
}

export async function requireInstallerOrAdmin(request: NextRequest, installerId: string) {
  const token = getInstallerTokenFromRequest(request)
  if (token) {
    try {
      const payload = verifyInstallerToken(token)
      if (!payload.installerId || payload.installerId !== installerId) {
        return { ok: false as const, status: 403, error: "Forbidden" }
      }
      return { ok: true as const, actor: "installer" as const, installerId }
    } catch {
      return { ok: false as const, status: 401, error: "Unauthorized" }
    }
  }

  return requireActiveAdmin()
}

export async function recordInstallerAccess(
  installerId: string,
  incoming: DeviceChannel,
  extras?: {
    forceNative?: boolean
    os?: 'ios' | 'android' | null
    userAgent?: string | null
    ipAddress?: string | null
  }
) {
  const prismaAny = prisma as any
  let hasNativeDeviceToken = Boolean(extras?.forceNative)
  let tokenOs: 'ios' | 'android' | null = null
  try {
    // Most recently updated token wins — never assume the first arbitrary row.
    const tokens = await prismaAny.deviceToken.findMany({
      where: { installerId, platform: { in: ['ios', 'android'] } },
      select: { platform: true },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    })
    hasNativeDeviceToken = hasNativeDeviceToken || tokens.length > 0
    for (const token of tokens) {
      const os = classifyNativeOs(token.platform)
      if (os) {
        tokenOs = os
        break
      }
    }
  } catch (err) {
    console.error('Failed to look up installer device token:', err)
  }

  let existing: string | null = null
  try {
    const row = await prismaAny.installer.findUnique({
      where: { id: installerId },
      select: { lastPlatform: true },
    })
    existing = row?.lastPlatform || null
  } catch (err) {
    console.error('Failed to read installer lastPlatform:', err)
  }

  // Prefer an explicit OS from the caller, then the request UA (iPhone/Android),
  // and only then a stored push token. Never let a stale/wrong token override a clear UA.
  const osFromUa = classifyNativeOs(extras?.userAgent)
  const os = extras?.os || osFromUa || tokenOs
  const lastPlatform = storedInstallerPlatform({
    incoming: extras?.forceNative ? 'native-app' : incoming,
    existing,
    hasNativeDeviceToken,
    os,
  })

  const ipAddress = extras?.ipAddress ? String(extras.ipAddress).trim().slice(0, 64) : ''

  await prismaAny.installer.update({
    where: { id: installerId },
    data: {
      lastPlatform,
      lastSeenAt: new Date(),
      ...(ipAddress ? { lastIpAddress: ipAddress } : {}),
    },
  })
}

export async function platformFromNativeDeviceToken(
  installerId: string,
  current?: string | null
): Promise<string | null | undefined> {
  if (isNativeAppPlatform(current)) return current
  try {
    const token = await (prisma as any).deviceToken.findFirst({
      where: { installerId, platform: { in: ['ios', 'android'] } },
      select: { platform: true },
      orderBy: { updatedAt: 'desc' },
    })
    if (!token) return current
    const os = classifyNativeOs(token.platform)
    const lastPlatform = os || 'native-app'
    await (prisma as any).installer.update({
      where: { id: installerId },
      data: { lastPlatform },
    })
    return lastPlatform
  } catch (err) {
    console.error('Failed to backfill installer app platform:', err)
    return current
  }
}
