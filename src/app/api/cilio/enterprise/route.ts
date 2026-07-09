import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { requireCilioAccess } from "@/lib/cilioAccess"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/enterprise
 * Get all enterprise groups
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireCilioAccess(request)
    if (!access.ok) return access.response

    const groups = await cilio.getEnterpriseGroups()
    return NextResponse.json({ groups })
  } catch (error: any) {
    console.error("Cilio enterprise groups error:", error)
    return NextResponse.json(
      { error: "Failed to get enterprise groups", details: error.message },
      { status: 500 }
    )
  }
}
