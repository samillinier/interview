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

    // Cilio sometimes returns 200 with an error string like "Error getting order 123."
    if (typeof detail === 'string') {
      const isNotFound = detail.toLowerCase().includes('error getting order')
      return NextResponse.json(
        {
          error: isNotFound ? 'Job not found in Cilio' : 'Cilio returned an unexpected response',
          code: isNotFound ? 'NOT_FOUND' : 'NO_DETAIL',
          detail: null,
        },
        { status: isNotFound ? 404 : 502 }
      )
    }

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
        (record.Installer ? `${record.Installer.firstName} ${record.Installer.lastName}`.trim() : null) ||
        ''
      installer = {
        id: record.installerId ?? '',
        name,
        companyName: record.Installer?.companyName ?? null,
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
    const isNotFound = errorMsg.includes("404") || errorMsg.includes("not found")
    return NextResponse.json(
      {
        error: isNotFound ? "Job not found in Cilio" : "Failed to load job detail",
        code: isNotFound ? "NOT_FOUND" : "NO_DETAIL",
        detail: null,
      },
      { status: isNotFound ? 404 : 502 }
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
