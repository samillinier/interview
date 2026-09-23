import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessInvoices } from '@/lib/invoiceAccess'
import { normalizeWeeklyReportLines } from '@/lib/weeklyReport'

export const dynamic = 'force-dynamic'

const noStore = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })
    }

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive || !canAccessInvoices((admin as any).role)) {
      return NextResponse.json({ error: 'Invoice access required' }, { status: 403, headers: noStore })
    }

    const { searchParams } = new URL(request.url)
    const week = String(searchParams.get('week') || '').trim()
    const month = String(searchParams.get('month') || '').trim()
    const year = String(searchParams.get('year') || '').trim()
    const search = String(searchParams.get('search') || '').trim()

    const reports = await (prisma as any).estimatorWeeklyReport.findMany({
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            accountType: true,
            photoUrl: true,
          },
        },
      },
      orderBy: [{ weekEnding: 'desc' }, { createdAt: 'desc' }],
    })

    const filtered = reports.filter((report: any) => {
      const weekEnding = report.weekEnding instanceof Date ? report.weekEnding : new Date(report.weekEnding)
      if (!Number.isFinite(weekEnding.getTime())) return false
      const iso = weekEnding.toISOString().slice(0, 10)
      if (week && iso !== week) return false
      if (month && iso.slice(0, 7) !== month) return false
      if (year && iso.slice(0, 4) !== year) return false
      if (search) {
        const hay = [
          report.subcontractorName,
          report.Installer?.firstName,
          report.Installer?.lastName,
          report.Installer?.email,
          report.Installer?.companyName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(search.toLowerCase())) return false
      }
      return true
    })

    const invoices = filtered.map((report: any) => ({
      id: report.id,
      installerId: report.installerId,
      subcontractorName: report.subcontractorName,
      weekEnding: report.weekEnding,
      lines: normalizeWeeklyReportLines(report.lines),
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      installer: report.Installer
        ? {
            id: report.Installer.id,
            firstName: report.Installer.firstName,
            lastName: report.Installer.lastName,
            email: report.Installer.email,
            companyName: report.Installer.companyName,
            photoUrl: report.Installer.photoUrl,
          }
        : null,
    }))

    return NextResponse.json({ success: true, invoices, count: invoices.length }, { headers: noStore })
  } catch (error: any) {
    console.error('admin invoices GET failed', error)
    return NextResponse.json(
      { error: 'Failed to load invoices', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
