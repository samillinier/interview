import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateUniqueReferralCode } from '@/lib/referrals'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { extractLikelyPhone } from '@/lib/phone'
import { FLOORING_SURFACE_OPTIONS } from '@/lib/questions'

export const dynamic = 'force-dynamic'

function normalizePrimaryFlooringSurface(value: unknown): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null

  const allowed = FLOORING_SURFACE_OPTIONS as readonly string[]
  const exact = allowed.find((surface) => surface.toLowerCase() === raw.toLowerCase())
  if (exact) return exact

  const lower = raw.toLowerCase()
  if (/\blvp\b|luxury\s+vinyl\s+plank/.test(lower)) return 'LVP (Luxury Vinyl Plank)'
  if (/\blvt\b|luxury\s+vinyl\s+tile/.test(lower)) return 'LVT (Luxury Vinyl Tile)'
  if (/\bvct\b|vinyl\s+composition\s+tile/.test(lower)) return 'VCT (Vinyl Composition Tile)'
  if (lower.includes('vinyl')) return 'LVP (Luxury Vinyl Plank)'
  if (lower.includes('carpet tile')) return 'Carpet Tile'
  if (lower.includes('carpet')) return 'Carpet'
  if (lower.includes('engineered') && lower.includes('hardwood')) return 'Engineered Hardwood'
  if (lower.includes('hardwood')) return 'Hardwood'
  if (lower.includes('laminate')) return 'Laminate'
  if (lower.includes('porcelain')) return 'Porcelain Tile'
  if (lower.includes('ceramic')) return 'Ceramic Tile'
  if (lower.includes('stone')) return 'Stone Tile'
  if (lower.includes('bamboo')) return 'Bamboo'

  return null
}

