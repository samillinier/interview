import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

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

    // Build search terms from active installer names
    const installers = await prisma.installer.findMany({
      where: { status: { in: ["active", "active_approved"] } },
      select: { firstName: true, lastName: true },
      take: 30,
    })

    const nameTerms = installers.map(i => i.firstName).filter(Boolean)
    // Deduplicate names
    const uniqueNames = [...new Set(nameTerms)]

    // Build final search list
    let searches: string[]
    if (userTerm) {
      searches = [userTerm, ...uniqueNames.slice(0, 10)]
    } else {
      // Use installer names + category terms for broader coverage
      searches = [
        ...uniqueNames.slice(0, 15),
        "Carpet", "Vinyl", "Tile", "Backsplash",
      ]
    }

    // Run all searches in parallel
    const results = await Promise.all(
      searches.map(term => cilio.searchJobs(term).catch(() => [] as any[]))
    )

    // Merge and deduplicate by orderNumber
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

    return NextResponse.json({
      allJobs,
      jobs: filtered,
      count: filtered.length,
      totalFetched: allJobs.length,
      searchesRan: searches.length,
    })
  } catch (error: any) {
    console.error("Cilio jobs search error:", error)
    return NextResponse.json(
      { error: "Failed to search Cilio jobs", details: error.message },
      { status: 500 }
    )
  }
}
