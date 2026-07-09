import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import prisma from "@/lib/db"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"

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
  return fields.some((val) => typeof val === "string" && (/\btest\b/i.test(val) || /test[_\s]project/i.test(val)))
}

function strippedCilioPayload(job: any): Prisma.InputJsonObject {
  return {
    customerFirstName: job.customerFirstName ?? null,
    customerLastName: job.customerLastName ?? null,
    poAmount: job.poAmount ?? null,
    currentOrderStatusDate: job.currentOrderStatusDate ?? null,
    scopeOfWorkNotes: job.scopeOfWorkNotes ?? null,
    jobNumber: job.jobNumber ?? null,
    projectNumber: job.projectNumber ?? null,
    purchaserPO: job.purchaserPO ?? null,
    orderStorePO: job.orderStorePO ?? null,
    invoiceNumber: job.invoiceNumber ?? null,
    salesOrderNumber: job.salesOrderNumber ?? null,
    permitNumber: job.permitNumber ?? null,
    salesAssociate: job.salesAssociate ?? null,
    storeDistrict: job.storeDistrict ?? null,
    enterpriseGroupNumber: job.enterpriseGroupNumber ?? null,
  }
}

async function upsertRecentCilioJob(job: any) {
  if (!job?.orderNumber || isTestJob(job)) return false

  const statusDesc = job.orderStatusDescription || ""
  const isChargeback = statusDesc.toLowerCase().includes("chargeback") || statusDesc.toLowerCase().includes("charge back")
  const existing = await prisma.cilioJobRecord.findUnique({
    where: { orderNumber: job.orderNumber },
    select: { orderStatusDescription: true },
  })
  const statusChanged = existing && existing.orderStatusDescription !== (statusDesc || null)
  const payload = strippedCilioPayload(job)

  await prisma.cilioJobRecord.upsert({
    where: { orderNumber: job.orderNumber },
    create: {
      orderNumber: job.orderNumber,
      orderStatusDescription: statusDesc || null,
      jobType: isChargeback ? "chargeback" : "scheduled",
      storeNumber: job.storeNumber || null,
      storeName: job.storeName || null,
      laborCategoryDescription: job.laborCategoryDescription || null,
      workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
      scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
      measureDate: job.measureDate ? new Date(job.measureDate) : null,
      bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
      statusChangedAt: null,
      installerId: null,
      installerName: null,
      cilioPayload: payload,
    },
    update: {
      orderStatusDescription: statusDesc || null,
      jobType: isChargeback ? "chargeback" : "scheduled",
      storeNumber: job.storeNumber || null,
      storeName: job.storeName || null,
      laborCategoryDescription: job.laborCategoryDescription || null,
      workroom: getWorkroomByStoreNumber(job.storeNumber || "") || null,
      scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : undefined,
      measureDate: job.measureDate ? new Date(job.measureDate) : undefined,
      bookingDate: job.bookingDate ? new Date(job.bookingDate) : undefined,
      ...(statusChanged ? { statusChangedAt: new Date(), cilioPayload: payload } : {}),
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
        const jobs = await cilio.searchJobs({
          ...(mode === "modified"
            ? { orderModifiedDateStart: since.toISOString(), orderModifiedDateEnd: now.toISOString() }
            : { orderCreatedDateStart: since.toISOString(), orderCreatedDateEnd: now.toISOString() }),
          page,
          pageSize,
        })

        for (const job of jobs) {
          if (job?.orderNumber && !seen.has(job.orderNumber)) {
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
      data: { status: "error", message: error?.message || "Recent Cilio refresh failed" },
    }).catch(() => {})
    return { refreshed: false, reason: "error", message: error?.message || "Recent Cilio refresh failed" }
  }
}

/**
 * GET /api/cilio/jobs/saved
 * Paginated, server-side filtered Cilio job records.
 *
 * Query params:
 *   page       – default 1
 *   pageSize   – default 100
 *   search     – free-text (space-separated tokens, ALL must match)
 *   status     – exact match on orderStatusDescription
 *   labor      – exact match on laborCategoryDescription
 *   workroom   – exact match on workroom
 *   dateFrom   – YYYY-MM-DD
 *   dateTo     – YYYY-MM-DD
 *   chargeback – "1" to show only chargebacks
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

    const { searchParams } = request.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const pageSize = Math.min(500, Math.max(10, parseInt(searchParams.get('pageSize') || '100')))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const labor = searchParams.get('labor') || ''
    const workroom = searchParams.get('workroom') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const chargeback = searchParams.get('chargeback') === '1'

    const offset = (page - 1) * pageSize
    const recentRefresh = await refreshRecentCilioJobsIfNeeded()

    // ── Build dynamic WHERE conditions ──────────────────────────
    const conditions: string[] = []
    const params: any[] = []
    let paramIdx = 0

    const p = () => { paramIdx++; return `$${paramIdx}` }

    // Status filter
    if (status) {
      conditions.push(`"orderStatusDescription" = ${p()}`)
      params.push(status)
    }

    // Labor filter
    if (labor) {
      conditions.push(`"laborCategoryDescription" = ${p()}`)
      params.push(labor)
    }

    // Workroom filter
    if (workroom) {
      conditions.push(`"workroom" = ${p()}`)
      params.push(workroom)
    }

    // Chargeback filter
    if (chargeback) {
      conditions.push(`(
        LOWER(COALESCE("orderStatusDescription", '')) LIKE '%chargeback%'
        OR "jobType" = 'chargeback'
        OR LOWER(COALESCE("laborCategoryDescription", '')) LIKE '%chargeback%'
      )`)
    }

    // Date filter — uses the same resolution chain as frontend getDisplayDate
    if (dateFrom || dateTo) {
      const effectiveFrom = dateFrom || dateTo
      const effectiveTo = dateTo || dateFrom
      const dateCol = `COALESCE("scheduledInstallDate", "createdAt")`
      conditions.push(`${dateCol} >= ${p()}::date AND ${dateCol} <= ${p()}::date`)
      params.push(effectiveFrom)
      params.push(effectiveTo + 'T23:59:59')
    }

    // Search — multi-token AND match across all searchable fields
    if (search.trim()) {
      const tokens = search.trim().toLowerCase().split(/\s+/)
      // Build a concatenated haystack from all searchable fields
      const haystack = `
        LOWER(CONCAT_WS(' ',
          "orderNumber"::text,
          COALESCE("storeName", ''),
          COALESCE("storeNumber", ''),
          COALESCE("installerName", ''),
          COALESCE("laborCategoryDescription", ''),
          COALESCE("workroom", ''),
          COALESCE("cilioPayload"->>'customerFirstName', ''),
          COALESCE("cilioPayload"->>'customerLastName', ''),
          COALESCE("cilioPayload"->>'customerFirstLast', ''),
          COALESCE("cilioPayload"->'customerInformation'->>'customerName', ''),
          COALESCE("cilioPayload"->'customerInformation'->>'customerFullName', ''),
          COALESCE("cilioPayload"->>'jobNumber', ''),
          COALESCE("cilioPayload"->>'projectNumber', ''),
          COALESCE("cilioPayload"->>'purchaserPO', ''),
          COALESCE("cilioPayload"->>'orderStorePO', ''),
          COALESCE("cilioPayload"->>'invoiceNumber', ''),
          COALESCE("cilioPayload"->>'salesOrderNumber', ''),
          COALESCE("cilioPayload"->>'permitNumber', ''),
          COALESCE("cilioPayload"->>'salesAssociate', ''),
          COALESCE("cilioPayload"->>'storeDistrict', ''),
          COALESCE("cilioPayload"->>'enterpriseGroupNumber', ''),
          COALESCE("cilioPayload"->>'scopeOfWorkNotes', '')
        ))`
      // Each token must be found somewhere in the haystack
      for (const token of tokens) {
        conditions.push(`${haystack} LIKE ${p()}`)
        params.push(`%${token}%`)
      }
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : ''

    // ── Run count + data + filter options in parallel ─────────────
    const countSql = `SELECT COUNT(*)::int as total FROM "CilioJobRecord" ${whereClause}`

    const dataSql = `
      SELECT
        id, "orderNumber", "orderStatusDescription", "jobType",
        "storeNumber", "storeName", "laborCategoryDescription",
        "workroom", "scheduledInstallDate", "measureDate",
        "bookingDate", "statusChangedAt", "installerId",
        "installerName", "createdAt", "updatedAt",
        "cilioPayload"->>'customerFirstName' as "cilioCustomerFirstName",
        "cilioPayload"->>'customerLastName' as "cilioCustomerLastName",
        "cilioPayload"->>'poAmount' as "cilioPoAmount",
        "cilioPayload"->>'currentOrderStatusDate' as "cilioCurrentOrderStatusDate",
        "cilioPayload"->'dateInformation'->>'desiredInstallDate' as "cilioDesiredInstallDate",
        "cilioPayload"->'dateInformation'->>'currentDate' as "cilioDateInfoCurrentDate",
        "cilioPayload"->'dateInformation'->>'leadCreationDate' as "cilioLeadCreationDate",
        "cilioPayload"->'schedulingInformation'->>'scheduleDate' as "cilioScheduleDate"
      FROM "CilioJobRecord"
      ${whereClause}
      ORDER BY "orderNumber" DESC
      LIMIT ${p()} OFFSET ${p()}
    `
    params.push(pageSize, offset)

    const filterSql = `
      SELECT
        (SELECT json_agg(DISTINCT d.status) FROM (SELECT "orderStatusDescription" as status FROM "CilioJobRecord" WHERE "orderStatusDescription" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 5000) d) as statuses,
        (SELECT json_agg(DISTINCT d.labor) FROM (SELECT "laborCategoryDescription" as labor FROM "CilioJobRecord" WHERE "laborCategoryDescription" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 5000) d) as labor_categories,
        (SELECT json_agg(DISTINCT d.wr) FROM (SELECT "workroom" as wr FROM "CilioJobRecord" WHERE "workroom" IS NOT NULL ORDER BY "createdAt" DESC LIMIT 5000) d) as workrooms
    `

    const [countResult, rows, filterResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ total: number }>>(countSql, ...params.slice(0, params.length - 2)),
      prisma.$queryRawUnsafe<Array<{
        id: string; orderNumber: number; orderStatusDescription: string | null;
        jobType: string; storeNumber: string | null; storeName: string | null;
        laborCategoryDescription: string | null; workroom: string | null;
        scheduledInstallDate: Date | null; measureDate: Date | null;
        bookingDate: Date | null; statusChangedAt: Date | null;
        installerId: string | null; installerName: string | null;
        createdAt: Date; updatedAt: Date;
        cilioCustomerFirstName: string | null;
        cilioCustomerLastName: string | null;
        cilioPoAmount: string | null;
        cilioCurrentOrderStatusDate: string | null;
        cilioDesiredInstallDate: string | null;
        cilioDateInfoCurrentDate: string | null;
        cilioLeadCreationDate: string | null;
        cilioScheduleDate: string | null;
      }>>(dataSql, ...params),
      prisma.$queryRawUnsafe<Array<{ statuses: any; labor_categories: any; workrooms: any }>>(filterSql),
    ])

    const total = countResult[0]?.total || 0
    const totalPages = Math.ceil(total / pageSize)

    // Convert rows to frontend format with ISO strings
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
      cilioFields: {
        customerFirstName: r.cilioCustomerFirstName,
        customerLastName: r.cilioCustomerLastName,
        poAmount: r.cilioPoAmount != null ? Number(r.cilioPoAmount) : null,
        currentOrderStatusDate: r.cilioCurrentOrderStatusDate,
        dateInformation: {
          desiredInstallDate: r.cilioDesiredInstallDate,
          currentDate: r.cilioDateInfoCurrentDate,
          leadCreationDate: r.cilioLeadCreationDate,
        },
        schedulingInformation: {
          scheduleDate: r.cilioScheduleDate,
        },
      },
    }))

    // Resolve installerId by name for records without one
    const needsLookup = records.filter(r => !r.installerId && r.installerName)
    if (needsLookup.length > 0) {
      const installerNames = Array.from(new Set(needsLookup.map(r => r.installerName!.trim())))
      const dbInstallers = await prisma.installer.findMany({
        where: { status: { not: 'rejected' } },
        select: { id: true, firstName: true, lastName: true },
        take: 500,
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

    const f = filterResult[0] || {}

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
      totalPages,
      filterOptions: {
        statuses: (Array.isArray(f.statuses) ? f.statuses : []).sort(),
        laborCategories: (Array.isArray(f.labor_categories) ? f.labor_categories : []).sort(),
        workrooms: (Array.isArray(f.workrooms) ? f.workrooms : []).sort(),
      },
      recentRefresh,
    })
  } catch (error: any) {
    console.error("Fetch saved jobs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch saved jobs", details: error.message },
      { status: 500 }
    )
  }
}
