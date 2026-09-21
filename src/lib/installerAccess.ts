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
  extras?: { forceNative?: boolean; os?: 'ios' | 'android' | null; userAgent?: string | null }
) {
  const prismaAny = prisma as any
  let hasNativeDeviceToken = Boolean(extras?.forceNative)
  if (!hasNativeDeviceToken) {
    try {
      const token = await prismaAny.deviceToken.findFirst({
        where: { installerId, platform: { in: ["ios", "android"] } },
        select: { id: true, platform: true },
      })
      hasNativeDeviceToken = Boolean(token)
      if (!extras?.os && token?.platform) {
        extras = { ...extras, os: classifyNativeOs(token.platform) }
      }
    } catch (err) {
      console.error("Failed to look up installer device token:", err)
    }
  }

  let existing: string | null = null
  try {
    const row = await prismaAny.installer.findUnique({
      where: { id: installerId },
      select: { lastPlatform: true },
    })
    existing = row?.lastPlatform || null
  } catch (err) {
    console.error("Failed to read installer lastPlatform:", err)
  }

  const os = extras?.os || classifyNativeOs(extras?.userAgent)
  const lastPlatform = storedInstallerPlatform({
    incoming: extras?.forceNative ? "native-app" : incoming,
    existing,
    hasNativeDeviceToken,
    os,
  })

  await prismaAny.installer.update({
    where: { id: installerId },
    data: { lastPlatform, lastSeenAt: new Date() },
  })
}

export async function platformFromNativeDeviceToken(
  installerId: string,
  current?: string | null
): Promise<string | null | undefined> {
  if (isNativeAppPlatform(current)) return current
  try {
    const token = await (prisma as any).deviceToken.findFirst({
      where: { installerId, platform: { in: ["ios", "android"] } },
      select: { platform: true },
    })
    if (!token) return current
    const os = classifyNativeOs(token.platform)
    const lastPlatform = os || "native-app"
    await (prisma as any).installer.update({
      where: { id: installerId },
      data: { lastPlatform },
    })
    return lastPlatform
  } catch (err) {
    console.error("Failed to backfill installer app platform:", err)
    return current
  }
}
