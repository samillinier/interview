import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"
import type { NextRequest } from "next/server"

export const CILIO_ACCESS_ROLES = ["ADMIN", "MANAGER", "MODERATOR", "SUPER_ADMIN"] as const
export const CILIO_DIAGNOSTIC_ROLES = ["ADMIN", "SUPER_ADMIN"] as const

type Role = (typeof CILIO_ACCESS_ROLES)[number] | (typeof CILIO_DIAGNOSTIC_ROLES)[number]

function headerValue(request: NextRequest | undefined, name: string) {
  const value = request?.headers.get(name)
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

async function recordCilioGeoMetric(
  action: "cilio.api_access" | "cilio.api_blocked",
  request: NextRequest | undefined
) {
  if (!request) return
  const country = headerValue(request, "x-vercel-ip-country")?.toUpperCase() || "UNKNOWN"
  const region = headerValue(request, "x-vercel-ip-country-region") || ""
  const city = headerValue(request, "x-vercel-ip-city") || "Unknown"
  const latitude = headerValue(request, "x-vercel-ip-latitude") || ""
  const longitude = headerValue(request, "x-vercel-ip-longitude") || ""

  await prisma.cilioGeoMetric.upsert({
    where: {
      action_country_region_city_latitude_longitude: {
      action,
        country,
        region,
        city,
        latitude,
        longitude,
      },
    },
    create: {
      action,
      country,
      region,
      city,
      latitude,
      longitude,
      count: 1,
      lastSeen: new Date(),
    },
    update: {
      count: { increment: 1 },
      lastSeen: new Date(),
    },
  }).catch(() => {})
}

export async function requireCilioAccess(
  request?: NextRequest,
  allowedRoles: readonly Role[] = CILIO_ACCESS_ROLES
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const role = String((session.user as any).role || "").toUpperCase()
  if (!allowedRoles.includes(role as Role)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }

  const country = headerValue(request, "x-vercel-ip-country")?.toUpperCase()
  if (country && country !== "US") {
    await recordCilioGeoMetric("cilio.api_blocked", request)
    return { ok: false as const, response: NextResponse.json({ error: "Cilio access is restricted to the United States" }, { status: 403 }) }
  }

  await recordCilioGeoMetric("cilio.api_access", request)

  return { ok: true as const, session, role }
}
