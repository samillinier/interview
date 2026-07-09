import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/enterprise
 * Get all enterprise groups
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
