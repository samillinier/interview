import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"
import { requireCilioAccess } from "@/lib/cilioAccess"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const RECENT_REFRESH_KEY = "cilio-dashboard-recent-refresh"
const RECENT_REFRESH_TTL_MS = 5 * 60 * 1000
const RECENT_REFRESH_RUNNING_TIMEOUT_MS = 2 * 60 * 1000
const RECENT_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000
const RECENT_REFRESH_MAX_CATCHUP_MS = 7 * 24 * 60 * 60 * 1000

function isTestJob(job: any): boolean {
  const fields = [
    job.customerLastName,
    job.customerFirstName,
    job.customerEmail,
    job.poJobNumber,
    job.storeName,
    job.scopeOfWorkNotes,
  ]
  return fields.some((value) => typeof value === "string" && /\btest\b|test[_\s]project/i.test(value))
}

function strippedCilioPayload(job: any): Prisma.InputJsonObject {
  const payload: Record<string, Prisma.InputJsonValue | null> = {}
  const keys = [
    "customerFirstName",
    "customerLastName",
    "poAmount",
    "currentOrderStatusDate",
    "scopeOfWorkNotes",
    "jobNumber",
    "projectNumber",
    "purchaserPO",
    "orderStorePO",
    "invoiceNumber",
    "salesOrderNumber",
    "permitNumber",
    "salesAssociate",
    "storeDistrict",
    "enterpriseGroupNumber",
  ]
  for (const key of keys) {
    if (job[key] !== undefined) payload[key] = job[key]
  }
  if (job.customerFirstLast) payload.customerFirstLast = job.customerFirstLast
  return payload as Prisma.InputJsonObject
}

async function upsertRecentCilioJob(job: any) {
  if (!job?.orderNumber || isTestJob(job)) return false

  const statusDesc = job.orderStatusDescription || null
  const existing = await prisma.cilioJobRecord.findUnique({
    where: { orderNumber: job.orderNumber },
    select: { orderStatusDescription: true },
  })
  const statusChanged = existing && existing.orderStatusDescription !== statusDesc
  const isChargeback = String(statusDesc || "").toLowerCase().includes("chargeback") ||
    String(statusDesc || "").toLowerCase().includes("charge back")

  const data = {
    orderStatusDescription: statusDesc,
    jobType: isChargeback ? "chargeback" : "scheduled",
    storeNumber: job.storeNumber || null,
    storeName: job.storeName || null,
    laborCategoryDescription: job.laborCategoryDescription || null,
    workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
    scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
    measureDate: job.measureDate ? new Date(job.measureDate) : null,
    bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
    ...(statusChanged ? { statusChangedAt: new Date() } : {}),
  }

  const payload = strippedCilioPayload(job)
  await prisma.cilioJobRecord.upsert({
    where: { orderNumber: job.orderNumber },
    create: {
      ...data,
      orderNumber: job.orderNumber,
      installerId: null,
      installerName: null,
      cilioPayload: payload,
    },
    update: {
      ...data,
      ...(statusChanged ? { cilioPayload: payload } : {}),
    },
  })

  return true
}

async function refreshRecentCilioJobsIfNeeded() {
  const now = new Date()
  const state = await prisma.cilioSyncState.findUnique({ where: { key: RECENT_REFRESH_KEY } })

  if (state?.lastCompletedAt && now.getTime() - state.lastCompletedAt.getTime() < RECENT_REFRESH_TTL_MS) {
    return { refreshed: false, reason: "cooldown", lastCompletedAt: state.lastCompletedAt }
  }

  if (
    state?.status === "running" &&
    state.lastStartedAt &&
    now.getTime() - state.lastStartedAt.getTime() < RECENT_REFRESH_RUNNING_TIMEOUT_MS
  ) {
    return { refreshed: false, reason: "already-running", lastStartedAt: state.lastStartedAt }
  }

  await prisma.cilioSyncState.upsert({
    where: { key: RECENT_REFRESH_KEY },
    create: { key: RECENT_REFRESH_KEY, lastStartedAt: now, status: "running", message: "Refreshing recent Cilio jobs" },
    update: { lastStartedAt: now, status: "running", message: "Refreshing recent Cilio jobs" },
  })

  try {
    const latestSaved = await prisma.cilioJobRecord.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    })
    const defaultSince = new Date(now.getTime() - RECENT_REFRESH_WINDOW_MS)
    const catchupSince = latestSaved?.updatedAt
      ? new Date(Math.max(latestSaved.updatedAt.getTime() - RECENT_REFRESH_WINDOW_MS, now.getTime() - RECENT_REFRESH_MAX_CATCHUP_MS))
      : new Date(now.getTime() - RECENT_REFRESH_MAX_CATCHUP_MS)
    const since = state?.lastCompletedAt ? defaultSince : catchupSince
    const pageSize = 500
    const maxPages = 10
    let synced = 0
    const seen = new Set<number>()

    const fetchWindow = async (mode: "modified" | "created") => {
      let page = 1
      while (page <= maxPages) {
        const result: any = await cilio.searchJobs({
          ...(mode === "modified"
            ? {
                orderModifiedDateStart: since.toISOString(),
                orderModifiedDateEnd: now.toISOString(),
              }
            : {
                orderCreatedDateStart: since.toISOString(),
                orderCreatedDateEnd: now.toISOString(),
              }),
          page,
          pageSize,
        })

        const jobs = Array.isArray(result) ? result : Array.isArray(result?.results) ? result.results : []
        for (const job of jobs) {
          if (!seen.has(job.orderNumber)) {
            seen.add(job.orderNumber)
            if (await upsertRecentCilioJob(job)) synced++
          }
        }

        if (jobs.length < pageSize) break
        page++
      }
    }

    await fetchWindow("modified")
    await fetchWindow("created")

    await prisma.cilioSyncState.update({
      where: { key: RECENT_REFRESH_KEY },
      data: {
        lastCompletedAt: new Date(),
        status: "completed",
        message: `Synced ${synced} recent Cilio jobs since ${since.toISOString()}`,
      },
    })

    return { refreshed: true, synced, since }
  } catch (error: any) {
    await prisma.cilioSyncState.update({
      where: { key: RECENT_REFRESH_KEY },
      data: {
        status: "error",
        message: error?.message || "Recent Cilio refresh failed",
      },
    }).catch(() => {})
    return { refreshed: false, reason: "error", message: error?.message || "Recent Cilio refresh failed" }
  }
}

