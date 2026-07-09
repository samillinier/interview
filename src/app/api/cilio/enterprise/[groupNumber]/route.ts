import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { requireCilioAccess } from "@/lib/cilioAccess"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/enterprise/[groupNumber]
 * Get a single enterprise group by number
 *
 * Requires admin authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupNumber: string }> }
) {
  try {
    const access = await requireCilioAccess(request)
    if (!access.ok) return access.response

    const resolvedParams = params instanceof Promise ? await params : params
    const groupNumber = parseInt(resolvedParams.groupNumber, 10)

    if (isNaN(groupNumber)) {
      return NextResponse.json({ error: "Invalid enterprise group number" }, { status: 400 })
    }

    const group = await cilio.getEnterpriseGroup(groupNumber)
    return NextResponse.json({ group })
  } catch (error: any) {
    console.error("Cilio enterprise group error:", error)
    return NextResponse.json(
      { error: "Failed to get enterprise group", details: error.message },
      { status: 500 }
    )
  }
}
