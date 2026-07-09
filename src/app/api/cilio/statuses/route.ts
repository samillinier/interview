import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getJobStatuses } from "@/lib/cilio"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
