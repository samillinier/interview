import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import {
  MATRIX_ROW_DEFS,
  applyMatrixCellOverrides,
  computeOnboardingMatrix,
  formatInstallerCalendarDate,
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
  updatedAt: true,
  workroom: true,
  status: true,
  complianceStatus: true,
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
  workersCompExemExpiry: true,
  workersCompExemExpiryDates: true,
  automobileLiabilityExpiryDates: true,
  llrpExpiryDates: true,
  employerLiabilityPolicyNumber: true,
  employersLiabilityExpiry: true,
  dateNullFields: true,
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

    const statusFilter = _request.nextUrl.searchParams.get('status') // 'all' | 'active' | 'qualified'

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
      cells: Record<MatrixRowId, { state: string; detail?: string; items?: string[]; dateHint?: string | string[] | null }> & {
        onboard: { state: string; detail?: string; items?: string[]; dateHint?: string | string[] | null }
      }
      hasRequiredGap: boolean
      missingRequiredCount: number
      isManual?: boolean
      isVirtual?: boolean
      trackingId: string
      photoUrl?: string | null
      status?: string | null
      matrixOverriddenColumnIds: MatrixRowId[]
      rowLabelColor?: string | null
      rowNote?: string | null
      complianceSummary?: Record<string, 'active' | 'expired' | 'required' | 'na' | 'inactive'>
    }


    const getComplianceField = (raw: any, key: string): 'active' | 'expired' | 'required' | 'na' | 'inactive' => {
      const checkDate = (dateStr: string | null | undefined): 'active' | 'expired' => {
        if (!dateStr) return 'expired'
        const d = new Date(dateStr)
        if (isNaN(d.getTime())) return 'expired'
        d.setHours(0,0,0,0)
        const now = new Date(); now.setHours(0,0,0,0)
        return d < now ? 'expired' : 'active'
      }
      const hasDocOfType = (...types: string[]) => (raw.Document || []).some((d: any) => types.includes(d?.type))
      switch (key) {
        case 'workers_comp':
          if (!raw.hasWorkersComp && !raw.hasWorkersCompExemption) return 'na'
          return hasDocOfType('workers_comp_certificate', 'workers_comp') ? checkDate(raw.workersCompExemExpiry) : 'required'
        case 'general_liability':
          if (!raw.hasGeneralLiability) return 'na'
          return hasDocOfType('liability_insurance') ? checkDate(raw.generalLiabilityExpiry) : 'required'
        case 'auto_liability':
          if (!raw.hasCommercialAutoLiability) return 'na'
          return hasDocOfType('auto_insurance') ? checkDate(raw.automobileLiabilityExpiry) : 'required'
        case 'llrp':
          return raw.llrpExpiry ? checkDate(raw.llrpExpiry) : (hasDocOfType('lrrp') ? 'active' : 'required')
        case 'btr':
          return raw.btrExpiry ? checkDate(raw.btrExpiry) : (raw.hasBusinessLicense || hasDocOfType('business_registration') ? 'active' : 'required')
        case 'lead_firm':
          return hasDocOfType('lead_firm_certificate') ? checkDate(null) : 'required'
        case 'sunbiz':
          if (raw.isSunbizRegistered === false) return 'na'
          return hasDocOfType('sunbiz') ? (raw.isSunbizActive ? 'active' : 'inactive') : 'required'
        case 'employers_liability':
          if (!raw.employerLiabilityPolicyNumber) return 'na'
          return hasDocOfType('employers_liability') ? checkDate(raw.employersLiabilityExpiry) : 'required'
        default:
          return 'required'
      }
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
      employersLiabilityExpiry: null,
      workersCompExemExpiry: null,
      workersCompExemExpiryDates: null,
      serviceAgreementSignedAt: null,
      icsSignedAt: null,
      Document: [],
      staffMemberPhotoUrls: [],
    })

    /** Extract relevant expiry dates per matrix column from installer raw data.
     *  Returns strings for single-date columns and string[] for multi-date columns. */
    const getCellDates = (raw: any): Record<string, string | string[] | null> => {
      const fmt = formatInstallerCalendarDate

      const getLatestDocExpiry = (types: string[]): string | null => {
        const docs = (raw.Document || [])
          .filter((d: any) => types.includes(d.type))
          .filter((d: any) => d.expiryDate)
          .sort((a: any, b: any) => new Date(b.expiryDate || 0).getTime() - new Date(a.expiryDate || 0).getTime())
        if (docs.length === 0) return null
        return fmt(docs[0].expiryDate)
      }

      // Parse and format all dates from a JSON date array, preserving original order
      const fmtDatesArray = (datesStr: string | null | undefined): string[] | null => {
        if (!datesStr) return null
        try {
          const arr = JSON.parse(datesStr)
          if (!Array.isArray(arr) || arr.length === 0) return null
          const formatted = arr
            .map((d: string) => formatInstallerCalendarDate(String(d || '').trim()))
            .filter((s: string | null): s is string => s !== null)
          if (formatted.length === 0) return null
          const seen = new Set<string>()
          return formatted.filter((s) => {
            if (seen.has(s)) return false
            seen.add(s)
            return true
          })
        } catch { return null }
      }

      const mergeFormattedDates = (...sources: Array<string | string[] | null | undefined>): string[] | null => {
        const seen = new Set<string>()
        const merged: string[] = []
        for (const source of sources) {
          const list = Array.isArray(source) ? source : source ? [source] : []
          for (const d of list) {
            if (!d || seen.has(d)) continue
            seen.add(d)
            merged.push(d)
          }
        }
        return merged.length > 0 ? merged : null
      }

      return {
        surface: null,
        compliance: null,
        sunbiz: getLatestDocExpiry(['sunbiz']),
        btr: fmt(raw.btrExpiry) || getLatestDocExpiry(['business_registration']),
        wc: fmt(raw.employersLiabilityExpiry) || getLatestDocExpiry(['workers_comp', 'workers_comp_certificate']),
        wce: fmtDatesArray(raw.workersCompExemExpiryDates) ?? fmt(raw.workersCompExemExpiry),
        coi: fmt(raw.generalLiabilityExpiry) || getLatestDocExpiry(['liability_insurance']),
        al: fmtDatesArray(raw.automobileLiabilityExpiryDates) ?? fmt(raw.automobileLiabilityExpiry) ?? getLatestDocExpiry(['auto_insurance']),
        w9: null,
        photo: null,
        bg: null,
        lead: getLatestDocExpiry(['lead_firm_certificate']),
        llrp: fmtDatesArray(raw.llrpExpiryDates) ?? fmt(raw.llrpExpiry) ?? getLatestDocExpiry(['lrrp']),
        ics: null,
      }
    }

    const result: InstallerRow[] = []

    const COLUMN_ID_TO_FIELD: Record<string, string> = {
      wc: 'employersLiabilityExpiry',
      wce: 'workersCompExemExpiry',
      coi: 'generalLiabilityExpiry',
      al: 'automobileLiabilityExpiry',
      btr: 'btrExpiry',
      llrp: 'llrpExpiry',
    }

    const pushCells = (m: ReturnType<typeof computeOnboardingMatrix>, dateHints?: Record<string, string | string[] | null>, dateNullFields?: string[]) => {
      const nullSet = new Set(dateNullFields || [])
      const cells = {} as InstallerRow['cells']
      for (const def of MATRIX_ROW_DEFS) {
        const c = m[def.id]
        const dateField = COLUMN_ID_TO_FIELD[def.id]
        if (dateField && nullSet.has(dateField)) {
          // Date field was explicitly NULL'd — show N/A with NULL detail
          cells[def.id] = {
            state: 'na',
            detail: 'NULL',
          }
          continue
        }
        cells[def.id] = {
          state: c.state,
          ...(c.detail ? { detail: c.detail } : {}),
          ...(Array.isArray(c.items) ? { items: c.items } : {}),
          ...(dateHints?.[def.id] ? { dateHint: dateHints[def.id] } : {}),
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
        // In "active" mode, only include tracked installers that are actually active
        if (statusFilter === 'active' && inst.status !== 'active') continue
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
          employersLiabilityExpiry: inst.employersLiabilityExpiry,
          workersCompExemExpiry: inst.workersCompExemExpiry,
          workersCompExemExpiryDates: inst.workersCompExemExpiryDates,
          serviceAgreementSignedAt: inst.serviceAgreementSignedAt,
          icsSignedAt,
          complianceStatus: inst.complianceStatus,
          Document: inst.Document,
          staffMemberPhotoUrls: activeStaffMembers.map((staff) => staff.photoUrl),
        })
        const merged = applyMatrixCellOverrides(m, t.matrixCellOverrides)
        const cellDates = getCellDates(inst)
        const nullFields = (() => {
          try {
            const raw = (inst as any).dateNullFields
            return raw ? JSON.parse(raw) : []
          } catch { return [] }
        })()
        result.push({
          id: inst.id,
          firstName: inst.firstName,
          lastName: inst.lastName,
          companyName: inst.companyName,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          workroom: inst.workroom,
          cells: pushCells(merged, cellDates, nullFields),
          hasRequiredGap: merged.hasRequiredGap,
          missingRequiredCount: merged.missingRequiredCount,
          isManual: false,
          trackingId: t.id,
          photoUrl: inst.photoUrl,
          status: inst.status,
          matrixOverriddenColumnIds: listMatrixOverrideColumnIds(t.matrixCellOverrides),
          rowLabelColor: getRowLabelColor(t.matrixCellOverrides),
          rowNote: getRowNote(t.matrixCellOverrides),
          complianceSummary: {
            workers_comp: getComplianceField(inst, 'workers_comp'),
            general_liability: getComplianceField(inst, 'general_liability'),
            auto_liability: getComplianceField(inst, 'auto_liability'),
            llrp: getComplianceField(inst, 'llrp'),
            btr: getComplianceField(inst, 'btr'),
            lead_firm: getComplianceField(inst, 'lead_firm'),
            sunbiz: getComplianceField(inst, 'sunbiz'),
            employers_liability: getComplianceField(inst, 'employers_liability'),
          },
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

    // Auto-populate: when status=active, also include all active installers
    // who aren't already in the manual tracker rows.
    if (statusFilter === 'active') {
      const alreadyTrackedInstallerIds = new Set(
        manualTrackers.filter((t) => t.installerId).map((t) => t.installerId as string)
      )

      const autoInstallers = await prisma.installer.findMany({
        where: {
          status: 'active',
          ...(alreadyTrackedInstallerIds.size > 0 ? { id: { notIn: Array.from(alreadyTrackedInstallerIds) } } : {}),
        },
        select: installerMatrixSelect,
        orderBy: { firstName: 'asc' },
      })

      if (autoInstallers.length > 0) {
        // Load primary surfaces for auto-added installers too
        const autoIds = autoInstallers.map((i) => i.id)
        const autoSurfaceMap = new Map<string, string | null>()
        try {
          const surfaceRows = await prisma.$queryRaw<{ id: string; primaryFlooringSurface: string | null }[]>(
            Prisma.sql`
              SELECT id, "primaryFlooringSurface" FROM "Installer"
              WHERE id IN (${Prisma.join(autoIds.map((id) => Prisma.sql`${id}`))})
            `
          )
          for (const row of surfaceRows) {
            autoSurfaceMap.set(row.id, row.primaryFlooringSurface)
          }
        } catch {
          // ignore
        }

        for (const inst of autoInstallers) {
          const icsSignedAt = inst.InstallerAgreement[0]?.signedAt ?? null
          const activeStaffMembers = (inst.StaffMember || []).filter(
            (staff) => String(staff.status || 'active').toLowerCase() === 'active'
          )
          const m = computeOnboardingMatrix({
            primaryFlooringSurface: autoSurfaceMap.get(inst.id) ?? primarySurfaceByInstallerId.get(inst.id) ?? null,
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
            workersCompExemExpiry: inst.workersCompExemExpiry,
            workersCompExemExpiryDates: inst.workersCompExemExpiryDates,
            serviceAgreementSignedAt: inst.serviceAgreementSignedAt,
            icsSignedAt,
            complianceStatus: inst.complianceStatus,
            Document: inst.Document,
            staffMemberPhotoUrls: activeStaffMembers.map((staff) => staff.photoUrl),
          })
          const cellDates = getCellDates(inst)
          const nullFields = (() => {
            try {
              const raw = (inst as any).dateNullFields
              return raw ? JSON.parse(raw) : []
            } catch { return [] }
          })()
          result.push({
            id: inst.id,
            firstName: inst.firstName,
            lastName: inst.lastName,
            companyName: inst.companyName,
            createdAt: inst.createdAt.toISOString(),
            updatedAt: inst.updatedAt.toISOString(),
            workroom: inst.workroom,
            cells: pushCells(m, cellDates, nullFields),
            hasRequiredGap: m.hasRequiredGap,
            missingRequiredCount: m.missingRequiredCount,
            isManual: false,
            trackingId: '', // virtual rows have no tracking row — they can't be edited inline
            photoUrl: inst.photoUrl,
            status: inst.status,
            matrixOverriddenColumnIds: [],
            rowLabelColor: null,
            rowNote: null,
            isVirtual: true,
            complianceSummary: {
              workers_comp: getComplianceField(inst, 'workers_comp'),
              general_liability: getComplianceField(inst, 'general_liability'),
              auto_liability: getComplianceField(inst, 'auto_liability'),
              llrp: getComplianceField(inst, 'llrp'),
              btr: getComplianceField(inst, 'btr'),
              lead_firm: getComplianceField(inst, 'lead_firm'),
              sunbiz: getComplianceField(inst, 'sunbiz'),
              employers_liability: getComplianceField(inst, 'employers_liability'),
            },
          })
        }
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
