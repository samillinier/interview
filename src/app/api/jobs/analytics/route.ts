import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function GET(request: NextRequest) {
  try {
    const now = new Date()

    // ── All DB queries in parallel ──────────────────────────────
    const [
      totalResult,
      typeRows,
      statusRows,
      laborRows,
      workroomRows,
      poAgg,
      chargebackCount,
      withInstallerCount,
      installerRows,
      storeRows,
      weeklyThis,
      weeklyPrev,
      monthlyTrendRows,
      dailyTrendRows,
      lastMonthSalesRows,
      twoMonthSalesRows,
      monthlyPORows,
      completionAgg,
      completionByWorkroomRows,
      scheduledDateRows,
      workroomListRows,
      pipelineRows,
      measureRows,
      installRows,
    ] = await Promise.all([
      // Total jobs
      prisma.cilioJobRecord.count(),

      // Type distribution
      prisma.$queryRawUnsafe<Array<{ type: string; count: string }>>(
        `SELECT COALESCE("jobType", 'unknown') as type, COUNT(*)::text as count FROM "CilioJobRecord" GROUP BY 1 ORDER BY 2 DESC`
      ),

      // Status distribution
      prisma.$queryRawUnsafe<Array<{ status: string; count: string }>>(
        `SELECT COALESCE("orderStatusDescription", 'Unknown') as status, COUNT(*)::text as count FROM "CilioJobRecord" GROUP BY 1 ORDER BY 2 DESC`
      ),

      // Labor category distribution
      prisma.$queryRawUnsafe<Array<{ category: string; count: string }>>(
        `SELECT COALESCE("laborCategoryDescription", 'Unspecified') as category, COUNT(*)::text as count FROM "CilioJobRecord" GROUP BY 1 ORDER BY 2 DESC`
      ),

      // Workroom distribution
      prisma.$queryRawUnsafe<Array<{ workroom: string; count: string }>>(
        `SELECT COALESCE("workroom", 'Unassigned') as workroom, COUNT(*)::text as count FROM "CilioJobRecord" GROUP BY 1 ORDER BY 2 DESC`
      ),

      // PO amount aggregate
      prisma.$queryRawUnsafe<Array<{ total_po: string; po_count: string; min_po: string; max_po: string }>>(
        `SELECT COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0)::text as total_po, COUNT(*)::text as po_count, COALESCE(MIN(("cilioPayload"->>'poAmount')::numeric), 0)::text as min_po, COALESCE(MAX(("cilioPayload"->>'poAmount')::numeric), 0)::text as max_po FROM "CilioJobRecord" WHERE "cilioPayload"->>'poAmount' IS NOT NULL`
      ),

      // Chargeback count
      prisma.cilioJobRecord.count({
        where: {
          OR: [
            { orderStatusDescription: { contains: 'chargeback', mode: 'insensitive' } },
            { jobType: 'chargeback' },
            { laborCategoryDescription: { contains: 'chargeback', mode: 'insensitive' } },
          ],
        },
      }),

      // With installer
      prisma.cilioJobRecord.count({ where: { installerId: { not: null } } }),

      // Top installers
      prisma.$queryRawUnsafe<Array<{ name: string; count: string }>>(
        `SELECT COALESCE("installerName", 'Unassigned') as name, COUNT(*)::text as count FROM "CilioJobRecord" WHERE "installerName" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
      ),

      // Top stores
      prisma.$queryRawUnsafe<Array<{ name: string; count: string }>>(
        `SELECT COALESCE("storeName", "storeNumber", 'unknown') as name, COUNT(*)::text as count FROM "CilioJobRecord" GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
      ),

      // Weekly revenue/jobs — this week (last 7 days)
      prisma.$queryRawUnsafe<Array<{ revenue: string; jobs: string; revenue_count: string }>>(
        `SELECT COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0)::text as revenue, COUNT(*)::text as jobs, COUNT(("cilioPayload"->>'poAmount')::numeric)::text as revenue_count FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date`,
        (() => { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d; })()
      ),

      // Weekly revenue/jobs — previous week
      prisma.$queryRawUnsafe<Array<{ revenue: string; jobs: string }>>(
        `SELECT COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0)::text as revenue, COUNT(*)::text as jobs FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date AND (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) < $2::date`,
        (() => { const d = new Date(now); d.setDate(d.getDate() - 14); d.setHours(0,0,0,0); return d; })(),
        (() => { const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d; })()
      ),

      // Monthly trend (last 12 months)
      prisma.$queryRawUnsafe<Array<{ month: string; count: string }>>(
        `SELECT to_char(date_trunc('month', (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt"))), 'YYYY-MM') as month, COUNT(*)::text as count FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date GROUP BY 1 ORDER BY 1`,
        new Date(now.getFullYear(), now.getMonth() - 11, 1)
      ),

      // Daily trend (last 30 days)
      prisma.$queryRawUnsafe<Array<{ date: string; count: string }>>(
        `SELECT to_char((COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt"))::date, 'YYYY-MM-DD') as date, COUNT(*)::text as count FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date GROUP BY 1 ORDER BY 1`,
        (() => { const d = new Date(now); d.setDate(d.getDate() - 30); return d; })()
      ),

      // Last month store sales
      prisma.$queryRawUnsafe<Array<{ name: string; total: string; count: string }>>(
        `SELECT COALESCE("storeName", "storeNumber", 'unknown') as name, COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0)::text as total, COUNT(*)::text as count FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date AND (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) <= $2::date AND "cilioPayload"->>'poAmount' IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        new Date(now.getFullYear(), now.getMonth() - 1, 1),
        new Date(now.getFullYear(), now.getMonth(), 0)
      ),

      // Two months ago total
      prisma.$queryRawUnsafe<Array<{ total: string }>>(
        `SELECT COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0)::text as total FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date AND (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) <= $2::date AND "cilioPayload"->>'poAmount' IS NOT NULL`,
        new Date(now.getFullYear(), now.getMonth() - 2, 1),
        new Date(now.getFullYear(), now.getMonth() - 1, 0)
      ),

      // Monthly PO totals
      prisma.$queryRawUnsafe<Array<{ month: string; total: string }>>(
        `SELECT to_char(date_trunc('month', (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt"))), 'YYYY-MM') as month, COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0) as total FROM "CilioJobRecord" WHERE (COALESCE("scheduledInstallDate", ("cilioPayload"->>'currentOrderStatusDate')::timestamptz, "createdAt")) >= $1::date AND "cilioPayload"->>'poAmount' IS NOT NULL GROUP BY 1 ORDER BY 1`,
        new Date(now.getFullYear(), now.getMonth() - 11, 1)
      ),

      // Completion breakdown
      prisma.$queryRawUnsafe<Array<{ status: string; count: string }>>(
        `SELECT "orderStatusDescription" as status, COUNT(*)::text as count FROM "CilioJobRecord" WHERE "orderStatusDescription" IS NOT NULL GROUP BY 1`
      ),

      // Completion by workroom
      prisma.$queryRawUnsafe<Array<{ workroom: string; status: string; count: string }>>(
        `SELECT COALESCE("workroom", 'Unassigned') as workroom, "orderStatusDescription" as status, COUNT(*)::text as count FROM "CilioJobRecord" WHERE "orderStatusDescription" IS NOT NULL GROUP BY 1, 2`
      ),

      // Scheduled install dates
      prisma.$queryRawUnsafe<Array<{ date: string; workroom: string; labor: string; count: string }>>(
        `SELECT to_char("scheduledInstallDate"::date, 'YYYY-MM-DD') as date, COALESCE("workroom", 'Unassigned') as workroom, COALESCE("laborCategoryDescription", 'Unspecified') as labor, COUNT(*)::text as count FROM "CilioJobRecord" WHERE "scheduledInstallDate" IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 1`
      ),

      // Workroom list
      prisma.$queryRawUnsafe<Array<{ workroom: string }>>(
        `SELECT DISTINCT COALESCE("workroom", 'Unassigned') as workroom FROM "CilioJobRecord" WHERE "workroom" IS NOT NULL`
      ),

      // Pipeline (active jobs by labor category)
      prisma.$queryRawUnsafe<Array<{ category: string; count: string; revenue: string }>>(
        `SELECT COALESCE("laborCategoryDescription", 'Unspecified') as category, COUNT(*)::text as count, COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0) as revenue FROM "CilioJobRecord" WHERE LOWER(COALESCE("orderStatusDescription", '')) ~ '(scheduled|dispatched|progress|tentative)' AND "laborCategoryDescription" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
      ),

      // Measure jobs
      prisma.$queryRawUnsafe<Array<{ last_name: string; store_number: string; order_number: string }>>(
        `SELECT LOWER(TRIM(COALESCE("cilioPayload"->>'customerLastName', ''))) as last_name, COALESCE("storeNumber", '') as store_number, "orderNumber"::text as order_number FROM "CilioJobRecord" WHERE LOWER(COALESCE("laborCategoryDescription", '')) LIKE '%measure%' AND "cilioPayload"->>'customerLastName' IS NOT NULL AND TRIM(COALESCE("cilioPayload"->>'customerLastName', '')) != ''`
      ),

      // Install jobs (for measure conversion)
      prisma.$queryRawUnsafe<Array<{ last_name: string; store_number: string; order_number: string }>>(
        `SELECT LOWER(TRIM(COALESCE("cilioPayload"->>'customerLastName', ''))) as last_name, COALESCE("storeNumber", '') as store_number, "orderNumber"::text as order_number FROM "CilioJobRecord" WHERE LOWER(COALESCE("laborCategoryDescription", '')) NOT LIKE '%measure%' AND LOWER(COALESCE("laborCategoryDescription", '')) NOT LIKE '%chargeback%' AND LOWER(COALESCE("laborCategoryDescription", '')) NOT LIKE '%payment%' AND LOWER(COALESCE("laborCategoryDescription", '')) NOT LIKE '%rapid%' AND "cilioPayload"->>'customerLastName' IS NOT NULL AND TRIM(COALESCE("cilioPayload"->>'customerLastName', '')) != ''`
      ),
    ])

    // ── Build response from query results ─────────────────────────

    const totalJobs = totalResult

    const chargebacks = chargebackCount
    const chargebackRate = totalJobs > 0 ? (chargebacks / totalJobs * 100).toFixed(1) : '0.0'
    const withInstaller = withInstallerCount
    const withoutInstaller = totalJobs - withInstaller

    const typeDistribution = typeRows.map(r => ({ type: r.type, count: parseInt(r.count) }))
    const statusDistribution = statusRows.map(r => ({ status: r.status, count: parseInt(r.count) }))
    const laborDistribution = laborRows.map(r => ({ category: r.category, count: parseInt(r.count) }))
    const workroomDistribution = workroomRows.map(r => ({ workroom: r.workroom, count: parseInt(r.count) }))

    const poAmount = {
      total: parseFloat(poAgg[0]?.total_po || '0'),
      average: poAgg[0]?.po_count && parseInt(poAgg[0].po_count) > 0
        ? Math.round(parseFloat(poAgg[0].total_po) / parseInt(poAgg[0].po_count) * 100) / 100
        : 0,
      min: parseFloat(poAgg[0]?.min_po || '0'),
      max: parseFloat(poAgg[0]?.max_po || '0'),
      count: parseInt(poAgg[0]?.po_count || '0'),
    }

    const topInstallers = installerRows.map(r => ({ name: r.name, count: parseInt(r.count) }))
    const topStores = storeRows.map(r => ({ name: r.name, count: parseInt(r.count) }))

    // Weekly revenue/jobs
    const weeklyRevenue = parseFloat(weeklyThis[0]?.revenue || '0')
    const weeklyRevenueCount = parseInt(weeklyThis[0]?.revenue_count || '0')
    const weeklyJobs = parseInt(weeklyThis[0]?.jobs || '0')
    const prevWeekRevenue = parseFloat(weeklyPrev[0]?.revenue || '0')
    const prevWeekJobs = parseInt(weeklyPrev[0]?.jobs || '0')

    const weeklyAvgRevenue = weeklyRevenueCount > 0 ? Math.round(weeklyRevenue / weeklyRevenueCount) : 0
    const weeklyRevenueTrend = prevWeekRevenue > 0 ? Math.round(((weeklyRevenue - prevWeekRevenue) / prevWeekRevenue) * 100) : 0
    const weeklyJobsTrend = prevWeekJobs > 0 ? Math.round(((weeklyJobs - prevWeekJobs) / prevWeekJobs) * 100) : 0

    // Last month sales
    const prevMonthLabel = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })
    const lastMonthSales = lastMonthSalesRows.map(r => ({ name: r.name, total: parseFloat(r.total), count: parseInt(r.count) }))
    const lastMonthTotal = lastMonthSales.reduce((sum, s) => sum + s.total, 0)
    const previousMonthTotal = parseFloat(twoMonthSalesRows[0]?.total || '0')
    const salesTrend = previousMonthTotal > 0 ? Math.round(((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100) : 0

    // Monthly trend
    const monthlyPO: Record<string, number> = {}
    monthlyPORows.forEach(r => { monthlyPO[r.month] = parseFloat(r.total) })

    const monthlyCounts: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyCounts[key] = 0
    }
    monthlyTrendRows.forEach(r => { monthlyCounts[r.month] = parseInt(r.count) })

    const monthlyTrend = Object.entries(monthlyCounts).map(([month, count]) => ({
      month,
      count,
      poTotal: monthlyPO[month] || 0,
    }))

    // Daily trend
    const dailyCounts: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      dailyCounts[d.toISOString().split('T')[0]] = 0
    }
    dailyTrendRows.forEach(r => { dailyCounts[r.date] = parseInt(r.count) })
    const dailyTrend = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }))

    // Weekly distribution
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dowCounts: Record<string, number> = {}
    dayNames.forEach(d => { dowCounts[d] = 0 })
    // Use daily trend data aggregated by day-of-week via DB
    dailyTrend.forEach(d => {
      const date = new Date(d.date + 'T12:00:00Z')
      const day = dayNames[date.getDay()]
      dowCounts[day] += d.count
    })
    const weeklyDistribution = dayNames.map(day => ({ day, count: dowCounts[day] || 0 }))

    // Scheduled install dates
    const scheduledDates: Record<string, { total: number; byWorkroom: Record<string, number>; byLaborCategory: Record<string, number> }> = {}
    const allWorkrooms = new Set(workroomListRows.map(r => r.workroom))
    let scheduledCount = 0
    scheduledDateRows.forEach(r => {
      if (!scheduledDates[r.date]) scheduledDates[r.date] = { total: 0, byWorkroom: {}, byLaborCategory: {} }
      const c = parseInt(r.count)
      scheduledDates[r.date].total += c
      scheduledDates[r.date].byWorkroom[r.workroom] = (scheduledDates[r.date].byWorkroom[r.workroom] || 0) + c
      scheduledDates[r.date].byLaborCategory[r.labor] = (scheduledDates[r.date].byLaborCategory[r.labor] || 0) + c
      scheduledCount += c
    })
    const hasInstallDates = scheduledCount > 0

    // Completion breakdown
    const completed = { completed: 0, inProgress: 0, pending: 0, canceled: 0 }
    const completedByWorkroom: Record<string, { completed: number; inProgress: number; pending: number; canceled: number }> = {}
    completionAgg.forEach(r => {
      const s = (r.status || '').toLowerCase()
      const c = parseInt(r.count)
      // Categorize by status
      let cat: 'completed' | 'inProgress' | 'canceled' | 'pending' = 'pending'
      if (s.includes('complet')) cat = 'completed'
      else if (s.includes('cancel') || s.includes('chargeback')) cat = 'canceled'
      else if (s.includes('scheduled') || s.includes('dispatched') || s.includes('tentative') || s.includes('sched')) cat = 'inProgress'
      completed[cat] += c
    })
    completionByWorkroomRows.forEach(r => {
      const wr = r.workroom || 'Unassigned'
      if (!completedByWorkroom[wr]) completedByWorkroom[wr] = { completed: 0, inProgress: 0, pending: 0, canceled: 0 }
      const s = (r.status || '').toLowerCase()
      const c = parseInt(r.count)
      if (s.includes('complet')) completedByWorkroom[wr].completed += c
      else if (s.includes('cancel') || s.includes('chargeback')) completedByWorkroom[wr].canceled += c
      else if (s.includes('scheduled') || s.includes('dispatched') || s.includes('tentative') || s.includes('sched')) completedByWorkroom[wr].inProgress += c
      else completedByWorkroom[wr].pending += c
    })
    const completionBreakdown = [
      { label: 'Completed', count: completed.completed, color: '#7ab82e' },
      { label: 'In Progress', count: completed.inProgress, color: '#9dcf4a' },
      { label: 'Pending', count: completed.pending, color: '#c5e88f' },
      { label: 'Canceled', count: completed.canceled, color: '#4a6a1e' },
    ].filter(c => c.count > 0)

    // Pipeline
    const pipeline = pipelineRows
      .filter(r => parseInt(r.count) > 0)
      .map(r => ({
        label: r.category.replace(/ Install$/i, ''),
        count: parseInt(r.count),
        revenue: parseFloat(r.revenue),
      }))

    // Measure-to-Install conversion
    const measureIndex: Record<string, Set<number>> = {}
    measureRows.forEach(m => {
      const lastName = m.last_name.trim()
      const storeNum = (m.store_number || '').trim()
      if (!lastName) return
      const key = `${lastName}|${storeNum}`
      if (!measureIndex[key]) measureIndex[key] = new Set()
      measureIndex[key].add(parseInt(m.order_number))
    })
    const convertedMeasures = new Set<number>()
    installRows.forEach(i => {
      const lastName = i.last_name.trim()
      const storeNum = (i.store_number || '').trim()
      if (!lastName) return
      const key = `${lastName}|${storeNum}`
      const matches = measureIndex[key]
      if (matches) matches.forEach(on => convertedMeasures.add(on))
    })
    const totalMeasures = measureRows.length
    const measureConversions = convertedMeasures.size
    const measureConversionRate = totalMeasures > 0 ? Math.round((measureConversions / totalMeasures) * 100) : 0

    return NextResponse.json({
      totalJobs,
      chargebacks,
      chargebackRate: `${chargebackRate}%`,
      withInstaller,
      withoutInstaller,
      typeDistribution,
      statusDistribution,
      laborDistribution,
      workroomDistribution,
      topStores,
      topInstallers,
      lastMonthSales,
      prevMonthLabel,
      lastMonthTotal,
      previousMonthTotal,
      salesTrend,
      weeklyRevenue,
      weeklyRevenueCount,
      weeklyAvgRevenue,
      weeklyRevenueTrend,
      weeklyJobs,
      weeklyJobsTrend,
      pipeline,
      measureConversions,
      totalMeasures,
      measureConversionRate,
      poAmount,
      monthlyTrend,
      dailyTrend,
      weeklyDistribution,
      scheduledDates,
      scheduledCount,
      hasInstallDates,
      workrooms: Array.from(allWorkrooms).sort(),
      completionBreakdown,
      completionByWorkroom: completedByWorkroom,
    }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Jobs analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch job analytics' }, { status: 500, headers: noStoreHeaders })
  }
}
