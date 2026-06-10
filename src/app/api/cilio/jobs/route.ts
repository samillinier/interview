import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs
 * Query params: ?search= &status= &laborCategory= &workroom=
 * Runs parallel searches for multiple labor category terms to bypass the
 * 50-job Cilio limit and reduce Measure noise.
 * Returns { allJobs: unfiltered, jobs: filtered, count }
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

    // Search for install-related labor categories in parallel to maximize
    // results beyond the 50-job limit and skip Measure-heavy default search.
    const categoryTerms = ["Carpet", "Vinyl", "Tile", "Backsplash", "Hardwood", "Laminate"]
    const userTerm = searchTerm.trim()

    let searches: string[]
    if (userTerm) {
      // If user typed a specific search, use that + category terms
      searches = [userTerm, ...categoryTerms]
    } else {
      // Default: search each category individually
      searches = categoryTerms
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

    return NextResponse.json({ allJobs, jobs: filtered, count: filtered.length })
  } catch (error: any) {
    console.error("Cilio jobs search error:", error)
    return NextResponse.json(
      { error: "Failed to search Cilio jobs", details: error.message },
      { status: 500 }
    )
  }
}
