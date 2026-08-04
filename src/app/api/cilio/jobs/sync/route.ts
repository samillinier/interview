import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/cilio/jobs/sync
 * Cilio job pulls/syncs are fully disabled.
 */
export async function POST() {
  return NextResponse.json(
    {
      synced: 0,
      disabled: true,
      message: "Cilio job sync is disabled. No jobs will be saved from Cilio.",
    },
    { status: 503 }
  )
}
