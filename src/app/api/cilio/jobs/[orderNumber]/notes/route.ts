import { NextRequest, NextResponse } from "next/server"
import * as cilio from "@/lib/cilio"
import { requireCilioAccess } from "@/lib/cilioAccess"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const access = await requireCilioAccess(request)
    if (!access.ok) return access.response

    const resolvedParams = params instanceof Promise ? await params : params
    const orderNumber = parseInt(resolvedParams.orderNumber, 10)

    if (isNaN(orderNumber)) {
      return NextResponse.json({ error: "Invalid order number" }, { status: 400 })
    }

    const notes = await cilio.getNotes(orderNumber)
    return NextResponse.json({ notes })
  } catch (error: any) {
    console.error("Cilio notes error:", error)
    return NextResponse.json(
      { error: "Failed to get notes", details: error.message },
      { status: 500 }
    )
  }
}
