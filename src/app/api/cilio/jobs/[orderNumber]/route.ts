import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getJobDetail, updateJobStatus, updateSalesOrderNumber } from "@/lib/cilio"

export async function GET(
  _request: NextRequest,
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
      return NextResponse.json({ error: "Invalid orderNumber" }, { status: 400 })
    }

    const detail = await getJobDetail(orderNumber)
    return NextResponse.json({ detail })
  } catch (error: any) {
    console.error("Cilio job detail error:", error)
    const errorMsg = error.message || String(error)
    const status = errorMsg.includes("404") ? 404 : 500
    return NextResponse.json(
      { error: status === 404 ? "Job not found" : "Failed to load job detail", details: errorMsg },
      { status }
    )
  }
}

export async function PUT(
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
      return NextResponse.json({ error: "Invalid orderNumber" }, { status: 400 })
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case "updateStatus": {
        const { orderStatusId } = data
        if (typeof orderStatusId !== "number") {
          return NextResponse.json({ error: "orderStatusId is required" }, { status: 400 })
        }
        await updateJobStatus({ orderNumber, orderStatusId })
        return NextResponse.json({ success: true })
      }

      case "updateSalesOrder": {
        const { salesOrderNumber } = data
        if (typeof salesOrderNumber !== "string") {
          return NextResponse.json({ error: "salesOrderNumber is required" }, { status: 400 })
        }
        await updateSalesOrderNumber(orderNumber, salesOrderNumber)
        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error: any) {
    console.error("Cilio job update error:", error)
    return NextResponse.json(
      { error: "Failed to update job", details: error.message || String(error) },
      { status: 500 }
    )
  }
}
