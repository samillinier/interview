import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getCallLogs, type GetCallLogsParams, type RCCallLogRecord } from "@/lib/ringCentral"
import prisma from "@/lib/db"

function normalizePhone(value?: string): string {
  if (!value) return ""
  return value.replace(/\D/g, "")
}

/**
 * Build a lookup of phone-number/name -> workroom from the synced contact
 * directory, then annotate each call record with its detected workroom.
 */
async function attachWorkrooms(records: RCCallLogRecord[]) {
  const contacts = await prisma.contact.findMany({
    where: { workroom: { not: null } },
    select: { name: true, phone: true, workroom: true },
  })

  const phoneMap = new Map<string, string>()
  const nameMap = new Map<string, string>()
  for (const c of contacts) {
    const wr = (c.workroom || "").trim()
    if (!wr) continue
    if (c.phone) {
      const digits = normalizePhone(c.phone)
      if (digits && !phoneMap.has(digits)) phoneMap.set(digits, wr)
    }
    if (c.name) {
      const key = c.name.trim().toLowerCase()
      if (key && !nameMap.has(key)) nameMap.set(key, wr)
    }
  }

  return records.map((rec) => {
    const fromPhone = normalizePhone(rec.from?.phoneNumber)
    const toPhone = normalizePhone(rec.to?.phoneNumber)
    const fromName = rec.from?.name?.trim().toLowerCase() || ""
    const toName = rec.to?.name?.trim().toLowerCase() || ""

    const workroom =
      phoneMap.get(fromPhone) ||
      phoneMap.get(toPhone) ||
      nameMap.get(fromName) ||
      nameMap.get(toName) ||
      null

    return { ...rec, workroom }
  })
}

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

    // Default to last 90 days (RingCentral API silently caps wider ranges)
    if (!params.dateFrom) {
      const d = new Date()
      d.setDate(d.getDate() - 90)
      params.dateFrom = d.toISOString()
      params.dateTo = new Date().toISOString()
    }

    const data = await getCallLogs(params)

    // Annotate records with a workroom when the synced directory can resolve one.
    try {
      const records = await attachWorkrooms(data.records || [])
      return NextResponse.json({ ...data, records })
    } catch (attachError: any) {
      console.error("RingCentral workroom attach error:", attachError)
      return NextResponse.json(data)
    }
  } catch (error: any) {
    console.error("RingCentral call logs error:", error)
    const message = error?.message || "Failed to fetch call logs"
    const status = message.includes("not configured") ? 503 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
