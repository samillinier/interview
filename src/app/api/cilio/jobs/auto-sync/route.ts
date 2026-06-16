import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * GET  /api/cilio/jobs/auto-sync  ← Vercel Cron Job (every 5 min)
 * POST /api/cilio/jobs/auto-sync  ← manual trigger (requires auth)
 *
 * Phase 1: Fetches ALL Cilio jobs (parallel status-term searches) and upserts
 *          each one into CilioJobRecord so the Reports archive stays current.
 * Phase 2: Enriches records that are missing dates by fetching full job detail
 *          from Cilio (scheduledInstallDate, measureDate, bookingDate).
 */
export async function GET(request: NextRequest) {
  return runAutoSync(request)
}

export async function POST(request: NextRequest) {
  return runAutoSync(request)
}

async function runAutoSync(request: NextRequest) {
  const isGet = request.method === "GET"

  if (isGet) {
    const auth = request.headers.get("authorization") || ""
    const headerToken = auth.startsWith("Bearer ") ? auth.slice(7) : ""
    const queryToken = request.nextUrl.searchParams.get("secret") || ""
    const token = headerToken || queryToken
    const expectedSecret = process.env.CRON_SECRET
    if (!expectedSecret || token !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  } else {
    const { authOptions } = await import("@/lib/auth")
    const { getServerSession } = await import("next-auth")
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const role = String((session.user as any).role || "").toUpperCase()
    if (!["ADMIN", "MANAGER", "MODERATOR", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  console.log("[AutoSync] Starting full Cilio job fetch...")
  const startTime = Date.now()

  const allJobs = await cilio.searchJobs().catch(() => [] as any[])
  console.log(`[AutoSync] Fetched ${allJobs.length} jobs`)

  if (allJobs.length === 0) {
    return NextResponse.json({
      synced: 0,
      total: 0,
      message: "No jobs fetched from Cilio",
      durationMs: Date.now() - startTime,
    })
  }

  // Phase 1: Bulk upsert search results
  let synced = 0
  let skipped = 0

  for (const job of allJobs) {
    const statusDesc = job.orderStatusDescription || ""
    const isChargeback = statusDesc.toLowerCase().includes("chargeback") ||
      statusDesc.toLowerCase().includes("charge back")
    const jobType = isChargeback ? "chargeback" : "scheduled"

    const dateFields = job.scheduledInstallDate
      ? {
          scheduledInstallDate: new Date(job.scheduledInstallDate),
          measureDate: job.measureDate ? new Date(job.measureDate) : null,
          bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
        }
      : {}

    try {
      // Check if status changed before upsert
      const existing = await prisma.cilioJobRecord.findUnique({
        where: { orderNumber: job.orderNumber },
        select: { orderStatusDescription: true },
      })
      const statusChanged = existing && existing.orderStatusDescription !== (statusDesc || null)

      await prisma.cilioJobRecord.upsert({
        where: { orderNumber: job.orderNumber },
        create: {
          orderNumber: job.orderNumber,
          orderStatusDescription: statusDesc || null,
          jobType,
          storeNumber: job.storeNumber || null,
          storeName: job.storeName || null,
          laborCategoryDescription: job.laborCategoryDescription || null,
          workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
          scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
          measureDate: job.measureDate ? new Date(job.measureDate) : null,
          bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
          installerId: null,
          installerName: null,
          cilioPayload: job,
        },
        update: {
          orderStatusDescription: statusDesc || null,
          jobType,
          storeNumber: job.storeNumber || null,
          storeName: job.storeName || null,
          laborCategoryDescription: job.laborCategoryDescription || null,
          workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
          ...dateFields,
          cilioPayload: job,
          ...(statusChanged ? { statusChangedAt: new Date() } : {}),
        },
      })
      synced++
    } catch {
      skipped++
    }
  }

  // Phase 2: Enrich records missing dates from the full detail API
  let enriched = 0
  try {
    const missingDates = await prisma.cilioJobRecord.findMany({
      where: { scheduledInstallDate: null },
      select: { orderNumber: true },
    })

    if (missingDates.length > 0) {
      console.log(`[AutoSync] Enriching ${missingDates.length} records missing dates...`)

      for (const record of missingDates) {
        try {
          const detail = await cilio.getJobDetail(record.orderNumber)
          const di = (detail as any).dateInformation || {}
          const si = (detail as any).schedulingInformation || {}
          // Cilio field mappings:
          //   scheduledInstallDate ← desiredInstallDate (dateInformation) or scheduleDate (schedulingInformation)
          //   measureDate ← currentDate (dateInformation)
          //   bookingDate ← leadCreationDate (dateInformation)
          const sched = di.desiredInstallDate || si.scheduleDate || null
          const meas = di.currentDate || null
          const book = di.leadCreationDate || null

          if (sched || meas || book) {
            await prisma.cilioJobRecord.update({
              where: { orderNumber: record.orderNumber },
              data: {
                scheduledInstallDate: sched ? new Date(sched) : null,
                measureDate: meas ? new Date(meas) : null,
                bookingDate: book ? new Date(book) : null,
              },
            })
            enriched++
          }
        } catch {
          // Skip individual enrichment failures
        }
      }
    }
  } catch (e) {
    console.error("[AutoSync] Enrichment phase failed:", e)
  }

  const durationMs = Date.now() - startTime
  console.log(`[AutoSync] Done: ${synced} upserted, ${skipped} skipped, ${enriched} enriched in ${(durationMs / 1000).toFixed(1)}s`)

  return NextResponse.json({
    synced,
    skipped,
    enriched,
    total: allJobs.length,
    message: `Synced ${synced} jobs, enriched ${enriched} with dates (${skipped} skipped) in ${(durationMs / 1000).toFixed(1)}s`,
    durationMs,
  })
}