/**
 * GET /api/cilio/jobs
 * Query params: ?search= &status= &laborCategory= &workroom=
 * Runs multiple parallel searches using active installer names plus
 * category terms to bypass the 50-job Cilio limit.
 * Returns { allJobs, jobs, count, searchStats }
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireCilioAccess(request)
    if (!access.ok) return access.response

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get("search") || ""
    const statusFilter = searchParams.get("status") || ""
    const laborCategoryFilter = searchParams.get("laborCategory") || ""
    const workroomFilter = searchParams.get("workroom") || ""
    const live = searchParams.get("live") === "1"

    const userTerm = searchTerm.trim()

    if (!live) {
      const recentRefresh = await refreshRecentCilioJobsIfNeeded()
      const records = await prisma.cilioJobRecord.findMany({
        orderBy: { orderNumber: "desc" },
        take: 5000,
        select: {
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
          installerId: true,
          installerName: true,
          cilioPayload: true,
        },
      })

      const allJobs = records.map((record) => {
        const payload = (record.cilioPayload || {}) as any
        const customerName =
          payload.customerFirstLast ||
          payload.customerInformation?.customerFullName ||
          payload.customerInformation?.customerName ||
          [payload.customerFirstName, payload.customerLastName].filter(Boolean).join(" ")
        const [fallbackFirst, ...fallbackRest] = String(customerName || "").trim().split(/\s+/)

        return {
          orderNumber: record.orderNumber,
          orderStatusDescription: record.orderStatusDescription,
          jobType: record.jobType,
          storeNumber: record.storeNumber || "",
          storeName: record.storeName || "",
          customerFirstName: payload.customerFirstName || fallbackFirst || "",
          customerLastName: payload.customerLastName || fallbackRest.join(" ") || "",
          customerFirstLast: customerName || "",
          currentOrderStatusDate: payload.currentOrderStatusDate || null,
          poAmount: payload.poAmount != null ? Number(payload.poAmount) : 0,
          salesOrderNumber: payload.salesOrderNumber || null,
          invoiceNumber: payload.invoiceNumber || null,
          invoiceComment: null,
          laborCategoryDescription: record.laborCategoryDescription,
          laborCategoryId: null,
          laborAmount: null,
          leadSafeJob: null,
          sitePreBuiltInfo: null,
          paidInFull: null,
          paymentsRemainingDue: null,
          paymentsTotalPaid: null,
          paymentsPendingAmount: null,
          permitNumber: payload.permitNumber || null,
          hasJobAttachments: "",
          attachmentCount: "",
          taxAmount: null,
          productAmount: null,
          siteDetailsDistanceToSeller: 0,
          estTimeToComplete: null,
          purchaserPO: payload.purchaserPO || null,
          yearBuilt: null,
          scheduledUserLeadCertificationNumber: null,
          scopeOfWorkNotes: payload.scopeOfWorkNotes || null,
          projectNumber: payload.projectNumber || null,
          jobNumber: payload.jobNumber || null,
          salesAssociate: payload.salesAssociate || null,
          storeDistrict: payload.storeDistrict || null,
          enterpriseGroupNumber: payload.enterpriseGroupNumber || null,
          scheduledInstallDate: record.scheduledInstallDate?.toISOString() || null,
          measureDate: record.measureDate?.toISOString() || null,
          bookingDate: record.bookingDate?.toISOString() || null,
          workroomByStore: record.workroom || getWorkroomByStoreNumber(record.storeNumber || "") || null,
          _installer: record.installerId
            ? { id: record.installerId, name: record.installerName || "" }
            : null,
        }
      })

      let filtered = allJobs
      if (statusFilter) {
        const lower = statusFilter.toLowerCase()
        filtered = filtered.filter((j: any) => j.orderStatusDescription?.toLowerCase().includes(lower))
      }
      if (laborCategoryFilter) {
        const lower = laborCategoryFilter.toLowerCase()
        filtered = filtered.filter((j: any) => j.laborCategoryDescription?.toLowerCase().includes(lower))
      }
      if (workroomFilter) {
        filtered = filtered.filter((j: any) => j.workroomByStore === workroomFilter)
      }
      if (userTerm) {
        const lower = userTerm.toLowerCase()
        filtered = filtered.filter((j: any) => {
          const searchable = [
            j.customerFirstName, j.customerLastName, j.customerFirstLast,
            j.storeName, j.storeNumber, j.projectNumber, j.jobNumber,
            j.orderNumber?.toString(), j.scopeOfWorkNotes, j.salesOrderNumber,
            j.invoiceNumber, j.purchaserPO, j.salesAssociate,
            j.orderStatusDescription, j.laborCategoryDescription, j._installer?.name,
          ].filter(Boolean).join(" ").toLowerCase()
          return searchable.includes(lower)
        })
      }

      return NextResponse.json({
        allJobs,
        jobs: filtered,
        count: filtered.length,
        totalFetched: allJobs.length,
        searchesRan: 0,
        source: "saved",
        recentRefresh,
      })
    }

    // If user typed a search term, try POJobNumber search first.
    // If no term, fetch ALL jobs using pagination with proper ordering.
    let allJobs: any[] = []
    if (userTerm) {
      allJobs = await cilio.searchJobs({ poJobNumber: userTerm }).catch(() => [] as any[])
    } else {
      allJobs = await cilio.searchAllJobs({
        monthsBack: 3,
        pageSize: 500,
        onProgress: (count, detail) => console.log(`[Cilio API] searchAllJobs: ${count} jobs (${detail})`),
      }).catch(() => [] as any[])
    }
    // Sort by orderNumber descending (newest first)
    allJobs.sort((a: any, b: any) => b.orderNumber - a.orderNumber)
    console.log(`[Cilio API] Returning ${allJobs.length} jobs (sorted by orderNumber DESC)`)

    let filtered = allJobs
    if (statusFilter) {
      const lower = statusFilter.toLowerCase()
      filtered = filtered.filter((j: any) => j.orderStatusDescription?.toLowerCase().includes(lower))
    }
    if (laborCategoryFilter) {
      const lower = laborCategoryFilter.toLowerCase()
      filtered = filtered.filter((j: any) => j.laborCategoryDescription?.toLowerCase().includes(lower))
    }
    if (workroomFilter) {
      filtered = filtered.filter((j: any) => getWorkroomByStoreNumber(j.storeNumber) === workroomFilter)
    }

    // Client-side search filter — search across multiple job fields
    if (userTerm) {
      const lower = userTerm.toLowerCase()
      filtered = filtered.filter((j: any) => {
        const searchable = [
          j.customerFirstName, j.customerLastName,
          j.storeName, j.storeNumber,
          j.projectNumber, j.jobNumber, j.orderNumber?.toString(),
          j.scopeOfWorkNotes, j.deliveryInfoSchedulingNotes,
          j.salesAssociate, j.orderStatusDescription,
          j.laborCategoryDescription,
        ].filter(Boolean).join(' ').toLowerCase()
        return searchable.includes(lower)
      })
    }

    // Look up installer names from synced CilioJobRecord table
    const orderNumbers = filtered.map((j: any) => j.orderNumber)
    const installerMap: Record<number, { id: string; name: string } | null> = {}
    if (orderNumbers.length > 0) {
      const records = await prisma.cilioJobRecord.findMany({
        where: { orderNumber: { in: orderNumbers } },
        select: { orderNumber: true, installerId: true, installerName: true },
      })
      for (const r of records) {
        installerMap[r.orderNumber] = r.installerId ? { id: r.installerId, name: r.installerName || '' } : null
      }
    }

    // Also enrich allJobs with installer info for frontend consistency
    const allOrderNumbers = allJobs.map((j: any) => j.orderNumber)
    const allInstallerMap: Record<number, { id: string; name: string } | null> = {}
    if (allOrderNumbers.length > 0) {
      const allRecords = await prisma.cilioJobRecord.findMany({
        where: { orderNumber: { in: allOrderNumbers } },
        select: { orderNumber: true, installerId: true, installerName: true },
      })
      for (const r of allRecords) {
        allInstallerMap[r.orderNumber] = r.installerId ? { id: r.installerId, name: r.installerName || '' } : null
      }
    }

    return NextResponse.json({
      allJobs: allJobs.map((j: any) => ({ ...j, _installer: allInstallerMap[j.orderNumber] || null })),
      jobs: filtered.map((j: any) => ({ ...j, _installer: installerMap[j.orderNumber] || null })),
      count: filtered.length,
      totalFetched: allJobs.length,
      searchesRan: 1,
    })
  } catch (error: any) {
    console.error("Cilio jobs search error:", error)
    return NextResponse.json(
      { error: "Failed to search Cilio jobs", details: error.message },
      { status: 500 }
    )
  }
}