function parseFlooringSkills(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v || '').trim()).filter(Boolean)
  if (typeof value !== 'string') return []
  const raw = value.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map((v) => String(v || '').trim()).filter(Boolean)
  } catch {
    // fall through to CSV-ish parsing
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function surfaceFromMatrixCellOverrides(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const surfaceCell = (value as Record<string, unknown>).surface
  if (!surfaceCell || typeof surfaceCell !== 'object' || Array.isArray(surfaceCell)) return null
  return normalizePrimaryFlooringSurface((surfaceCell as Record<string, unknown>).detail)
}

export async function GET(request: NextRequest) {
  try {
    const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const
    // Require authenticated dashboard user (Admin or Moderator) for installer list
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStore })

    let admin = (await prisma.admin.findUnique({
      where: { email },
    })) as any

    // If the user has a valid dashboard session but no Admin row yet, create it.
    // This prevents "empty installer search" for newly provisioned dashboard users.
    if (!admin) {
      const sessionRole = String((session?.user as any)?.role || '').toUpperCase()
      const canProvision = sessionRole === 'ADMIN' || sessionRole === 'MANAGER' || sessionRole === 'MODERATOR'
      if (canProvision) {
        try {
          admin = await prisma.admin.upsert({
            where: { email },
            update: { isActive: true, role: sessionRole === 'MANAGER' ? 'MANAGER' : sessionRole === 'MODERATOR' ? 'MODERATOR' : 'ADMIN' },
            create: {
              email,
              isActive: true,
              role: sessionRole === 'MANAGER' ? 'MANAGER' : sessionRole === 'MODERATOR' ? 'MODERATOR' : 'ADMIN',
              createdBy: 'system_session_provision',
            },
          })
        } catch (e) {
          console.error('Failed to provision Admin record for installer list:', e)
        }
      }
    }

    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403, headers: noStore })

    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const experience = searchParams.get('experience')
    const state = searchParams.get('state')
    const skill = searchParams.get('skill')
    const surface = searchParams.get('surface')
    const certificateRisk = searchParams.get('certificateRisk')
    const workroom = searchParams.get('workroom')
    const county = searchParams.get('county')
    const specialty = searchParams.get('specialty')
    const location = searchParams.get('location')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}
    let searchTokens: string[] = []

    // Moderators can ONLY see "Qualified" + "Pending" + "Not Qualified" installers
    // (status in ["qualified", "passed", "pending", "failed"])
    if (admin.role === 'MODERATOR') {
      // For moderators, always restrict to accessible statuses
      const moderatorStatuses = ['qualified', 'passed', 'pending', 'failed']
      
      // If a specific status filter is provided and it's valid for moderators, filter by it
      if (status && status !== 'all' && moderatorStatuses.includes(status)) {
        // Treat "qualified" as a group (qualified + passed) since both represent qualified installers in the UI.
        if (status === 'qualified') where.status = { in: ['qualified', 'passed'] }
        else where.status = status
      } else {
        // Otherwise, show all accessible statuses
        where.status = { in: moderatorStatuses }
      }
    } else if (status && status !== 'all') {
      // Treat "qualified" as a group (qualified + passed) since both represent qualified installers in the UI.
      if (status === 'qualified') where.status = { in: ['qualified', 'passed'] }
      else where.status = status
    }

    if (search) {
      const trimmed = search.trim()
      const tokens = trimmed.split(/\s+/).filter(Boolean)
      searchTokens = tokens.length > 0 ? tokens : trimmed ? [trimmed] : []

      /** One search term may appear in first name, last name, email, etc. */
      const matchesToken = (token: string) => ({
        OR: [
          { firstName: { contains: token, mode: 'insensitive' as const } },
          { lastName: { contains: token, mode: 'insensitive' as const } },
          { email: { contains: token, mode: 'insensitive' as const } },
          { phone: { contains: token, mode: 'insensitive' as const } },
          { companyName: { contains: token, mode: 'insensitive' as const } },
          {
            StaffMember: {
              some: {
                OR: [
                  { firstName: { contains: token, mode: 'insensitive' as const } },
                  { lastName: { contains: token, mode: 'insensitive' as const } },
                  { email: { contains: token, mode: 'insensitive' as const } },
                  { phone: { contains: token, mode: 'insensitive' as const } },
                  { title: { contains: token, mode: 'insensitive' as const } },
                ],
              },
            },
          },
        ],
      })

      if (tokens.length <= 1) {
        const token = tokens[0] ?? trimmed
        where.OR = matchesToken(token).OR
      } else {
        // Full name search: every word must match somewhere (e.g. "Maria da Silva").
        where.AND = [...(where.AND || []), ...tokens.map(matchesToken)]
      }
    }

    if (experience && experience !== 'all') {
      const normalizedExperience = experience.trim().toLowerCase()
      const numericParts = normalizedExperience.match(/\d+/g)?.map(Number) || []
      const hasPlus = normalizedExperience.includes('+')
      const [min, max] = numericParts

      if (Number.isFinite(min) && Number.isFinite(max)) {
        where.yearsOfExperience = { gte: min, lte: max }
      } else if (Number.isFinite(min) && hasPlus) {
        where.yearsOfExperience = { gte: min }
      }
    }

    if (specialty && specialty !== 'all') {
      where.flooringSpecialties = { contains: specialty }
    }

    if (location && location !== 'all') {
      where.serviceAreas = { contains: location }
    }

    if (state && state !== 'all') {
      where.companyState = { equals: state, mode: 'insensitive' }
    }

    if (workroom && workroom !== 'all') {
      where.workroom = { equals: workroom, mode: 'insensitive' }
    }

    if (county && county !== 'all') {
      where.companyCounty = { equals: county, mode: 'insensitive' }
    }

    if (surface && surface !== 'all') {
      const normalizedSurface = normalizePrimaryFlooringSurface(surface)
      if (normalizedSurface) {
        where.primaryFlooringSurface = { equals: normalizedSurface }
      } else {
        // If surface param is not recognized, return an empty result set (avoid confusing partial matches).
        where.primaryFlooringSurface = { equals: '__invalid_surface__' }
      }
    }

    if (skill && skill !== 'all') {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { flooringSkills: { contains: skill, mode: 'insensitive' } },
            { flooringSpecialties: { contains: skill, mode: 'insensitive' } },
          ],
        },
      ]
    }

    if (certificateRisk && certificateRisk !== 'all') {
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      const expiryFields = [
        'llrpExpiry',
        'btrExpiry',
        'workersCompExemExpiry',
        'generalLiabilityExpiry',
        'automobileLiabilityExpiry',
        'employersLiabilityExpiry',
        'licenseExpiry',
      ]

      let riskOrConditions: any[] = []

      if (certificateRisk === 'expired') {
        riskOrConditions = expiryFields.map((field) => ({ [field]: { lte: now } }))
      } else if (certificateRisk === 'expiring30') {
        riskOrConditions = expiryFields.map((field) => ({ [field]: { gt: now, lte: thirtyDaysFromNow } }))
      } else if (certificateRisk === 'expiring60') {
        riskOrConditions = expiryFields.map((field) => ({ [field]: { gt: now, lte: sixtyDaysFromNow } }))
      }

      if (riskOrConditions.length > 0) {
        where.AND = [
          ...(where.AND || []),
          { OR: riskOrConditions },
        ]
      }
    }

    // Get total count
    const total = await prisma.installer.count({ where })

    // Get installers
    const installers = await prisma.installer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Backfill missing phone values from interview contact answers.
    const missingPhoneInstallerIds = installers
      .filter((installer) => !installer.phone)
      .map((installer) => installer.id)

    if (missingPhoneInstallerIds.length > 0) {
      try {
        const responses = await prisma.interviewResponse.findMany({
          where: {
            questionId: 'contact',
            Interview: {
              installerId: { in: missingPhoneInstallerIds },
            },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            answerText: true,
            Interview: {
              select: { installerId: true },
            },
          },
        })

        const phoneByInstallerId = new Map<string, string>()
        for (const response of responses) {
          const installerId = response.Interview.installerId
          if (phoneByInstallerId.has(installerId)) continue
          const inferred = extractLikelyPhone(String(response.answerText || ''))
          if (inferred) phoneByInstallerId.set(installerId, inferred)
        }

        if (phoneByInstallerId.size > 0) {
          const updates = Array.from(phoneByInstallerId.entries()).map(([installerId, phone]) =>
            prisma.installer.update({
              where: { id: installerId },
              data: { phone },
            })
          )
          await prisma.$transaction(updates)

          for (const installer of installers) {
            const inferred = phoneByInstallerId.get(installer.id)
            if (inferred) installer.phone = inferred
          }
        }
      } catch (error) {
        console.error('Failed to backfill phones in installer list:', error)
      }
    }

    // Backfill missing primary surface values from the saved interview answer.
    // Older interviews can have the answer in InterviewResponse while Installer.primaryFlooringSurface is blank.
    const missingSurfaceInstallerIds = installers
      .filter((installer) => !installer.primaryFlooringSurface)
      .map((installer) => installer.id)

    if (missingSurfaceInstallerIds.length > 0) {
      try {
        const responses = await prisma.interviewResponse.findMany({
          where: {
            questionId: 'primary_surface',
            Interview: {
              installerId: { in: missingSurfaceInstallerIds },
            },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            answerText: true,
            Interview: {
              select: { installerId: true },
            },
          },
        })

        const surfaceByInstallerId = new Map<string, string>()
        for (const response of responses) {
          const installerId = response.Interview.installerId
          if (surfaceByInstallerId.has(installerId)) continue
          const surface = normalizePrimaryFlooringSurface(response.answerText)
          if (surface) surfaceByInstallerId.set(installerId, surface)
        }

        // Tracking matrix can hold an admin-selected Surface override even when the installer profile is blank.
        const matrixRows = await prisma.installerTracking.findMany({
          where: {
            type: 'matrix_manual',
            installerId: { in: missingSurfaceInstallerIds },
          },
          orderBy: [{ matrixSortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            installerId: true,
            matrixCellOverrides: true,
          },
        })
        for (const row of matrixRows) {
          const installerId = row.installerId
          if (!installerId || surfaceByInstallerId.has(installerId)) continue
          const surface = surfaceFromMatrixCellOverrides(row.matrixCellOverrides)
          if (surface) surfaceByInstallerId.set(installerId, surface)
        }

        // Final fallback: if they never answered primary_surface, derive from their flooringSkills list (first skill).
        for (const installer of installers) {
          if (surfaceByInstallerId.has(installer.id)) continue
          if (!missingSurfaceInstallerIds.includes(installer.id)) continue
          const skills = parseFlooringSkills((installer as any).flooringSkills)
          const first = skills.find(Boolean)
          const surface = normalizePrimaryFlooringSurface(first)
          if (surface) surfaceByInstallerId.set(installer.id, surface)
        }

        if (surfaceByInstallerId.size > 0) {
          const updates = Array.from(surfaceByInstallerId.entries()).map(([installerId, primaryFlooringSurface]) =>
            prisma.installer.update({
              where: { id: installerId },
              data: { primaryFlooringSurface },
            })
          )
          await prisma.$transaction(updates)

          for (const installer of installers) {
            const inferred = surfaceByInstallerId.get(installer.id)
            if (inferred) installer.primaryFlooringSurface = inferred
          }
        }
      } catch (error) {
        console.error('Failed to backfill primary flooring surface in installer list:', error)
      }
    }

    const installerIds = installers.map((installer) => installer.id)
    const [documents, staffMembers] =
      installerIds.length > 0
        ? await Promise.all([
            prisma.document.findMany({
              where: { installerId: { in: installerIds } },
              select: { installerId: true, type: true },
            }),
            prisma.staffMember.findMany({
              where: { installerId: { in: installerIds } },
              select: {
                id: true,
                installerId: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                photoUrl: true,
                title: true,
              },
            }),
          ])
        : [[], []]

    const documentTypesByInstallerId = new Map<string, Set<string>>()
    for (const document of documents) {
      const set = documentTypesByInstallerId.get(document.installerId) || new Set<string>()
      set.add(String(document.type || ''))
      documentTypesByInstallerId.set(document.installerId, set)
    }

    const staffCountByInstallerId = new Map<string, number>()
    for (const staff of staffMembers) {
      staffCountByInstallerId.set(staff.installerId, (staffCountByInstallerId.get(staff.installerId) || 0) + 1)
    }

    const matchedStaffByInstallerId = new Map<string, any>()
    if (searchTokens.length > 0) {
      const staffMatchesToken = (staff: any, token: string) => {
        const normalizedToken = token.toLowerCase()
        return [staff.firstName, staff.lastName, staff.email, staff.phone, staff.title]
          .map((value) => String(value || '').toLowerCase())
          .some((value) => value.includes(normalizedToken))
      }

      for (const staff of staffMembers) {
        if (matchedStaffByInstallerId.has(staff.installerId)) continue
        if (searchTokens.every((token) => staffMatchesToken(staff, token))) {
          matchedStaffByInstallerId.set(staff.installerId, {
            id: staff.id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            photoUrl: staff.photoUrl,
            title: staff.title,
          })
        }
      }
    }

    const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
    const calculateProfileCompletionPercent = (installer: any) => {
      const documentTypes = documentTypesByInstallerId.get(installer.id) || new Set<string>()
      const hasDoc = (type: string) => documentTypes.has(type)
      const coreProfileComplete =
        hasText(installer.firstName) &&
        hasText(installer.lastName) &&
        hasText(installer.phone) &&
        (hasText(installer.companyName) || hasText(installer.companyAddress)) &&
        hasText(installer.companyStreetAddress) &&
        hasText(installer.companyCity) &&
        hasText(installer.companyState) &&
        hasText(installer.companyZipCode)

      const items = [
        { points: 50, earned: true },
        { points: 10, earned: Boolean(installer.photoUrl) },
        { points: 10, earned: coreProfileComplete },
        { points: 5, earned: Boolean(installer.isSunbizActive || installer.isSunbizRegistered || hasDoc('sunbiz')) },
        { points: 10, earned: hasDoc('liability_insurance') || Boolean(installer.hasGeneralLiability) },
        { points: 5, earned: hasDoc('workers_comp_certificate') || Boolean(installer.hasWorkersCompExemption) },
        { points: 5, earned: hasDoc('workers_comp') || Boolean(installer.hasWorkersComp) },
        { points: 5, earned: (staffCountByInstallerId.get(installer.id) || 0) > 0 },
      ]

      const earnedPoints = items.reduce((sum, item) => sum + (item.earned ? item.points : 0), 0)
      const totalPoints = items.reduce((sum, item) => sum + item.points, 0)
      return totalPoints > 0 ? Math.min(Math.round((earnedPoints / totalPoints) * 100), 100) : 0
    }

    const adminRole = String(admin.role || '').toUpperCase()
    const installersWithCompletion = installers.map((installer) => ({
      ...installer,
      remarks: adminRole === 'MANAGER' ? null : installer.remarks,
      matchedStaffMember: matchedStaffByInstallerId.get(installer.id) || null,
      profileCompletionPercent: calculateProfileCompletionPercent(installer),
    }))

    return NextResponse.json({
      installers: installersWithCompletion,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { headers: noStore })
  } catch (error: any) {
    console.error('Error fetching installers:', error)
    console.error('Error details:', error.message, error.stack)
    return NextResponse.json(
      { error: 'Failed to fetch installers', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const parseDate = (value: unknown): Date | null => {
      if (typeof value !== 'string') return null
      const s = value.trim()
      if (!s) return null
      const d = new Date(s)
      return Number.isNaN(d.getTime()) ? null : d
    }

    const parseDateArray = (value: unknown): string[] => {
      let raw: unknown[] = []
      if (Array.isArray(value)) raw = value
      else if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) raw = parsed
        } catch {
          raw = []
        }
      }

      const toYMDUTC = (d: Date) => {
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        return `${y}-${m}-${dd}`
      }

      const cleaned = raw
        .filter((v) => typeof v === 'string')
        .map((v) => (v as string).trim())
        .filter(Boolean)
        .map((v) => {
          // If already date-only, keep it (prevents timezone shifts)
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v
          const d = new Date(v)
          if (Number.isNaN(d.getTime())) return null
          return toYMDUTC(d)
        })
        .filter(Boolean) as string[]

      const uniq = Array.from(new Set(cleaned))
      uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      return uniq
    }

    const autoLiabilityDates = parseDateArray(data.automobileLiabilityExpiryDates)
    const earliestAutoLiability = autoLiabilityDates.length > 0 ? autoLiabilityDates[0] : null

    const workersCompCertDates = parseDateArray(data.workersCompExemExpiryDates)
    const earliestWorkersCompCert = workersCompCertDates.length > 0 ? workersCompCertDates[0] : null

    const llrpDates = parseDateArray((data as any).llrpExpiryDates ?? data.llrpExpiry)
    const earliestLLRP = llrpDates.length > 0 ? llrpDates[0] : null

    const normalizedEmail = String(data.email || '').trim().toLowerCase()
    const installerCreateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: normalizedEmail,
        phone: data.phone,
        digitalId: data.digitalId ?? null,
        workroom: data.workroom ?? null,
        status: data.status || 'pending',
        // Company Information
        companyName: data.companyName,
        companyTitle: data.companyTitle,
        companyStreetAddress: data.companyStreetAddress,
        companyCity: data.companyCity,
        companyState: data.companyState,
        companyZipCode: data.companyZipCode,
        companyCounty: data.companyCounty ?? null,
        companyAddress: data.companyAddress,
        // Experience & Skills
        yearsOfExperience: data.yearsOfExperience,
        flooringSpecialties: data.flooringSpecialties,
        flooringSkills: data.flooringSkills,
        previousEmployers: data.previousEmployers,
        serviceAreas: data.serviceAreas,
        hasOwnCrew: data.hasOwnCrew ?? false,
        crewSize: data.crewSize,
        // Insurance & Registration
        hasInsurance: data.hasInsurance ?? false,
        insuranceType: data.insuranceType,
        hasLicense: data.hasLicense ?? false,
        licenseNumber: data.licenseNumber,
        licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry) : null,
        hasGeneralLiability: data.hasGeneralLiability ?? false,
        hasCommercialAutoLiability: data.hasCommercialAutoLiability ?? false,
        hasWorkersComp: data.hasWorkersComp ?? false,
        hasWorkersCompExemption: data.hasWorkersCompExemption ?? false,
        isSunbizRegistered: data.isSunbizRegistered ?? false,
        isSunbizActive: data.isSunbizActive ?? false,
        hasBusinessLicense: data.hasBusinessLicense ?? false,
        feiEin: data.feiEin,
        employerLiabilityPolicyNumber: data.employerLiabilityPolicyNumber,
        // Background Check
        canPassBackgroundCheck: data.canPassBackgroundCheck ?? null,
        backgroundCheckDetails: data.backgroundCheckDetails,
        // Insurance & Certificate Expiry Dates
        llrpExpiryDates: llrpDates.length > 0 ? JSON.stringify(llrpDates) : null,
        llrpExpiry: earliestLLRP ? new Date(earliestLLRP) : parseDate(data.llrpExpiry),
        btrExpiry: parseDate(data.btrExpiry),
        workersCompExemExpiryDates: workersCompCertDates.length > 0 ? JSON.stringify(workersCompCertDates) : null,
        workersCompExemExpiry: earliestWorkersCompCert ? new Date(earliestWorkersCompCert) : parseDate(data.workersCompExemExpiry),
        generalLiabilityExpiry: parseDate(data.generalLiabilityExpiry),
        automobileLiabilityExpiryDates: autoLiabilityDates.length > 0 ? JSON.stringify(autoLiabilityDates) : null,
        automobileLiabilityExpiry: earliestAutoLiability ? new Date(earliestAutoLiability) : parseDate(data.automobileLiabilityExpiry),
        employersLiabilityExpiry: parseDate(data.employersLiabilityExpiry),
        // Tools & Equipment
        hasOwnTools: data.hasOwnTools ?? false,
        toolsDescription: data.toolsDescription,
        hasVehicle: data.hasVehicle ?? false,
        vehicleDescription: data.vehicleDescription,
        // Travel & Availability
        openToTravel: data.openToTravel ?? false,
        willingToTravel: data.willingToTravel ?? false,
        maxTravelDistance: data.maxTravelDistance,
        travelLocations: data.travelLocations,
        canStartImmediately: data.canStartImmediately ?? false,
        preferredStartDate: data.preferredStartDate ? new Date(data.preferredStartDate) : null,
        mondayToFridayAvailability: data.mondayToFridayAvailability,
        saturdayAvailability: data.saturdayAvailability,
        availability: data.availability,
        // Carpet Installation
        wantsToAddCarpet: data.wantsToAddCarpet,
        installsStretchInCarpet: data.installsStretchInCarpet,
        dailyStretchInCarpetSqft: data.dailyStretchInCarpetSqft,
        installsGlueDownCarpet: data.installsGlueDownCarpet,
        // Hardwood Installation
        wantsToAddHardwood: data.wantsToAddHardwood,
        installsNailDownSolidHardwood: data.installsNailDownSolidHardwood,
        dailyNailDownSolidHardwoodSqft: data.dailyNailDownSolidHardwoodSqft,
        installsStapleDownEngineeredHardwood: data.installsStapleDownEngineeredHardwood,
        // Laminate Installation
        wantsToAddLaminate: data.wantsToAddLaminate,
        dailyLaminateSqft: data.dailyLaminateSqft,
        installsLaminateOnStairs: data.installsLaminateOnStairs,
        // Vinyl Installation
        wantsToAddVinyl: data.wantsToAddVinyl,
        installsSheetVinyl: data.installsSheetVinyl,
        installsLuxuryVinylPlank: data.installsLuxuryVinylPlank,
        dailyLuxuryVinylPlankSqft: data.dailyLuxuryVinylPlankSqft,
        installsLuxuryVinylTile: data.installsLuxuryVinylTile,
        installsVinylCompositionTile: data.installsVinylCompositionTile,
        dailyVinylCompositionTileSqft: data.dailyVinylCompositionTileSqft,
        // Tile Installation
        wantsToAddTile: data.wantsToAddTile,
        installsCeramicTile: data.installsCeramicTile,
        dailyCeramicTileSqft: data.dailyCeramicTileSqft,
        installsPorcelainTile: data.installsPorcelainTile,
        dailyPorcelainTileSqft: data.dailyPorcelainTileSqft,
        installsStoneTile: data.installsStoneTile,
        dailyStoneTileSqft: data.dailyStoneTileSqft,
        offersTileRemoval: data.offersTileRemoval,
        installsTileBacksplash: data.installsTileBacksplash,
        dailyTileBacksplashSqft: data.dailyTileBacksplashSqft,
        // Additional Work
        movesFurniture: data.movesFurniture,
        installsTrim: data.installsTrim,
    }

    // Ensure new installers always get a referral code (for affiliate/referral links)
    try {
      installerCreateData.referralCode = await generateUniqueReferralCode()
    } catch (err) {
      console.error('Failed to generate referral code for new installer:', err)
    }

    const installer = await prisma.installer.create({
      data: installerCreateData,
    })

    return NextResponse.json({ installer })
  } catch (error: any) {
    console.error('Error creating installer:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    })
    return NextResponse.json(
      { 
        error: 'Failed to create installer',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}





