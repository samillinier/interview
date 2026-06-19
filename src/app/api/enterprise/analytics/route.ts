import { NextResponse } from "next/server"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [crewPayAgg, poAgg] = await Promise.all([
      prisma.cilioJobRecord.aggregate({
        where: { crewPayTotal: { not: null } },
        _sum: { crewPayTotal: true },
        _count: true,
        _min: { crewPayTotal: true },
        _max: { crewPayTotal: true },
      }),
      prisma.$queryRawUnsafe<Array<{ total_po: string; po_count: string }>>(
        `SELECT COALESCE(SUM(("cilioPayload"->>'poAmount')::numeric), 0) as total_po, COUNT(*) as po_count FROM "CilioJobRecord" WHERE "cilioPayload"->>'poAmount' IS NOT NULL`
      ),
    ])

    const totalCrewPay = Number(crewPayAgg._sum.crewPayTotal || 0)
    const crewPayCount = crewPayAgg._count
    const minCrewPay = Number(crewPayAgg._min.crewPayTotal || 0)
    const maxCrewPay = Number(crewPayAgg._max.crewPayTotal || 0)
    const avgCrewPay = crewPayCount > 0 ? totalCrewPay / crewPayCount : 0
    const totalPO = Number(poAgg[0]?.total_po || 0)
    const poCount = Number(poAgg[0]?.po_count || 0)
    const marginPct = totalPO > 0 ? Math.round((1 - totalCrewPay / totalPO) * 1000) / 10 : 0

    const [byWorkroom, byLaborCategory, topInstallers, trendRows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ workroom: string; total: string; count: string }>>(
        `SELECT COALESCE("workroom", 'Unassigned') as workroom, COALESCE(SUM("crewPayTotal"), 0) as total, COUNT(*) as count FROM "CilioJobRecord" WHERE "crewPayTotal" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`
      ),
      prisma.$queryRawUnsafe<Array<{ category: string; total: string; count: string }>>(
        `SELECT COALESCE("laborCategoryDescription", 'Unspecified') as category, COALESCE(SUM("crewPayTotal"), 0) as total, COUNT(*) as count FROM "CilioJobRecord" WHERE "crewPayTotal" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 8`
      ),
      prisma.$queryRawUnsafe<Array<{ name: string; total: string; count: string }>>(
        `SELECT COALESCE("installerName", 'Unassigned') as name, COALESCE(SUM("crewPayTotal"), 0) as total, COUNT(*) as count FROM "CilioJobRecord" WHERE "crewPayTotal" IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
      ),
      prisma.$queryRawUnsafe<Array<{ month: string; total: string }>>(
        `SELECT to_char(date_trunc('month', "scheduledInstallDate"), 'YYYY-MM') as month, COALESCE(SUM("crewPayTotal"), 0) as total FROM "CilioJobRecord" WHERE "crewPayTotal" IS NOT NULL AND "scheduledInstallDate" >= $1::date GROUP BY 1 ORDER BY 1`,
        new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1)
      ),
    ])

    // Build complete 12-month trend with zeros for missing months
    const now = new Date()
    const trendMap: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      trendMap[key] = 0
    }
    trendRows.forEach(r => {
      if (trendMap[r.month] !== undefined) trendMap[r.month] = Number(r.total)
    })
    const crewPayTrend = Object.entries(trendMap).map(([month, total]) => ({ month, total }))

    return NextResponse.json({
      summary: {
        totalCrewPay: Math.round(totalCrewPay * 100) / 100,
        crewPayCount,
        avgCrewPay: Math.round(avgCrewPay * 100) / 100,
        minCrewPay,
        maxCrewPay,
        totalPO: Math.round(totalPO * 100) / 100,
        poCount,
        marginPct,
      },
      byWorkroom: byWorkroom.map(r => ({
        workroom: r.workroom,
        total: Math.round(Number(r.total) * 100) / 100,
        count: Number(r.count),
        avg: Number(r.count) > 0 ? Math.round(Number(r.total) / Number(r.count) * 100) / 100 : 0,
      })),
      byLaborCategory: byLaborCategory.map(r => ({
        category: r.category,
        total: Math.round(Number(r.total) * 100) / 100,
        count: Number(r.count),
        avg: Number(r.count) > 0 ? Math.round(Number(r.total) / Number(r.count) * 100) / 100 : 0,
      })),
      topInstallers: topInstallers.map(r => ({
        name: r.name,
        total: Math.round(Number(r.total) * 100) / 100,
        count: Number(r.count),
      })),
      crewPayTrend,
    })
  } catch (error) {
    console.error("Enterprise analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch enterprise analytics" }, { status: 500 })
  }
}
