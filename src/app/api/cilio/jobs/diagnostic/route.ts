import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs/diagnostic
 * Diagnostic endpoint to test raw Cilio API connectivity from Vercel's environment.
 */
export async function GET(request: NextRequest) {
  const key = process.env.CILIO_SUBSCRIPTION_KEY || ""
  const baseUrl = process.env.CILIO_API_BASE_URL || ""

  // Test 1: Call without any date filters
  const noFilter = await cilio.searchJobs({}).catch((e: any) => ({ error: e?.message || String(e) }))

  // Test 2: Call with last 7 days
  const end = new Date()
  const start = new Date(end.getTime() - 7 * 86400000)
  const withDates = await cilio.searchJobs({
    orderModifiedDateStart: start.toISOString(),
    orderModifiedDateEnd: end.toISOString(),
  }).catch((e: any) => ({ error: e?.message || String(e) }))

  return NextResponse.json({
    env: {
      keyPrefix: key.slice(0, 6) + "...",
      keyLength: key.length,
      baseUrl,
    },
    noFilter: Array.isArray(noFilter)
      ? { count: noFilter.length, sample1: noFilter[0]?.orderNumber, sample2: noFilter[1]?.orderNumber }
      : noFilter,
    withDates: Array.isArray(withDates)
      ? { count: withDates.length, sample1: withDates[0]?.orderNumber, sample2: withDates[1]?.orderNumber, dateRange: `${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}` }
      : withDates,
  })
}
