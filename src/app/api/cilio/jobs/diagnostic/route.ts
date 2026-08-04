import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/cilio/jobs/diagnostic
 * Cilio job pulls are fully disabled.
 */
export async function GET() {
  return NextResponse.json(
    {
      disabled: true,
      message: "Cilio job pulls are disabled. Diagnostic checks will not call Cilio.",
    },
    { status: 503 }
  )
}
