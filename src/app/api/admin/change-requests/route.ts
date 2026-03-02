import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

type DiffItem = {
  field: string
  from: any
  to: any
}

function normalizeComparableValue(val: any): any {
  if (val === undefined) return undefined
  if (val === null) return null
  if (typeof val === 'string') return val.trim()
  if (val instanceof Date) return val.toISOString()
  return val
}

function isEqualForDiff(proposed: any, current: any): boolean {
  const a = normalizeComparableValue(proposed)
  const b = normalizeComparableValue(current)

  if (typeof a === 'string' && current instanceof Date) {
    const d = new Date(a)
    if (!Number.isNaN(d.getTime())) return d.toISOString() === current.toISOString()
  }

  return Object.is(a, b)
}

function toSerializable(val: any): any {
  if (val instanceof Date) return val.toISOString()
  return val
}

function getSectionsFromFields(fields: string[]): string[] {
  const sections = new Set<string>()

  const profileFields = new Set([
    'firstName',
    'lastName',
    'phone',
    'digitalId',
    'workroom',
    'vehicleDescription',
    'companyName',
    'companyTitle',
    'companyStreetAddress',
    'companyCity',
    'companyState',
    'companyZipCode',
    'companyCounty',
    'companyAddress',
    'yearsOfExperience',
    'hasOwnCrew',
    'crewSize',
    'hasOwnTools',
    'toolsDescription',
    'hasVehicle',
    'willingToTravel',
    'maxTravelDistance',
    'canStartImmediately',
    'preferredStartDate',
    'availability',
    'mondayToFridayAvailability',
    'saturdayAvailability',
    'wantsToAddCarpet',
    'installsStretchInCarpet',
    'dailyStretchInCarpetSqft',
    'installsGlueDownCarpet',
    'wantsToAddHardwood',
    'installsNailDownSolidHardwood',
    'dailyNailDownSolidHardwoodSqft',
    'installsStapleDownEngineeredHardwood',
    'wantsToAddLaminate',
    'dailyLaminateSqft',
    'installsLaminateOnStairs',
    'wantsToAddVinyl',
    'installsSheetVinyl',
    'installsLuxuryVinylPlank',
    'dailyLuxuryVinylPlankSqft',
    'installsLuxuryVinylTile',
    'installsVinylCompositionTile',
    'dailyVinylCompositionTileSqft',
    'wantsToAddTile',
    'installsCeramicTile',
    'dailyCeramicTileSqft',
    'installsPorcelainTile',
    'dailyPorcelainTileSqft',
    'installsStoneTile',
    'dailyStoneTileSqft',
    'offersTileRemoval',
    'installsTileBacksplash',
    'dailyTileBacksplashSqft',
    'movesFurniture',
    'installsTrim',
  ])

  const insuranceFields = new Set([
    'hasInsurance',
    'insuranceType',
    'hasGeneralLiability',
    'hasCommercialAutoLiability',
    'hasWorkersComp',
    'hasWorkersCompExemption',
    'isSunbizRegistered',
    'isSunbizActive',
    'hasBusinessLicense',
    'feiEin',
    'employerLiabilityPolicyNumber',
  ])

  const expiryFields = new Set([
    'llrpExpiry',
    'btrExpiry',
    'workersCompExemExpiryDates',
    'workersCompExemExpiry',
    'generalLiabilityExpiry',
    'automobileLiabilityExpiryDates',
    'automobileLiabilityExpiry',
    'employersLiabilityExpiry',
  ])

  const licenseFields = new Set([
    'hasLicense',
    'licenseNumber',
    'licenseExpiry',
    'canPassBackgroundCheck',
    'backgroundCheckDetails',
  ])

  for (const field of fields) {
    if (profileFields.has(field)) sections.add('Profile Information')
    else if (insuranceFields.has(field)) sections.add('Insurance & Registration')
    else if (expiryFields.has(field)) sections.add('Insurance & Certificate Expiry Dates')
    else if (licenseFields.has(field)) sections.add('License & Background Check')
  }

  return Array.from(sections)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const take = Math.min(parseInt(searchParams.get('take') || '50', 10) || 50, 200)

    const requests = await prisma.installerChangeRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
      },
    })

    // For display: prune payload to only fields that actually differ from current installer state.
    // This fixes older requests created before the diff logic existed (they may include tons of no-op keys).
    const installerIds = Array.from(new Set(requests.map((r) => r.installerId))).filter(Boolean)
    const installers = await prisma.installer.findMany({
      where: { id: { in: installerIds } },
    })
    const installerMap = new Map<string, any>()
    for (const i of installers) installerMap.set(i.id, i)

    // Preload staff members for update_staff diffs (Team Members changes)
    const staffIdsToLoad = Array.from(
      new Set(
        requests
          .map((r: any) => {
            const payload = (r.payload || {}) as any
            if (payload?.action === 'update_staff' && payload?.staffId) return String(payload.staffId)
            return null
          })
          .filter(Boolean)
      )
    ) as string[]
    const staffMembers = staffIdsToLoad.length
      ? await prisma.staffMember.findMany({ where: { id: { in: staffIdsToLoad } } })
      : []
    const staffMap = new Map<string, any>()
    for (const s of staffMembers) staffMap.set(s.id, s)

    const normalizedRequests = requests.map((r: any) => {
      const payload = (r.payload || {}) as Record<string, any>
      // Staff change requests use a different payload shape; don't try to diff those against Installer columns.
      if (payload && typeof payload === 'object' && typeof (payload as any).action === 'string') {
        const staffAction = String((payload as any).action)
        const diffs: DiffItem[] = []

        if (staffAction === 'approve_agreement') {
          const title = (payload as any).title || (payload as any).agreementType || 'Agreement'
          diffs.push({ field: `agreement.${String((payload as any).agreementType || 'document')}`, from: 'Not submitted', to: `Pending admin approval: ${title}` })
          return {
            ...r,
            diffs,
          }
        }

        if (staffAction === 'create_staff' && (payload as any).staffData) {
          const staffData = (payload as any).staffData as Record<string, any>
          for (const [k, v] of Object.entries(staffData)) {
            diffs.push({ field: `staff.${k}`, from: null, to: toSerializable(v) })
          }
        } else if (staffAction === 'update_staff' && (payload as any).staffId && (payload as any).staffData) {
          const staffId = String((payload as any).staffId)
          const currentStaff = staffMap.get(staffId)
          const staffData = (payload as any).staffData as Record<string, any>
          if (currentStaff) {
            for (const [k, v] of Object.entries(staffData)) {
              const currentVal = (currentStaff as any)[k]
              if (!isEqualForDiff(v, currentVal)) {
                diffs.push({ field: `staff.${k}`, from: toSerializable(currentVal), to: toSerializable(v) })
              }
            }
          } else {
            // Fallback: show proposed values only if we can't find the staff record
            for (const [k, v] of Object.entries(staffData)) {
              diffs.push({ field: `staff.${k}`, from: undefined, to: toSerializable(v) })
            }
          }
        } else if (staffAction === 'delete_staff' && (payload as any).staffData) {
          const staffData = (payload as any).staffData as Record<string, any>
          for (const [k, v] of Object.entries(staffData)) {
            diffs.push({ field: `staff.${k}`, from: toSerializable(v), to: null })
          }
        }

        return {
          ...r,
          diffs,
        }
      }

      const inst = installerMap.get(r.installerId)
      if (!inst) return r

      const pruned: Record<string, any> = {}
      for (const [k, v] of Object.entries(payload)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const currentVal = (inst as any)[k]
        if (!isEqualForDiff(v, currentVal)) pruned[k] = v
      }

      const diffs: DiffItem[] = Object.entries(pruned).map(([k, v]) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const currentVal = (inst as any)[k]
        return {
          field: k,
          from: toSerializable(currentVal),
          to: toSerializable(v),
        }
      })

      const sections = getSectionsFromFields(Object.keys(pruned))
      return {
        ...r,
        payload: pruned,
        diffs,
        sections: sections.length > 0 ? sections : r.sections,
      }
    })

    return NextResponse.json({ success: true, requests: normalizedRequests })
  } catch (error: any) {
    console.error('Error fetching change requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change requests', details: error.message },
      { status: 500 }
    )
  }
}

