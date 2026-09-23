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

async function resolveParams(context: { params: Promise<{ id: string }> | { id: string } }) {
  return context.params instanceof Promise ? await context.params : context.params
}

async function requireEstimatorAccount(installerId: string) {
  const installer = await prisma.installer.findUnique({
    where: { id: installerId },
    select: { id: true, firstName: true, lastName: true, email: true, accountType: true },
  })
  if (!installer) return { ok: false as const, status: 404 as const, error: 'Not found' }
  if (String(installer.accountType || '') !== 'estimator') {
    return {
      ok: false as const,
      status: 403 as const,
      error: 'Weekly reports are only available for estimators',
    }
  }
  return { ok: true as const, installer }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: installerId } = await resolveParams(context)
    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    const estimator = await requireEstimatorAccount(installerId)
    if (!estimator.ok) {
      // Non-estimators: no weekly reports (empty for admins browsing installer profiles).
      if (estimator.status === 403) {
        return NextResponse.json({ success: true, reports: [] }, { headers: noStore })
      }
      return NextResponse.json({ error: estimator.error }, { status: estimator.status, headers: noStore })
    }

    const reports = await (prisma as any).estimatorWeeklyReport.findMany({
      where: { installerId },
      orderBy: [{ weekEnding: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ success: true, reports }, { headers: noStore })
  } catch (error: any) {
    console.error('weekly-reports GET failed', error)
    return NextResponse.json(
      { error: 'Failed to load weekly reports', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: installerId } = await resolveParams(context)
    const access = await requireInstallerOrAdmin(request, installerId)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    // Estimators only — never for regular installers.
    const estimator = await requireEstimatorAccount(installerId)
    if (!estimator.ok) {
      return NextResponse.json({ error: estimator.error }, { status: estimator.status, headers: noStore })
    }
    const installer = estimator.installer

    const body = await request.json().catch(() => ({}))
    const weekEnding = parseWeekEnding(body?.weekEnding)
    if (!weekEnding) {
      return NextResponse.json({ error: 'Week ending date is required' }, { status: 400, headers: noStore })
    }

    const defaultName = `${installer.firstName || ''} ${installer.lastName || ''}`.trim()
    const subcontractorName = String(body?.subcontractorName || defaultName || '').trim()
    if (!subcontractorName) {
      return NextResponse.json({ error: 'Subcontractor name is required' }, { status: 400, headers: noStore })
    }

    const lines = normalizeWeeklyReportLines(body?.lines)
    const hasContent = lines.some(
      (line) => line.poNumber || line.customer || line.date || line.mileage || line.total
    )
    if (!hasContent) {
      return NextResponse.json(
        { error: 'Add at least one line with PO #, customer, date, mileage, or total' },
        { status: 400, headers: noStore }
      )
    }

    const report = await (prisma as any).estimatorWeeklyReport.create({
      data: {
        installerId,
        subcontractorName,
        weekEnding,
        lines,
      },
    })

    if (access.actor === 'installer') {
      const estimatorName = `${installer.firstName || ''} ${installer.lastName || ''}`.trim() || subcontractorName
      void notifyAccountantOfWeeklyInvoice({
        installerId,
        estimatorName,
        estimatorEmail: installer.email,
        subcontractorName,
        weekEnding,
        lines,
        action: 'created',
      }).catch((err) => console.error('weekly invoice notify failed', err))
    }

    return NextResponse.json({ success: true, report }, { status: 201, headers: noStore })
  } catch (error: any) {
    console.error('weekly-reports POST failed', error)
    return NextResponse.json(
      { error: 'Failed to create weekly report', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
