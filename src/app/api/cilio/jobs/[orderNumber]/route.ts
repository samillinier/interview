import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getJobDetail, updateJobStatus, updateSalesOrderNumber } from "@/lib/cilio"
import prisma from "@/lib/db"

function extractInstallerResourceName(detail: any): string | null {
  const sched = detail?.schedulingInformation
  const scheduledResourceName = sched?.scheduledResource
    ? [sched.scheduledResource.firstName, sched.scheduledResource.lastName].filter(Boolean).join(" ")
    : null
  const resp = detail?.responsibleUserInformation
  const responsibleName = [resp?.firstName, resp?.lastName].filter(Boolean).join(" ") || null
  return (
    sched?.scheduledResources ||
    sched?.taskOneResource ||
    sched?.taskTwoResource ||
    sched?.taskThreeResource ||
    scheduledResourceName ||
    responsibleName ||
    null
  )
}

function matchInstallerByName(
  installers: { id: string; firstName: string; lastName: string; companyName: string | null }[],
  resourceName: string
) {
  const lower = resourceName.toLowerCase().trim()
  return (
    installers.find((i) => {
      const full = `${i.firstName} ${i.lastName}`.toLowerCase()
      const reversed = `${i.lastName} ${i.firstName}`.toLowerCase()
      return full === lower || reversed === lower || full.includes(lower) || lower.includes(full)
    }) || null
  )
}

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

    let installer: { id: string; name: string; companyName: string | null } | null = null

    const record = await prisma.cilioJobRecord.findUnique({
      where: { orderNumber },
      select: {
        installerId: true,
        installerName: true,
        Installer: {
          select: { firstName: true, lastName: true, companyName: true },
        },
      },
    })

    if (record) {
      const name =
        record.installerName?.trim() ||
        `${record.Installer.firstName} ${record.Installer.lastName}`.trim()
      installer = {
        id: record.installerId,
        name,
        companyName: record.Installer.companyName,
      }
    } else {
      const resourceName = extractInstallerResourceName(detail)
      if (resourceName) {
        const localInstallers = await prisma.installer.findMany({
          where: { status: { not: "rejected" } },
          select: { id: true, firstName: true, lastName: true, companyName: true },
        })
        const match = matchInstallerByName(localInstallers, resourceName)
        if (match) {
          installer = {
            id: match.id,
            name: `${match.firstName} ${match.lastName}`.trim(),
            companyName: match.companyName,
          }
        }
      }
    }

    return NextResponse.json({ detail, installer })
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
