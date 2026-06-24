import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

export const maxDuration = 300

export const dynamic = "force-dynamic"
export const maxDuration = 600

/** Heuristic to detect test/sandbox jobs from Cilio that should not be stored. */
function isTestJob(job: any): boolean {
  const fields = [
    job.customerLastName,
    job.customerFirstName,
    job.customerEmail,
    job.poJobNumber,
    job.storeName,
  ]
  for (const val of fields) {
    if (typeof val === "string" && /\btest\b/i.test(val)) return true
  }
  // Also catch "Test_Project" style scope notes
  if (typeof job.scopeOfWorkNotes === "string" && /test[_\s]project/i.test(job.scopeOfWorkNotes)) return true
  return false
}

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

  const cilioKey = process.env.CILIO_SUBSCRIPTION_KEY || ""
  const cilioUrl = process.env.CILIO_API_BASE_URL || "default-gatewayqa"
  console.log(`[AutoSync] Starting full Cilio job fetch... (key=${cilioKey.slice(0,6)}..., url=${cilioUrl})`)
  const startTime = Date.now()

  let fetchError: string | null = null
  const allJobs = await cilio.searchAllJobs({
    monthsBack: 3, // 3-month window, runs every 5 min with 300s maxDuration
    onProgress: (fetched, window) => {
      console.log(`[AutoSync] Progress: ${fetched} jobs (window ${window})`)
    },
  }).catch((e: any) => {
    fetchError = e?.message || String(e)
    console.error("[AutoSync] searchAllJobs FAILED:", fetchError, e?.stack?.slice(0, 500))
    return [] as any[]
  })

  // Filter out test jobs before upserting
  const testFiltered = allJobs.filter(j => !isTestJob(j))
  const removed = allJobs.length - testFiltered.length
  if (removed > 0) {
    console.log(`[AutoSync] Filtered out ${removed} test jobs`)
  }

  if (testFiltered.length === 0) {
    return NextResponse.json({
      synced: 0,
      total: 0,
      removed,
      message: "No real jobs fetched from Cilio",
      diagnostic: fetchError ? `Cilio fetch error: ${fetchError}` : "Cilio returned no jobs for the date windows (all were test jobs)",
      env: { keyConfigured: cilioKey.length > 0, url: cilioUrl },
      durationMs: Date.now() - startTime,
    })
  }

  // Phase 1: Bulk upsert search results
  let synced = 0
  let skipped = 0

  for (const job of testFiltered) {
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

  // Phase 2: Enrich records from the full detail API (dates + installer name + installerId)
  let enriched = 0
  try {
    // Pre-fetch all installer names for ID resolution
    const dbInstallers = await prisma.installer.findMany({
      where: { status: { not: 'rejected' } },
      select: { id: true, firstName: true, lastName: true },
    })

    const needsEnrichment = await prisma.cilioJobRecord.findMany({
      where: {
        OR: [
          { scheduledInstallDate: null },
          { installerName: null },
          { installerId: null },
          { crewPayTotal: null },
        ],
      },
      select: { orderNumber: true, scheduledInstallDate: true, installerName: true, installerId: true, crewPayTotal: true },
      orderBy: { orderNumber: "asc" },
      take: 100,
    })

    if (needsEnrichment.length > 0) {
      console.log(`[AutoSync] Enriching ${needsEnrichment.length} records...`)

      for (const record of needsEnrichment) {
        try {
          const detail = await cilio.getJobDetail(record.orderNumber)
          const di = (detail as any).dateInformation || {}
          const si = (detail as any).schedulingInformation || {}

          // Date fields
          const sched = di.desiredInstallDate || si.scheduleDate || null
          const meas = di.currentDate || null
          const book = di.leadCreationDate || null

          // Installer name: extract from scheduling info or responsible user
          const scheduledResources = si.scheduledResources?.trim() || null
          const taskResources = [si.taskOneResource, si.taskTwoResource, si.taskThreeResource]
            .filter(Boolean)
            .map((r: string) => r.trim())
            .join(', ') || null
          const scheduledUser = si.scheduledUserRenovatorName?.trim() || null
          const firmName = si.scheduledUserFirmName?.trim() || null
          const installerName = scheduledResources || taskResources || scheduledUser || firmName || null

          // Crew pay data
          const crewInfo = (detail as any).crewPayInformation || {}
          const crewPay = crewInfo.crewPayJobTotal != null ? Number(crewInfo.crewPayJobTotal) : null
          const crewPayDaily = crewInfo.crewPayDailyTotal != null ? Number(crewInfo.crewPayDailyTotal) : null
          const crewPayValue = crewPay ?? crewPayDaily ?? null

          const updateData: any = {}
          if (!record.scheduledInstallDate && (sched || meas || book)) {
            if (sched) updateData.scheduledInstallDate = new Date(sched)
            if (meas) updateData.measureDate = new Date(meas)
            if (book) updateData.bookingDate = new Date(book)
          }
          if (!record.installerName && installerName) {
            updateData.installerName = installerName
          }
          if (record.crewPayTotal == null && crewPayValue != null) {
            updateData.crewPayTotal = crewPayValue
          }

          // Resolve installerId by matching installerName against our DB
          const nameToResolve = installerName || record.installerName
          if (!record.installerId && nameToResolve) {
            const lower = nameToResolve.toLowerCase()
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
            if (match) updateData.installerId = match.id
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.cilioJobRecord.update({
              where: { orderNumber: record.orderNumber },
              data: updateData,
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
    total: testFiltered.length,
    removed,
    message: `Synced ${synced} jobs, enriched ${enriched} with dates (${skipped} skipped, ${removed} test jobs filtered) in ${(durationMs / 1000).toFixed(1)}s`,
    durationMs,
  })
}
