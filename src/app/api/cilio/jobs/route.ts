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

    // Always use broad searches to maximize results, then filter client-side.
    // User searches are applied as client-side filters because Cilio's search
    // API often returns unrelated results for specific name queries.
    const searches = userTerm
      ? [userTerm, "Scheduled", "Tentative", "Confirmed"]
      : ["Scheduled", "Tentative", "Confirmed", "Completed", "Chargeback"]

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

    // Look up installer names from our synced CilioJobRecord table
    const orderNumbers = filtered.map((j: any) => j.orderNumber)
    let installerMap: Record<number, { id: string; name: string } | null> = {}
    if (orderNumbers.length > 0) {
      const records = await prisma.cilioJobRecord.findMany({
        where: { orderNumber: { in: orderNumbers } },
        select: { orderNumber: true, installerId: true, installerName: true },
      })
      for (const r of records) {
        installerMap[r.orderNumber] = { id: r.installerId, name: r.installerName || '' }
      }
    }

    // For jobs not yet in our DB, fetch full detail in small batch to match installer names
    const unsynced = filtered.filter((j: any) => !installerMap[j.orderNumber]).slice(0, 5)
    if (unsynced.length > 0) {
      const allInstallers = await prisma.installer.findMany({
        where: { status: 'active' },
        select: { id: true, firstName: true, lastName: true, companyName: true },
      })
      const details = await Promise.all(
        unsynced.map(async (j: any) => {
          try { return await cilio.getJobDetail(j.orderNumber) as any }
          catch { return null }
        })
      )
      for (let i = 0; i < unsynced.length; i++) {
        const job = unsynced[i]
        const detail = details[i]
        if (!detail) continue
        const res = (detail as any).schedulingInformation?.scheduledResources
        if (!res) continue
        const lower = String(res).toLowerCase().trim()
        const match = allInstallers.find(inst => {
          const full = `${inst.firstName} ${inst.lastName}`.toLowerCase()
          const reversed = `${inst.lastName} ${inst.firstName}`.toLowerCase()
          return full === lower || reversed === lower || full.includes(lower) || lower.includes(full)
        })
        if (match) {
          const name = `${match.firstName} ${match.lastName}`
          installerMap[job.orderNumber] = { id: match.id, name }
          // Also sync to DB so it persists
          try {
            await prisma.cilioJobRecord.upsert({
              where: { orderNumber: job.orderNumber },
              update: { installerId: match.id, installerName: name },
              create: {
                orderNumber: job.orderNumber,
                jobType: 'scheduled',
                installerId: match.id,
                installerName: name,
                orderStatusDescription: detail.generalInformation?.orderStatusDescription || null,
                storeNumber: detail.storeInformation?.storeNumber || null,
                storeName: detail.storeInformation?.storeName || null,
                cilioPayload: detail,
              },
            })
          } catch {}
        }
      }
    }

    // Enrich filtered jobs with installer info
    const enrichedJobs = filtered.map((j: any) => ({
      ...j,
      _installer: installerMap[j.orderNumber] || null,
    }))

    return NextResponse.json({
      allJobs: allJobs.map((j: any) => ({
        ...j,
        _installer: installerMap[j.orderNumber] || null,
      })),
      jobs: enrichedJobs,
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
