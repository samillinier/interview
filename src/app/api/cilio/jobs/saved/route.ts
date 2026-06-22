import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

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
      const dateCol = `COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")`
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
        "cilioPayload"
      FROM "CilioJobRecord"
      ${whereClause}
      ORDER BY "orderNumber" DESC
      LIMIT ${p()} OFFSET ${p()}
    `
    params.push(pageSize, offset)

    const filterSql = `
      SELECT
        (SELECT json_agg(DISTINCT "orderStatusDescription") FILTER (WHERE "orderStatusDescription" IS NOT NULL) FROM "CilioJobRecord") as statuses,
        (SELECT json_agg(DISTINCT "laborCategoryDescription") FILTER (WHERE "laborCategoryDescription" IS NOT NULL) FROM "CilioJobRecord") as labor_categories,
        (SELECT json_agg(DISTINCT "workroom") FILTER (WHERE "workroom" IS NOT NULL) FROM "CilioJobRecord") as workrooms
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
        cilioPayload: any;
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
      cilioPayload: r.cilioPayload,
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
    })
  } catch (error: any) {
    console.error("Fetch saved jobs error:", error)
    return NextResponse.json(
      { error: "Failed to fetch saved jobs", details: error.message },
      { status: 500 }
    )
  }
}
