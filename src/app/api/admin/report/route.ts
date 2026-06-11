import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  MATRIX_ROW_DEFS,
  computeOnboardingMatrix,
  type MatrixRowId,
} from '@/lib/onboardingMatrix'
import { getMatrixRowNote } from '@/lib/matrixTrackingOverrides'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ICS = 'independent-contractor-services-agreement'

const installerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  companyName: true,
  status: true,
  complianceStatus: true,
  primaryFlooringSurface: true,
  workersCompExemExpiry: true,
  isSunbizRegistered: true,
  isSunbizActive: true,
  hasBusinessLicense: true,
  btrExpiry: true,
  hasWorkersComp: true,
  hasWorkersCompExemption: true,
  hasGeneralLiability: true,
  generalLiabilityExpiry: true,
  hasCommercialAutoLiability: true,
  automobileLiabilityExpiry: true,
  canPassBackgroundCheck: true,
  photoUrl: true,
  paymentAccountNumber: true,
  paymentRoutingNumber: true,
  llrpExpiry: true,
  workersCompExemExpiryDates: true,
  automobileLiabilityExpiryDates: true,
  llrpExpiryDates: true,
  employerLiabilityPolicyNumber: true,
  employersLiabilityExpiry: true,
  serviceAgreementSignedAt: true,
  StaffMember: {
    select: {
      photoUrl: true,
      status: true,
    },
  },
  Document: { select: { type: true, expiryDate: true, verificationLinkStatus: true, createdAt: true } },
  InstallerAgreement: {
    where: { type: ICS },
    select: { signedAt: true },
    take: 1,
  },
} as const

type InstallerForReport = {
  id: string
  firstName: string
  lastName: string
  email: string
  companyName: string | null
  status: string
  isSunbizRegistered: boolean
  isSunbizActive: boolean
  hasBusinessLicense: boolean
  btrExpiry: Date | null
  hasWorkersComp: boolean
  hasWorkersCompExemption: boolean
  hasGeneralLiability: boolean
  generalLiabilityExpiry: Date | null
  hasCommercialAutoLiability: boolean
  automobileLiabilityExpiry: Date | null
  canPassBackgroundCheck: boolean | null
  photoUrl: string | null
  paymentAccountNumber: string | null
  paymentRoutingNumber: string | null
  llrpExpiry: Date | null
  workersCompExemExpiryDates: string | null
  automobileLiabilityExpiryDates: string | null
  employerLiabilityPolicyNumber: string | null
  employersLiabilityExpiry: Date | null
  serviceAgreementSignedAt: Date | null
  complianceStatus: string | null
  StaffMember: Array<{ photoUrl: string | null; status: string | null }>
  Document: Array<{
    type: string
    expiryDate: Date | null
    verificationLinkStatus: string | null
    createdAt: Date
  }>
  InstallerAgreement: Array<{ signedAt: Date | null }>
}

