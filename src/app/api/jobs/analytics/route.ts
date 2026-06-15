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
      take: 5000,
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

    // Top stores
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
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthlyCounts[key] = 0
      monthlyPO[key] = 0
    }
    records.forEach(r => {
      const d = r.createdAt ? new Date(r.createdAt) : null
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

    // Daily trend (last 30 days)
    const dailyCounts: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      dailyCounts[key] = 0
    }
    records.forEach(r => {
      const d = r.createdAt ? new Date(r.createdAt) : null
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

    // Chargeback rate
    const chargebacks = records.filter(r => r.jobType === 'chargeback').length
    const chargebackRate = total > 0 ? (chargebacks / total * 100).toFixed(1) : '0.0'

    // Weekly distribution (jobs by day of week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weeklyCounts: Record<string, number> = {}
    dayNames.forEach(d => { weeklyCounts[d] = 0 })
    records.forEach(r => {
      const d = r.createdAt ? new Date(r.createdAt) : null
      if (d) {
        const day = dayNames[d.getDay()]
        weeklyCounts[day] = (weeklyCounts[day] || 0) + 1
      }
    })
    const weeklyDistribution = dayNames.map(day => ({ day, count: weeklyCounts[day] || 0 }))

    // Scheduled install dates — individual dates for calendar
    const scheduledDates: Record<string, number> = {}
    let hasInstallDates = false
    let scheduledCount = 0
    records.forEach(r => {
      const d = r.scheduledInstallDate ? new Date(r.scheduledInstallDate) : null
      if (d) {
        scheduledCount++
        hasInstallDates = true
        const key = d.toISOString().split('T')[0] // YYYY-MM-DD
        scheduledDates[key] = (scheduledDates[key] || 0) + 1
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
    }, { headers: noStoreHeaders })
  } catch (error) {
    console.error('Jobs analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch job analytics' }, { status: 500, headers: noStoreHeaders })
  }
}
