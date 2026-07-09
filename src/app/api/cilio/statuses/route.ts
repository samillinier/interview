import { NextRequest, NextResponse } from "next/server"
import { getJobStatuses } from "@/lib/cilio"
import { requireCilioAccess } from "@/lib/cilioAccess"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const access = await requireCilioAccess(request)
    if (!access.ok) return access.response

    const statuses = await getJobStatuses()
    return NextResponse.json({ statuses })
  } catch (error: any) {
    console.error("Cilio statuses error:", error)
    return NextResponse.json(
      { error: "Failed to load job statuses", details: error.message },
      { status: 500 }
    )
  }
}
