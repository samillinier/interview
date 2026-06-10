import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/installers/[id]/jobs
 * Returns all saved Cilio jobs (scheduled and chargeback) for a specific installer.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: installerId } = await params

    const [scheduledJobs, chargebackJobs] = await Promise.all([
      prisma.cilioJobRecord.findMany({
        where: { installerId, jobType: "scheduled" },
        orderBy: { createdAt: "desc" },
      }),
      prisma.cilioJobRecord.findMany({
        where: { installerId, jobType: "chargeback" },
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({ scheduledJobs, chargebackJobs })
  } catch (error: any) {
    console.error("Error fetching installer jobs:", error)
    return NextResponse.json(
      { error: "Failed to fetch installer jobs", details: error.message },
      { status: 500 }
    )
  }
}
