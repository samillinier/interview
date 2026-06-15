import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * POST /api/cilio/jobs/sync
 * Body: { jobs: Array<{ orderNumber, orderStatusDescription, jobType, storeNumber, storeName, laborCategoryDescription, workroom, scheduledInstallDate, measureDate, bookingDate, installerId, installerName, cilioPayload }> }
 *
 * Upserts Cilio job records into the local DB, linking them to matched installers.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const jobs: Array<{
      orderNumber: number
      orderStatusDescription?: string | null
      jobType: "scheduled" | "chargeback"
      storeNumber?: string | null
      storeName?: string | null
      laborCategoryDescription?: string | null
      workroom?: string | null
      scheduledInstallDate?: string | null
      measureDate?: string | null
      bookingDate?: string | null
      installerId?: string | null
      installerName?: string | null
      cilioPayload: any
    }> = body.jobs || []

    if (!Array.isArray(jobs) || jobs.length === 0) {
      return NextResponse.json({ synced: 0, message: "No jobs to sync" })
    }

    let synced = 0

    for (const job of jobs) {
      if (!job.orderNumber) continue

      await prisma.cilioJobRecord.upsert({
        where: { orderNumber: job.orderNumber },
        create: {
          orderNumber: job.orderNumber,
          orderStatusDescription: job.orderStatusDescription ?? null,
          jobType: job.jobType,
          storeNumber: job.storeNumber ?? null,
          storeName: job.storeName ?? null,
          laborCategoryDescription: job.laborCategoryDescription ?? null,
          workroom: job.workroom ?? null,
          scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
          measureDate: job.measureDate ? new Date(job.measureDate) : null,
          bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
          installerId: job.installerId || null,
          installerName: job.installerName ?? null,
          cilioPayload: job.cilioPayload ?? {},
        },
        update: {
          orderStatusDescription: job.orderStatusDescription ?? null,
          jobType: job.jobType,
          storeNumber: job.storeNumber ?? null,
          storeName: job.storeName ?? null,
          laborCategoryDescription: job.laborCategoryDescription ?? null,
          workroom: job.workroom ?? null,
          scheduledInstallDate: job.scheduledInstallDate ? new Date(job.scheduledInstallDate) : null,
          measureDate: job.measureDate ? new Date(job.measureDate) : null,
          bookingDate: job.bookingDate ? new Date(job.bookingDate) : null,
          installerId: job.installerId || null,
          installerName: job.installerName ?? null,
          cilioPayload: job.cilioPayload ?? {},
        },
      })
      synced++
    }

    return NextResponse.json({ synced, message: `Synced ${synced} jobs` })
  } catch (error: any) {
    console.error("Cilio jobs sync error:", error)
    return NextResponse.json(
      { error: "Failed to sync jobs", details: error.message },
      { status: 500 }
    )
  }
}
