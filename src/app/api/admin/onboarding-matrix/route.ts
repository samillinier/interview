import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  MATRIX_ROW_DEFS,
  applyMatrixCellOverrides,
  computeOnboardingMatrix,
  listMatrixOverrideColumnIds,
  type MatrixRowId,
} from '@/lib/onboardingMatrix'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

const ICS = 'independent-contractor-services-agreement'
const ROW_LABEL_KEY = '__rowLabel'
const ROW_NOTE_KEY = '__rowNote'
const ROW_LABEL_COLORS = ['gray', 'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'sky', 'blue', 'purple'] as const

function getRowLabelColor(overridesRaw: unknown): string | null {
  if (!overridesRaw || typeof overridesRaw !== 'object' || Array.isArray(overridesRaw)) return null
  const rowLabel = (overridesRaw as Record<string, unknown>)[ROW_LABEL_KEY]
  if (!rowLabel || typeof rowLabel !== 'object' || Array.isArray(rowLabel)) return null
  const color = (rowLabel as Record<string, unknown>).color
  return typeof color === 'string' && (ROW_LABEL_COLORS as readonly string[]).includes(color) ? color : null
}

function getRowNote(overridesRaw: unknown): string | null {
  if (!overridesRaw || typeof overridesRaw !== 'object' || Array.isArray(overridesRaw)) return null
  const rowNote = (overridesRaw as Record<string, unknown>)[ROW_NOTE_KEY]
  if (!rowNote || typeof rowNote !== 'object' || Array.isArray(rowNote)) return null
  const text = (rowNote as Record<string, unknown>).text
  return typeof text === 'string' && text.trim() ? text.trim() : null
}

const installerMatrixSelect = {
  id: true,
  firstName: true,
  lastName: true,
  companyName: true,
  createdAt: true,
  workroom: true,
  status: true,
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

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })

    const admin = await prisma.admin.findUnique({ where: { email } })
    const role = String((admin as any)?.role || '').toUpperCase()
    if (!admin?.isActive || (role !== 'ADMIN' && role !== 'MANAGER' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStoreHeaders })
    }

    const rows = MATRIX_ROW_DEFS.map((r) => ({
      id: r.id,
      label: r.label,
      subtitle: r.subtitle,
      required: r.required,
    }))

    type InstallerRow = {
      id: string
      firstName: string
      lastName: string
      companyName: string | null
      createdAt: string
      updatedAt: string
      workroom: string | null
      cells: Record<MatrixRowId, { state: string; detail?: string; items?: string[] }> & {
        onboard: { state: string; detail?: string; items?: string[] }
      }
      hasRequiredGap: boolean
      missingRequiredCount: number
      isManual?: boolean
      trackingId: string
      photoUrl?: string | null
      status?: string | null
      matrixOverriddenColumnIds: MatrixRowId[]
      rowLabelColor?: string | null
      rowNote?: string | null
    }

    const manualTrackers = await prisma.installerTracking.findMany({
      where: { type: 'matrix_manual' },
      orderBy: [{ matrixSortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        Installer: { select: installerMatrixSelect },
      },
    })

    /** Loaded outside the typed `select` so an outdated Prisma client (before this column) still loads the matrix. */
    const primarySurfaceByInstallerId = new Map<string, string | null>()
    const installerIdsForSurface = Array.from(
      new Set(
        manualTrackers
          .filter((row) => row.installerId && row.Installer)
          .map((row) => row.installerId as string)
      )
    )
    if (installerIdsForSurface.length > 0) {
      try {
        const surfaceRows = await prisma.$queryRaw<{ id: string; primaryFlooringSurface: string | null }[]>(
          Prisma.sql`
            SELECT id, "primaryFlooringSurface" FROM "Installer"
            WHERE id IN (${Prisma.join(installerIdsForSurface.map((id) => Prisma.sql`${id}`))})
          `
        )
        for (const row of surfaceRows) {
          primarySurfaceByInstallerId.set(row.id, row.primaryFlooringSurface)
        }
      } catch (surfaceErr) {
        console.warn('onboarding-matrix: could not load primaryFlooringSurface (migrate DB or run prisma generate)', surfaceErr)
      }
    }

    const emptyMatrix = computeOnboardingMatrix({
      primaryFlooringSurface: null,
      isSunbizRegistered: false,
      isSunbizActive: false,
      hasBusinessLicense: false,
      btrExpiry: null,
      hasWorkersComp: false,
      hasWorkersCompExemption: false,
      hasGeneralLiability: false,
      generalLiabilityExpiry: null,
      hasCommercialAutoLiability: false,
      automobileLiabilityExpiry: null,
      canPassBackgroundCheck: null,
      photoUrl: null,
      paymentAccountNumber: null,
      paymentRoutingNumber: null,
      llrpExpiry: null,
      workersCompExemExpiryDates: null,
      serviceAgreementSignedAt: null,
      icsSignedAt: null,
      Document: [],
      staffMemberPhotoUrls: [],
    })

    const result: InstallerRow[] = []

    const pushCells = (m: ReturnType<typeof computeOnboardingMatrix>) => {
      const cells = {} as InstallerRow['cells']
      for (const def of MATRIX_ROW_DEFS) {
        const c = m[def.id]
        cells[def.id] = {
          state: c.state,
          ...(c.detail ? { detail: c.detail } : {}),
          ...(Array.isArray(c.items) ? { items: c.items } : {}),
        }
      }
      cells.onboard = {
        state: m.onboard.state,
        ...(m.onboard.detail ? { detail: m.onboard.detail } : {}),
        ...(Array.isArray(m.onboard.items) ? { items: m.onboard.items } : {}),
      }
      return cells
    }

    for (const t of manualTrackers) {
      const inst = t.Installer
      if (t.installerId && inst) {
        const icsSignedAt = inst.InstallerAgreement[0]?.signedAt ?? null
        const activeStaffMembers = (inst.StaffMember || []).filter(
          (staff) => String(staff.status || 'active').toLowerCase() === 'active'
        )
        const m = computeOnboardingMatrix({
          primaryFlooringSurface: primarySurfaceByInstallerId.get(inst.id) ?? null,
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
          workersCompExemExpiryDates: inst.workersCompExemExpiryDates,
          serviceAgreementSignedAt: inst.serviceAgreementSignedAt,
          icsSignedAt,
          Document: inst.Document,
          staffMemberPhotoUrls: activeStaffMembers.map((staff) => staff.photoUrl),
        })
        const merged = applyMatrixCellOverrides(m, t.matrixCellOverrides)
        result.push({
          id: inst.id,
          firstName: inst.firstName,
          lastName: inst.lastName,
          companyName: inst.companyName,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          workroom: inst.workroom,
          cells: pushCells(merged),
          hasRequiredGap: merged.hasRequiredGap,
          missingRequiredCount: merged.missingRequiredCount,
          isManual: false,
          trackingId: t.id,
          photoUrl: inst.photoUrl,
          status: inst.status,
          matrixOverriddenColumnIds: listMatrixOverrideColumnIds(t.matrixCellOverrides),
          rowLabelColor: getRowLabelColor(t.matrixCellOverrides),
          rowNote: getRowNote(t.matrixCellOverrides),
        })
      } else {
        const meta = t.metadata as { manualInstallerName?: string } | null
        const displayName = (meta?.manualInstallerName || 'Manual entry').trim()
        const mergedManual = applyMatrixCellOverrides(emptyMatrix, t.matrixCellOverrides)
        result.push({
          id: `manual-${t.id}`,
          firstName: '',
          lastName: '',
          companyName: displayName,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          workroom: null,
          cells: pushCells(mergedManual),
          hasRequiredGap: mergedManual.hasRequiredGap,
          missingRequiredCount: mergedManual.missingRequiredCount,
          isManual: true,
          trackingId: t.id,
          matrixOverriddenColumnIds: listMatrixOverrideColumnIds(t.matrixCellOverrides),
          rowLabelColor: getRowLabelColor(t.matrixCellOverrides),
          rowNote: getRowNote(t.matrixCellOverrides),
        })
      }
    }

    return NextResponse.json(
      { success: true, rows, installers: result },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error('onboarding-matrix:', error)
    return NextResponse.json(
      { error: 'Failed to load onboarding matrix', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
