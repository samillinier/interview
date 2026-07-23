import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import { getInstallerTokenFromRequest, verifyInstallerToken } from "@/lib/installerToken"
import type { NextRequest } from "next/server"

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
