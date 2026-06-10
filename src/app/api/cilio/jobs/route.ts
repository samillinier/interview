import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"

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

    // Search for status/resource terms that return install-focused jobs,
    // not just the 50 most recent (which are mostly Measure).
    let searches: string[]
    if (userTerm) {
      searches = [userTerm]
    } else {
      // Search by common status terms that match install jobs
      searches = ["Scheduled", "Tentative", "Confirmed", "Completed", "Chargeback"]
    }

    console.log(`[Cilio API] Running ${searches.length} parallel searches:`, searches)

    // Run all searches in parallel
    const results = await Promise.all(
      searches.map(async (term) => {
        const jobs = await cilio.searchJobs(term).catch(() => [] as any[])
        console.log(`[Cilio API] Search "${term}" returned ${jobs.length} jobs`)
        return jobs
      })
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
