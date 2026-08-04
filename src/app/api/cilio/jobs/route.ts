import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs
 * Live Cilio job pulls are fully disabled.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    allJobs: [],
    jobs: [],
    count: 0,
    totalFetched: 0,
    disabled: true,
    message: "Cilio job pulls are disabled.",
  })
}
