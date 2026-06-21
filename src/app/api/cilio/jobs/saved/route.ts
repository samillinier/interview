import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs/saved
 * Returns all CilioJobRecord rows — the permanent saved-job report archive.
 * Uses PostgreSQL jsonb_build_object to send only the fields the frontend needs,
 * instead of the full cilioPayload blob (saves ~20MB per response).
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

    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string
      orderNumber: number
      orderStatusDescription: string | null
      jobType: string
      storeNumber: string | null
      storeName: string | null
      laborCategoryDescription: string | null
      workroom: string | null
      scheduledInstallDate: Date | null
      measureDate: Date | null
      bookingDate: Date | null
      statusChangedAt: Date | null
      installerId: string | null
      installerName: string | null
      createdAt: Date
      updatedAt: Date
      slimPayload: any
    }>>(
      `SELECT
        id,
        "orderNumber",
        "orderStatusDescription",
        "jobType",
        "storeNumber",
        "storeName",
        "laborCategoryDescription",
        "workroom",
        "scheduledInstallDate",
        "measureDate",
        "bookingDate",
        "statusChangedAt",
        "installerId",
        "installerName",
        "createdAt",
        "updatedAt",
        jsonb_build_object(
          'poAmount', "cilioPayload"->'poAmount',
          'customerFirstName', "cilioPayload"->'customerFirstName',
          'customerLastName', "cilioPayload"->'customerLastName',
          'customerFirstLast', "cilioPayload"->'customerFirstLast',
          'customerInformation', jsonb_build_object(
            'customerName', "cilioPayload"->'customerInformation'->'customerName',
            'customerFullName', "cilioPayload"->'customerInformation'->'customerFullName'
          ),
          'dateInformation', jsonb_build_object(
            'desiredInstallDate', "cilioPayload"->'dateInformation'->'desiredInstallDate',
            'currentDate', "cilioPayload"->'dateInformation'->'currentDate',
            'leadCreationDate', "cilioPayload"->'dateInformation'->'leadCreationDate'
          ),
          'schedulingInformation', jsonb_build_object(
            'scheduleDate', "cilioPayload"->'schedulingInformation'->'scheduleDate'
          ),
          'currentOrderStatusDate', "cilioPayload"->'currentOrderStatusDate',
          'jobNumber', "cilioPayload"->'jobNumber',
          'projectNumber', "cilioPayload"->'projectNumber',
          'purchaserPO', "cilioPayload"->'purchaserPO',
          'orderStorePO', "cilioPayload"->'orderStorePO',
          'invoiceNumber', "cilioPayload"->'invoiceNumber',
          'salesOrderNumber', "cilioPayload"->'salesOrderNumber',
          'permitNumber', "cilioPayload"->'permitNumber',
          'salesAssociate', "cilioPayload"->'salesAssociate',
          'storeDistrict', "cilioPayload"->'storeDistrict',
          'enterpriseGroupNumber', "cilioPayload"->'enterpriseGroupNumber',
          'scopeOfWorkNotes', "cilioPayload"->'scopeOfWorkNotes'
        ) as "slimPayload"
      FROM "CilioJobRecord"
      ORDER BY "updatedAt" DESC
      LIMIT 100000`
    )

    // Convert to frontend-expected shape with cilioPayload = slimPayload
    const records = rows.map(r => ({
      id: r.id,
      orderNumber: r.orderNumber,
      orderStatusDescription: r.orderStatusDescription,
      jobType: r.jobType,
      storeNumber: r.storeNumber,
      storeName: r.storeName,
      laborCategoryDescription: r.laborCategoryDescription,
      workroom: r.workroom,
      scheduledInstallDate: r.scheduledInstallDate ? r.scheduledInstallDate.toISOString() : null,
      measureDate: r.measureDate ? r.measureDate.toISOString() : null,
      bookingDate: r.bookingDate ? r.bookingDate.toISOString() : null,
      statusChangedAt: r.statusChangedAt ? r.statusChangedAt.toISOString() : null,
      installerId: r.installerId,
      installerName: r.installerName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      cilioPayload: r.slimPayload,
    }))

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
          if (lower === full || lower === rev) return true
          if (full.includes(lower) || lower.includes(full)) return true
          const dbFirst = i.firstName.toLowerCase()
          const dbLast = i.lastName.toLowerCase()
          if (cilioFirst === dbFirst && cilioLast === dbLast) return true
          return false
        })
        if (match) {
          nameToId.set(lower, match.id)
          prisma.cilioJobRecord.updateMany({
            where: { installerName: name, installerId: null },
            data: { installerId: match.id },
          }).catch(() => {})
        }
      })
      needsLookup.forEach(r => {
        const id = nameToId.get(r.installerName!.trim().toLowerCase())
        if (id) r.installerId = id
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
