import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCallLogs, type GetCallLogsParams } from "@/lib/ringCentral"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const params: GetCallLogsParams = {}

    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const direction = searchParams.get("direction")
    const phoneNumber = searchParams.get("phoneNumber")
    const missedOnly = searchParams.get("missedOnly")
    const withRecording = searchParams.get("withRecording")
    const page = searchParams.get("page")
    const perPage = searchParams.get("perPage")

    if (dateFrom) params.dateFrom = dateFrom
    if (dateTo) params.dateTo = dateTo
    if (direction === "Inbound" || direction === "Outbound") params.direction = direction
    if (phoneNumber) params.phoneNumber = phoneNumber
    if (missedOnly === "true") params.missedOnly = true
    if (withRecording === "true") params.withRecording = true
    if (page) params.page = parseInt(page, 10)
    if (perPage) params.perPage = parseInt(perPage, 10)

    // Default to last 12 months if no date range provided
    if (!params.dateFrom) {
      const d = new Date()
      d.setFullYear(d.getFullYear() - 1)
      params.dateFrom = d.toISOString()
      params.dateTo = new Date().toISOString()
    }

    const data = await getCallLogs(params)
    return NextResponse.json(data)
  } catch (error: any) {
    console.error("RingCentral call logs error:", error)
    const message = error?.message || "Failed to fetch call logs"
    const status = message.includes("not configured") ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
