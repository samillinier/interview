import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import * as cilio from "@/lib/cilio"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const orderNumber = parseInt(resolvedParams.orderNumber, 10)

    if (isNaN(orderNumber)) {
      return NextResponse.json({ error: "Invalid order number" }, { status: 400 })
    }

    let lineItems: any[] = []
    try {
      lineItems = await cilio.getJobLineItems(orderNumber)
    } catch (err: any) {
      // Line items endpoint may not exist on QA - return empty gracefully
      if (!String(err.message).includes('404')) {
        console.error("Cilio line items error:", err)
      }
      lineItems = []
    }
    return NextResponse.json({ lineItems })
  } catch (error: any) {
    console.error("Cilio line items error:", error)
    return NextResponse.json(
      { error: "Failed to get line items", details: error.message },
      { status: 500 }
    )
  }
}
