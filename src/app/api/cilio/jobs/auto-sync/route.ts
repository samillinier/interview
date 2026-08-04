import { NextResponse } from "next/server"
import { CILIO_JOB_PULLS_DISABLED } from "@/lib/cilio"

export const dynamic = "force-dynamic"

/**
 * GET/POST /api/cilio/jobs/auto-sync
 * Cilio job pulls are fully disabled — cron removed from vercel.json.
 */
async function disabled() {
  return NextResponse.json(
    {
      synced: 0,
      total: 0,
      disabled: true,
      message: "Cilio job pulls are disabled. Auto-sync will not run.",
    },
    { status: CILIO_JOB_PULLS_DISABLED ? 503 : 200 }
  )
}

export async function GET() {
  return disabled()
}

export async function POST() {
  return disabled()
}
