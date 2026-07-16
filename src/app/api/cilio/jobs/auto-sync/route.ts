import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 300

// In-memory lock to prevent concurrent auto-sync invocations from stacking up.
// Serverless functions can be invoked while a previous one is still running if
// the cron schedule fires before maxDuration expires.
let autoSyncRunning = false

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

  // Prevent concurrent invocations (cron can fire before previous run completes)
  if (autoSyncRunning) {
    console.log("[AutoSync] Skipped — previous invocation still in progress")
    return NextResponse.json({
      synced: 0,
      total: 0,
      message: "Auto-sync already in progress, skipping this invocation",
      durationMs: 0,
    })
  }
  autoSyncRunning = true

  try {
    if (isGet) {
      const auth = request.headers.get("authorization") || ""
      const headerToken = auth.startsWith("Bearer ") ? auth.slice(7) : ""
      const token = headerToken
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

    const cilioUrl = process.env.CILIO_API_BASE_URL || "default-gatewayqa"
    console.log(`[AutoSync] Starting Cilio sync (last ~1 month via weekly windows)... (url=${cilioUrl})`)
    const startTime = Date.now()

    // ── DELTA SYNC ──
    // Fetch recent jobs via weekly date windows.
    // Cilio pagination is broken (PageSize=500 returns ~10, totalPages always 1),
    // so searchAllJobs walks weekly OrderModifiedDate windows with pageSize=50.
    let fetchError: string | null = null
    let allJobs: any[] = []

    try {
      allJobs = await cilio.searchAllJobs({
        monthsBack: 1,
        pageSize: 50,
        onProgress: (count, detail) => console.log(`[AutoSync] ${count} jobs (${detail})`),
      })
    } catch (e: any) {
      fetchError = e?.message || String(e)
      console.error("[AutoSync] Fetch FAILED:", fetchError)
      allJobs = []
    }

    console.log(`[AutoSync] Fetched ${allJobs.length} jobs from last ~1 month`)

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
        env: { keyConfigured: (process.env.CILIO_SUBSCRIPTION_KEY || "").length > 0, url: cilioUrl },
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

        const data = {
          orderStatusDescription: statusDesc || null,
          jobType,
          storeNumber: job.storeNumber || null,
          storeName: job.storeName || null,
          laborCategoryDescription: job.laborCategoryDescription || null,
          workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
          ...dateFields,
          ...(statusChanged ? { statusChangedAt: new Date() } : {}),
        }

        await prisma.cilioJobRecord.upsert({
          where: { orderNumber: job.orderNumber },
          create: {
            ...data,
            orderNumber: job.orderNumber,
            installerId: null,
            installerName: null,
            // Only store essential fields from the Cilio response, not the full
            // JSON blob. The full cilioPayload was 20-50 KB per job and was a
            // major contributor to 2,661 GB/month Neon egress.
            cilioPayload: {
              customerFirstName: job.customerFirstName,
              customerLastName: job.customerLastName,
              poAmount: job.poAmount,
              currentOrderStatusDate: job.currentOrderStatusDate,
              scopeOfWorkNotes: job.scopeOfWorkNotes,
              jobNumber: job.jobNumber,
              projectNumber: job.projectNumber,
              purchaserPO: job.purchaserPO,
              orderStorePO: job.orderStorePO,
              invoiceNumber: job.invoiceNumber,
              salesOrderNumber: job.salesOrderNumber,
              permitNumber: job.permitNumber,
              salesAssociate: job.salesAssociate,
              storeDistrict: job.storeDistrict,
              enterpriseGroupNumber: job.enterpriseGroupNumber,
            },
          },
          update: {
            ...data,
            // Only update cilioPayload when status changed — avoids rewriting
            // the large JSON blob on every sync cycle (cuts egress ~50-80%)
            ...(statusChanged ? { cilioPayload: {
              customerFirstName: job.customerFirstName,
              customerLastName: job.customerLastName,
              poAmount: job.poAmount,
              currentOrderStatusDate: job.currentOrderStatusDate,
              scopeOfWorkNotes: job.scopeOfWorkNotes,
              jobNumber: job.jobNumber,
              projectNumber: job.projectNumber,
              purchaserPO: job.purchaserPO,
              orderStorePO: job.orderStorePO,
              invoiceNumber: job.invoiceNumber,
              salesOrderNumber: job.salesOrderNumber,
              permitNumber: job.permitNumber,
              salesAssociate: job.salesAssociate,
              storeDistrict: job.storeDistrict,
              enterpriseGroupNumber: job.enterpriseGroupNumber,
            }} : {}),
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
        take: 500,
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
        take: 200,
      })

      if (needsEnrichment.length > 0) {
        console.log(`[AutoSync] Enriching ${needsEnrichment.length} records...`)

        // Enrich in parallel batches of 5 to avoid N+1 sequential calls.
        // Each getJobDetail is a separate API call with 10s timeout;
        // running them sequentially would take up to 200 * 10s = 33 min.
        const CONCURRENCY = 5
        const enrichOne = async (record: typeof needsEnrichment[number]): Promise<number> => {
          try {
            const detail = await cilio.getJobDetail(record.orderNumber)
            const di = (detail as any).dateInformation || {}
            const si = (detail as any).schedulingInformation || {}

            const sched = di.desiredInstallDate || si.scheduleDate || null
            const meas = di.currentDate || null
            const book = di.leadCreationDate || null

            const scheduledResources = si.scheduledResources?.trim() || null
            const taskResources = [si.taskOneResource, si.taskTwoResource, si.taskThreeResource]
              .filter(Boolean)
              .map((r: string) => r.trim())
              .join(', ') || null
            const scheduledUser = si.scheduledUserRenovatorName?.trim() || null
            const firmName = si.scheduledUserFirmName?.trim() || null
            const installerName = scheduledResources || taskResources || scheduledUser || firmName || null

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
              return 1
            }
            return 0
          } catch {
            return 0
          }
        }

        // Process in parallel batches
        for (let i = 0; i < needsEnrichment.length; i += CONCURRENCY) {
          const batch = needsEnrichment.slice(i, i + CONCURRENCY)
          const results = await Promise.all(batch.map(enrichOne))
          enriched += results.reduce((sum, r) => sum + r, 0)
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
  } finally {
    autoSyncRunning = false
  }
}
