import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireInstallerOrAdmin } from '@/lib/installerAccess'
import {
  normalizeWeeklyReportLines,
  parseWeekEnding,
} from '@/lib/weeklyReport'
import { notifyAccountantOfWeeklyInvoice } from '@/lib/weeklyInvoiceNotify'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

async function resolveParams(
  context: { params: Promise<{ id: string; reportId: string }> | { id: string; reportId: string } }
) {
  return context.params instanceof Promise ? await context.params : context.params
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; reportId: string }> | { id: string; reportId: string } }
) {
  try {
    const { id: installerId, reportId } = await resolveParams(context)
    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    const account = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { firstName: true, lastName: true, email: true, accountType: true },
    })
    if (String(account?.accountType || '') !== 'estimator') {
      return NextResponse.json(
        { error: 'Weekly reports are only available for estimators' },
        { status: 403, headers: noStore }
      )
    }

    const existing = await (prisma as any).estimatorWeeklyReport.findFirst({
      where: { id: reportId, installerId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404, headers: noStore })
    }

    const body = await request.json().catch(() => ({}))
    const data: Record<string, unknown> = {}

    if (body?.subcontractorName !== undefined) {
      const name = String(body.subcontractorName || '').trim()
      if (!name) {
        return NextResponse.json({ error: 'Subcontractor name is required' }, { status: 400, headers: noStore })
      }
      data.subcontractorName = name
    }

    if (body?.weekEnding !== undefined) {
      const weekEnding = parseWeekEnding(body.weekEnding)
      if (!weekEnding) {
        return NextResponse.json({ error: 'Week ending date is required' }, { status: 400, headers: noStore })
      }
      data.weekEnding = weekEnding
    }

    if (body?.lines !== undefined) {
      data.lines = normalizeWeeklyReportLines(body.lines)
    }

    const report = await (prisma as any).estimatorWeeklyReport.update({
      where: { id: reportId },
      data,
    })

    if (access.actor === 'installer') {
      const estimatorName =
        `${account?.firstName || ''} ${account?.lastName || ''}`.trim() ||
        String(report.subcontractorName || 'Estimator')
      void notifyAccountantOfWeeklyInvoice({
        installerId,
        estimatorName,
        estimatorEmail: account?.email,
        subcontractorName: String(report.subcontractorName || estimatorName),
        weekEnding: report.weekEnding,
        lines: normalizeWeeklyReportLines(report.lines),
        action: 'updated',
      }).catch((err) => console.error('weekly invoice notify failed', err))
    }

    return NextResponse.json({ success: true, report }, { headers: noStore })
  } catch (error: any) {
    console.error('weekly-reports PATCH failed', error)
    return NextResponse.json(
      { error: 'Failed to update weekly report', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; reportId: string }> | { id: string; reportId: string } }
) {
  try {
    const { id: installerId, reportId } = await resolveParams(context)
    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    if (access.actor === 'admin') {
      const role = String((access.admin as any)?.role || '').toUpperCase()
      if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can delete invoices' },
          { status: 403, headers: noStore }
        )
      }
    }

    const account = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { accountType: true },
    })
    if (String(account?.accountType || '') !== 'estimator') {
      return NextResponse.json(
        { error: 'Weekly reports are only available for estimators' },
        { status: 403, headers: noStore }
      )
    }

    if (!reportId || !String(reportId).trim()) {
      return NextResponse.json({ error: 'Invoice id is required' }, { status: 400, headers: noStore })
    }

    const existing = await (prisma as any).estimatorWeeklyReport.findFirst({
      where: { id: reportId, installerId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404, headers: noStore })
    }

    await (prisma as any).estimatorWeeklyReport.delete({ where: { id: reportId } })
    return NextResponse.json({ success: true }, { headers: noStore })
  } catch (error: any) {
    console.error('weekly-reports DELETE failed', error)
    return NextResponse.json(
      { error: 'Failed to delete weekly report', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
