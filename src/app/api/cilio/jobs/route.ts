import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"
import { getWorkroomByStoreNumber } from "@/lib/workroomMapping"
import prisma from "@/lib/db"

// Match a resource name string against an installer record
function matchInstallerName(installers: Array<{ id: string; firstName: string; lastName: string }>, resourceName: string) {
  const lower = resourceName.toLowerCase().trim()
  return installers.find(i => {
    const full = `${i.firstName} ${i.lastName}`.toLowerCase()
    const reversed = `${i.lastName} ${i.firstName}`.toLowerCase()
    return full === lower || reversed === lower || full.includes(lower) || lower.includes(full)
  }) || null
}

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

    // Broad searches to maximize coverage, then filter client-side.
    // Includes Canceled/Cancelled, In Progress, and all major statuses.
    const statusTerms = ["Scheduled", "Tentative", "Confirmed", "Completed",
      "Chargeback", "Canceled", "Cancelled", "In Progress", "In Review", "Hold"]
    const searches = userTerm
      ? [userTerm, ...statusTerms]
      : statusTerms

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

    // Batch sync: for jobs not yet in the DB, fetch full details to extract installer names.
    // This is a best-effort background sync so installer badges appear right away.
    const existingRecords = await prisma.cilioJobRecord.findMany({
      where: { orderNumber: { in: allJobs.map((j: any) => j.orderNumber) } },
      select: { orderNumber: true },
    })
    const existingSet = new Set(existingRecords.map(r => r.orderNumber))
    const unsyncedOrderNumbers = allJobs
      .map((j: any) => j.orderNumber)
      .filter((on: number) => !existingSet.has(on))
      .slice(0, 5) // batch at most 5 per request

    if (unsyncedOrderNumbers.length > 0) {
      // Load local installers for name matching
      const localInstallers = await prisma.installer.findMany({
        where: { id: { not: '' } },
        select: { id: true, firstName: true, lastName: true },
      })

      const syncPromises = unsyncedOrderNumbers.map(async (orderNumber: number) => {
        try {
          const detail: any = await cilio.getJobDetail(orderNumber)
          const resp = detail?.responsibleUserInformation
          const respName = resp?.firstName && resp?.lastName
            ? `${resp.firstName} ${resp.lastName}`
            : null
          const res = respName ||
            detail?.schedulingInformation?.scheduledResources
            || detail?.schedulingInformation?.taskOneResource
            || detail?.schedulingInformation?.taskTwoResource
            || detail?.schedulingInformation?.taskThreeResource
          const match = res ? matchInstallerName(localInstallers, res) : null
          if (match) {
            const statusDesc = detail?.generalInformation?.orderStatusEnum ?? detail?.generalInformation?.orderStatusDescription ?? ''
            const isChargeback = statusDesc.toLowerCase().includes("chargeback") || statusDesc.toLowerCase().includes("charge back")
            await prisma.cilioJobRecord.upsert({
              where: { orderNumber },
              create: {
                orderNumber,
                orderStatusDescription: statusDesc || null,
                jobType: isChargeback ? "chargeback" : "scheduled",
                storeNumber: detail?.storeInformation?.storeNumber ?? null,
                storeName: detail?.storeInformation?.storeName ?? null,
                laborCategoryDescription: detail?.laborCategoryDescription ?? detail?.generalInformation?.laborCategoryDescription ?? null,
                workroom: getWorkroomByStoreNumber(detail?.storeInformation?.storeNumber ?? ''),
                scheduledInstallDate: detail?.dateInformation?.scheduledInstallDate ? new Date(detail.dateInformation.scheduledInstallDate) : null,
                measureDate: detail?.dateInformation?.measureDate ? new Date(detail.dateInformation.measureDate) : null,
                bookingDate: detail?.dateInformation?.bookingDate ? new Date(detail.dateInformation.bookingDate) : null,
                installerId: match.id,
                installerName: `${match.firstName} ${match.lastName}`,
                cilioPayload: detail,
              },
              update: {
                installerId: match.id,
                installerName: `${match.firstName} ${match.lastName}`,
              },
            })
          }
        } catch {
          // Best-effort — skip silently
        }
      })
      // Fire-and-forget: don't block the response waiting for sync
      Promise.allSettled(syncPromises).catch(() => {})
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
        installerMap[r.orderNumber] = { id: r.installerId, name: r.installerName || '' }
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
        allInstallerMap[r.orderNumber] = { id: r.installerId, name: r.installerName || '' }
      }
    }

    return NextResponse.json({
      allJobs: allJobs.map((j: any) => ({ ...j, _installer: allInstallerMap[j.orderNumber] || null })),
      jobs: filtered.map((j: any) => ({ ...j, _installer: installerMap[j.orderNumber] || null })),
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
