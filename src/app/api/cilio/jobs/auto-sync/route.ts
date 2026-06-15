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
 * Fetches ALL Cilio jobs (parallel status-term searches) and upserts
 * each one into CilioJobRecord so the Reports archive stays current.
 */
export async function GET(request: NextRequest) {
  return runAutoSync(request)
}

export async function POST(request: NextRequest) {
  return runAutoSync(request)
}

async function runAutoSync(request: NextRequest) {
  const isGet = request.method === "GET"

  // Auth: GET (cron) uses bearer or query param, POST uses session
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

  const statusTerms = [
    "Scheduled", "Dispatched", "Tentative",
    "Completed", "Chargeback", "Canceled",
  ]

  console.log(`[AutoSync] Running ${statusTerms.length} parallel searches`)

  const results = await Promise.all(
    statusTerms.map(async (term) => {
      const jobs = await cilio.searchJobs(term).catch(() => [] as any[])
      console.log(`[AutoSync] Search "${term}" returned ${jobs.length} jobs`)
      return jobs
    })
  )

  const seen = new Set<number>()
  const allJobs: any[] = []
  for (const batch of results) {
    for (const job of batch) {
      if (!seen.has(job.orderNumber)) {
        seen.add(job.orderNumber)
        allJobs.push(job)
      }
    }
  }

  console.log(`[AutoSync] Total unique jobs fetched: ${allJobs.length}`)

  if (allJobs.length === 0) {
    return NextResponse.json({
      synced: 0,
      total: 0,
      message: "No jobs fetched from Cilio",
      durationMs: Date.now() - startTime,
    })
  }

  let synced = 0
  let skipped = 0

  for (const job of allJobs) {
    const statusDesc = job.orderStatusDescription || ""
    const isChargeback = statusDesc.toLowerCase().includes("chargeback") ||
      statusDesc.toLowerCase().includes("charge back")
    const jobType = isChargeback ? "chargeback" : "scheduled"

    try {
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
          scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
          measureDate: job.measureDate ? new Date(job.measureDate) : null,
          bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
          cilioPayload: job,
        },
      })
      synced++
    } catch {
      skipped++
    }
  }

  const durationMs = Date.now() - startTime
  console.log(`[AutoSync] Done: ${synced} upserted, ${skipped} skipped in ${durationMs}ms`)

  return NextResponse.json({
    synced,
    skipped,
    total: allJobs.length,
    message: `Synced ${synced} jobs (${skipped} skipped) in ${(durationMs / 1000).toFixed(1)}s`,
    durationMs,
  })
}
