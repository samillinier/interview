import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 120

/**
 * GET /api/cilio/jobs
 * Query params: ?search= &status= &laborCategory= &workroom=
 * Runs multiple parallel searches using active installer names plus
 * category terms to bypass the 50-job Cilio limit.
 * Returns { allJobs, jobs, count, searchStats }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const searchTerm = searchParams.get("search") || ""
    const statusFilter = searchParams.get("status") || ""
    const laborCategoryFilter = searchParams.get("laborCategory") || ""
    const workroomFilter = searchParams.get("workroom") || ""

    const userTerm = searchTerm.trim()

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
