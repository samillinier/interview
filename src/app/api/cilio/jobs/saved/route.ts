import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs/saved
 * Returns all CilioJobRecord rows — the permanent saved-job report archive.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = String((session.user as any).role || '').toUpperCase()
    if (!['ADMIN', 'MANAGER', 'MODERATOR', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const records = await prisma.cilioJobRecord.findMany({
      select: {
        id: true,
        orderNumber: true,
        orderStatusDescription: true,
        jobType: true,
        storeNumber: true,
        storeName: true,
        laborCategoryDescription: true,
        workroom: true,
        scheduledInstallDate: true,
        measureDate: true,
        bookingDate: true,
        statusChangedAt: true,
        installerId: true,
        installerName: true,
        createdAt: true,
        updatedAt: true,
        cilioPayload: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    })

    // Resolve installerId by name for records without one
    const needsLookup = records.filter(r => !r.installerId && r.installerName)
    if (needsLookup.length > 0) {
      const installerNames = Array.from(new Set(needsLookup.map(r => r.installerName!.trim())))
      const dbInstallers = await prisma.installer.findMany({
        where: { status: { not: 'rejected' } },
        select: { id: true, firstName: true, lastName: true },
      })
      const nameToId = new Map<string, string>()
      installerNames.forEach(name => {
        const lower = name.toLowerCase()
        const cilioParts = lower.split(/\s+/)
        const cilioFirst = cilioParts[0]
        const cilioLast = cilioParts[cilioParts.length - 1]
        const match = dbInstallers.find(i => {
          const full = `${i.firstName} ${i.lastName}`.trim().toLowerCase()
          const rev = `${i.lastName} ${i.firstName}`.trim().toLowerCase()
          // Exact full name match (either order)
          if (lower === full || lower === rev) return true
          // One name contains the other
          if (full.includes(lower) || lower.includes(full)) return true
          // First + last name parts match (handles middle names)
          const dbFirst = i.firstName.toLowerCase()
          const dbLast = i.lastName.toLowerCase()
          if (cilioFirst === dbFirst && cilioLast === dbLast) return true
          return false
        })
        if (match) {
          nameToId.set(lower, match.id)
          // Also persist the match for future requests
          prisma.cilioJobRecord.updateMany({
            where: { installerName: name, installerId: null },
            data: { installerId: match.id },
          }).catch(() => {}) // fire-and-forget
        }
      })
      // Augment records with resolved installerId
      needsLookup.forEach(r => {
        const id = nameToId.get(r.installerName!.trim().toLowerCase())
        if (id) (r as any).installerId = id
      })
    }

    return NextResponse.json({ records })
  } catch (error: any) {
    console.error("Fetch saved jobs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch saved jobs", details: error.message },
      { status: 500 }
    )
  }
}