function buildReportInstallerPayload(
  inst: InstallerForReport,
  reportTrackingId: string,
  notes: string | null
) {
  const icsSignedAt = inst.InstallerAgreement[0]?.signedAt ?? null
  const activeStaffMembers = (inst.StaffMember || []).filter(
    (staff) => String(staff.status || 'active').toLowerCase() === 'active'
  )

  const m = computeOnboardingMatrix({
    primaryFlooringSurface: (inst as any).primaryFlooringSurface ?? null,
    isSunbizRegistered: inst.isSunbizRegistered,
    isSunbizActive: inst.isSunbizActive,
    hasBusinessLicense: inst.hasBusinessLicense,
    btrExpiry: inst.btrExpiry,
    hasWorkersComp: inst.hasWorkersComp,
    hasWorkersCompExemption: inst.hasWorkersCompExemption,
    hasGeneralLiability: inst.hasGeneralLiability,
    generalLiabilityExpiry: inst.generalLiabilityExpiry,
    hasCommercialAutoLiability: inst.hasCommercialAutoLiability,
    automobileLiabilityExpiry: inst.automobileLiabilityExpiry,
    canPassBackgroundCheck: inst.canPassBackgroundCheck,
    photoUrl: inst.photoUrl,
    paymentAccountNumber: inst.paymentAccountNumber,
    paymentRoutingNumber: inst.paymentRoutingNumber,
    llrpExpiry: inst.llrpExpiry,
    employersLiabilityExpiry: inst.employersLiabilityExpiry,
    workersCompExemExpiry: (inst as any).workersCompExemExpiry ?? null,
    workersCompExemExpiryDates: inst.workersCompExemExpiryDates,
    serviceAgreementSignedAt: inst.serviceAgreementSignedAt,
    icsSignedAt,
    complianceStatus: inst.complianceStatus,
    Document: inst.Document,
    staffMemberPhotoUrls: activeStaffMembers.map((s) => s.photoUrl),
  })

  const cells = {} as Record<MatrixRowId, { state: string; detail?: string }>
  for (const def of MATRIX_ROW_DEFS) {
    if (def.id === 'compliance') continue
    const c = m[def.id]
    cells[def.id] = {
      state: c.state,
      ...(c.detail ? { detail: c.detail } : {}),
    }
  }

  return {
    reportTrackingId,
    id: inst.id,
    firstName: inst.firstName,
    lastName: inst.lastName,
    email: inst.email,
    companyName: inst.companyName,
    photoUrl: inst.photoUrl,
    notes,
    status: inst.status,
    cells,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const reportRows = await prisma.installerTracking.findMany({
      where: { type: 'report_manual', installerId: { not: null } },
      orderBy: [{ matrixSortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        matrixCellOverrides: true,
        reportColumnVisibility: true,
        Installer: { select: installerSelect },
      },
    })

    const rows = MATRIX_ROW_DEFS.filter((r) => r.id !== 'compliance').map((r) => ({
      id: r.id,
      label: r.label,
      subtitle: r.subtitle,
      required: r.required,
    }))

    const installers = reportRows
      .filter((row) => row.Installer)
      .map((row) =>
        buildReportInstallerPayload(
          row.Installer as InstallerForReport,
          row.id,
          getMatrixRowNote(row.matrixCellOverrides)
        )
      )

    // Column visibility from the first report row that has it set
    const columnVisibility = (() => {
      for (const row of reportRows) {
        if (row.reportColumnVisibility) {
          try {
            const parsed = JSON.parse(row.reportColumnVisibility)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed
          } catch {}
        }
      }
      return null
    })()

    return NextResponse.json({ success: true, rows, installers, columnVisibility })
  } catch (error: any) {
    console.error('report:', error)
    return NextResponse.json(
      { error: 'Failed to load report', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { visibleColumns } = await request.json()
    if (!Array.isArray(visibleColumns)) {
      return NextResponse.json({ error: 'visibleColumns must be an array' }, { status: 400 })
    }

    const validIds = new Set(MATRIX_ROW_DEFS.filter((d) => d.id !== 'compliance').map((d) => d.id))
    const filtered = visibleColumns.filter((id: string) => validIds.has(id as MatrixRowId))

    // Save column visibility to ALL report rows so it persists per-row
    const reportRows = await prisma.installerTracking.findMany({
      where: { type: 'report_manual', installerId: { not: null } },
      select: { id: true },
    })

    await Promise.all(
      reportRows.map((row) =>
        prisma.installerTracking.update({
          where: { id: row.id },
          data: { reportColumnVisibility: JSON.stringify(filtered) },
        })
      )
    )

    return NextResponse.json({ success: true, reportColumnVisibility: filtered })
  } catch (error: any) {
    console.error('report PUT:', error)
    return NextResponse.json(
      { error: 'Failed to save column visibility', details: error.message },
      { status: 500 }
    )
  }
}
