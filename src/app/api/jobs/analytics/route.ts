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
        installerName: true,
        installerId: true,
        createdAt: true,
        updatedAt: true,
        cilioPayload: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    })

    const total = records.length

    // Type distribution
    const typeCounts: Record<string, number> = {}
    records.forEach(r => {
      const t = r.jobType || 'unknown'
      typeCounts[t] = (typeCounts[t] || 0) + 1
    })
    const typeDistribution = Object.entries(typeCounts).map(([type, count]) => ({ type, count }))

    // Status distribution (from orderStatusDescription)
    const statusCounts: Record<string, number> = {}
    records.forEach(r => {
      const s = r.orderStatusDescription || 'Unknown'
      statusCounts[s] = (statusCounts[s] || 0) + 1
    })
    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    // Completion breakdown — group statuses into categories, per-workroom
    const completed = { completed: 0, inProgress: 0, pending: 0, canceled: 0 }
    const completedByWorkroom: Record<string, { completed: number; inProgress: number; pending: number; canceled: number }> = {}
    records.forEach(r => {
      const s = (r.orderStatusDescription || '').toLowerCase()
      const wr = r.workroom || 'Unassigned'
      if (!completedByWorkroom[wr]) completedByWorkroom[wr] = { completed: 0, inProgress: 0, pending: 0, canceled: 0 }
      if (s.includes('complet')) { completed.completed++; completedByWorkroom[wr].completed++ }
      else if (s.includes('cancel') || s.includes('chargeback')) { completed.canceled++; completedByWorkroom[wr].canceled++ }
      else if (s.includes('scheduled') || s.includes('dispatched') || s.includes('tentative') || s.includes('sched')) { completed.inProgress++; completedByWorkroom[wr].inProgress++ }
      else { completed.pending++; completedByWorkroom[wr].pending++ }
    })
    const completionBreakdown = [
      { label: 'Completed', count: completed.completed, color: '#7ab82e' },
      { label: 'In Progress', count: completed.inProgress, color: '#9dcf4a' },
      { label: 'Pending', count: completed.pending, color: '#c5e88f' },
      { label: 'Canceled', count: completed.canceled, color: '#4a6a1e' },
    ].filter(c => c.count > 0)
    const completionByWorkroom: Record<string, { completed: number; inProgress: number; pending: number; canceled: number }> = completedByWorkroom

    // Labor category distribution
    const laborCounts: Record<string, number> = {}
    records.forEach(r => {
      const l = r.laborCategoryDescription || 'Unspecified'
      laborCounts[l] = (laborCounts[l] || 0) + 1
    })
    const laborDistribution = Object.entries(laborCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    // Workroom distribution
    const workroomCounts: Record<string, number> = {}
    records.forEach(r => {
      const w = r.workroom || 'Unassigned'
      workroomCounts[w] = (workroomCounts[w] || 0) + 1
    })
    const workroomDistribution = Object.entries(workroomCounts)
      .map(([workroom, count]) => ({ workroom, count }))
      .sort((a, b) => b.count - a.count)

    // Last month store sales — aggregate poAmount by store for previous calendar month
    const now = new Date()
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const prevMonthLabel = prevMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
    const storeSales: Record<string, { name: string; total: number; count: number }> = {}
    records.forEach(r => {
      const p = r.cilioPayload as any
      const di = p?.dateInformation || {}
      const jobDate = r.scheduledInstallDate
        || p?.currentOrderStatusDate
        || di?.desiredInstallDate
        || di?.currentDate
        || r.createdAt
      const d = jobDate ? new Date(jobDate) : null
      if (d && d >= prevMonth && d <= prevMonthEnd) {
        const key = r.storeNumber || r.storeName || 'unknown'
        const name = r.storeName || key
        if (!storeSales[key]) storeSales[key] = { name, total: 0, count: 0 }
        const po = (r.cilioPayload as any)?.poAmount
        if (po != null && !isNaN(Number(po))) {
          storeSales[key].total += Number(po)
          storeSales[key].count++
        }
      }
    })
    const lastMonthSales = Object.values(storeSales)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
    const lastMonthTotal = Object.values(storeSales).reduce((sum, s) => sum + s.total, 0)

    // Two months ago — for trend comparison
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const twoMonthsAgoEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0)
    let previousMonthTotal = 0
    records.forEach(r => {
      const p = r.cilioPayload as any
      const di = p?.dateInformation || {}
      const jobDate = r.scheduledInstallDate
        || p?.currentOrderStatusDate
        || di?.desiredInstallDate
        || di?.currentDate
        || r.createdAt
      const d = jobDate ? new Date(jobDate) : null
      if (d && d >= twoMonthsAgo && d <= twoMonthsAgoEnd) {
        const po = (r.cilioPayload as any)?.poAmount
        if (po != null && !isNaN(Number(po))) previousMonthTotal += Number(po)
      }
    })
    const salesTrend = previousMonthTotal > 0
      ? Math.round(((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100)
      : 0

    // Top stores (by job count — kept for backward compatibility)
    const storeCounts: Record<string, { name: string; count: number }> = {}
    records.forEach(r => {
      const key = r.storeNumber || 'unknown'
      if (!storeCounts[key]) storeCounts[key] = { name: r.storeName || key, count: 0 }
      storeCounts[key].count++
    })
    const topStores = Object.values(storeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // PO Amount metrics
    let totalPO = 0
    let poCount = 0
    let poMin = Infinity
    let poMax = 0
    records.forEach(r => {
      const po = (r.cilioPayload as any)?.poAmount
      if (po != null && !isNaN(Number(po))) {
        const val = Number(po)
        totalPO += val
        poCount++
        if (val < poMin) poMin = val
        if (val > poMax) poMax = val
      }
    })
    const poAvg = poCount > 0 ? totalPO / poCount : 0

    // Monthly trend (last 12 months)
    const monthlyCounts: Record<string, number> = {}
    const monthlyPO: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyCounts[key] = 0
      monthlyPO[key] = 0
    }
    records.forEach(r => {
      const p = r.cilioPayload as any
      const di = p?.dateInformation || {}
      const jobDate = r.scheduledInstallDate
        || p?.currentOrderStatusDate
        || di?.desiredInstallDate
        || di?.currentDate
        || r.createdAt
      const d = jobDate ? new Date(jobDate) : null
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (monthlyCounts[key] !== undefined) {
          monthlyCounts[key]++
          const po = (r.cilioPayload as any)?.poAmount
          if (po != null && !isNaN(Number(po))) monthlyPO[key] += Number(po)
        }
      }
    })
    const monthlyTrend = Object.entries(monthlyCounts).map(([month, count]) => ({
      month,
      count,
      poTotal: monthlyPO[month] || 0,
    }))

    // Daily trend (last 30 days) — by actual job date, not DB save date
    const dailyCounts: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyCounts[key] = 0
    }
    records.forEach(r => {
      // Use the best available date: scheduledInstallDate, then cilioPayload date, then createdAt
      const p = r.cilioPayload as any
      const di = p?.dateInformation || {}
      const jobDate = r.scheduledInstallDate
        || p?.currentOrderStatusDate
        || di?.desiredInstallDate
        || di?.currentDate
        || r.createdAt
      const d = jobDate ? new Date(jobDate) : null
      if (d) {
        const key = d.toISOString().split('T')[0]
        if (dailyCounts[key] !== undefined) dailyCounts[key]++
      }
    })
    const dailyTrend = Object.entries(dailyCounts).map(([date, count]) => ({ date, count }))

    // Top installers by job count
    const installerCounts: Record<string, { name: string; count: number }> = {}
    records.forEach(r => {
      if (r.installerName) {
        const key = r.installerId || r.installerName
        if (!installerCounts[key]) installerCounts[key] = { name: r.installerName, count: 0 }
        installerCounts[key].count++
      }
    })
    const topInstallers = Object.values(installerCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Jobs with/without installer assigned
    const withInstaller = records.filter(r => r.installerId).length
    const withoutInstaller = total - withInstaller

    // Chargeback rate - check status, jobType, AND labor category
    const chargebacks = records.filter(r =>
      (r.orderStatusDescription || '').toLowerCase().includes('chargeback') ||
      r.jobType === 'chargeback' ||
      (r.laborCategoryDescription || '').toLowerCase().includes('chargeback')
    ).length
    const chargebackRate = total > 0 ? (chargebacks / total * 100).toFixed(1) : '0.0'

    // Weekly distribution (jobs by day of week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklyCounts: Record<string, number> = {}
    dayNames.forEach(d => { weeklyCounts[d] = 0 })
    records.forEach(r => {
      const p = r.cilioPayload as any
      const di = p?.dateInformation || {}
      const jobDate = r.scheduledInstallDate
        || p?.currentOrderStatusDate
        || di?.desiredInstallDate
        || di?.currentDate
        || r.createdAt
      const d = jobDate ? new Date(jobDate) : null
      if (d) {
        const day = dayNames[d.getDay()]
        weeklyCounts[day] = (weeklyCounts[day] || 0) + 1
      }
    })
    const weeklyDistribution = dayNames.map(day => ({ day, count: weeklyCounts[day] || 0 }))

    // Scheduled install dates — individual dates for calendar with workroom + labor breakdown
    const scheduledDates: Record<string, { total: number; byWorkroom: Record<string, number>; byLaborCategory: Record<string, number> }> = {}
    const allWorkrooms = new Set<string>()
    let hasInstallDates = false
    let scheduledCount = 0
    records.forEach(r => {
      const d = r.scheduledInstallDate ? new Date(r.scheduledInstallDate) : null
      if (d) {
        scheduledCount++
        hasInstallDates = true
        const key = d.toISOString().split('T')[0] // YYYY-MM-DD
        const wr = r.workroom || 'Unassigned'
        const labor = r.laborCategoryDescription || 'Unspecified'
        allWorkrooms.add(wr)
        if (!scheduledDates[key]) scheduledDates[key] = { total: 0, byWorkroom: {}, byLaborCategory: {} }
        scheduledDates[key].total++
        scheduledDates[key].byWorkroom[wr] = (scheduledDates[key].byWorkroom[wr] || 0) + 1
        scheduledDates[key].byLaborCategory[labor] = (scheduledDates[key].byLaborCategory[labor] || 0) + 1
      }
    })

    return NextResponse.json({
      totalJobs: total,
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
      poAmount: {
        total: totalPO,
        average: Math.round(poAvg * 100) / 100,
        min: poMin === Infinity ? 0 : poMin,
        max: poMax,
        count: poCount,
      },
      monthlyTrend,
      dailyTrend,
      weeklyDistribution,
      scheduledDates,
      scheduledCount,
      hasInstallDates,
      workrooms: Array.from(allWorkrooms).sort(),
      completionBreakdown,
      completionByWorkroom,
    }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Jobs analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch job analytics' }, { status: 500, headers: noStoreHeaders })
  }
}
