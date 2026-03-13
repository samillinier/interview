import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ensureInstallerReferralCode } from '@/lib/referrals'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Helper function to categorize fields by section
function getSectionsFromFields(fields: string[]): string[] {
  const sections = new Set<string>()
  
  // Profile Information fields
  const profileFields = new Set([
    'firstName', 'lastName', 'phone', 'digitalId', 'workroom', 'vehicleDescription',
    'companyName', 'companyTitle', 'companyStreetAddress', 'companyCity', 'companyState',
    'companyZipCode', 'companyCounty', 'companyAddress', 'yearsOfExperience',
    'hasOwnCrew', 'crewSize', 'hasOwnTools', 'toolsDescription', 'hasVehicle',
    'willingToTravel', 'maxTravelDistance', 'canStartImmediately', 'preferredStartDate',
    'availability', 'mondayToFridayAvailability', 'saturdayAvailability',
    'wantsToAddCarpet', 'installsStretchInCarpet', 'dailyStretchInCarpetSqft',
    'installsGlueDownCarpet', 'wantsToAddHardwood', 'installsNailDownSolidHardwood',
    'dailyNailDownSolidHardwoodSqft', 'installsStapleDownEngineeredHardwood',
    'wantsToAddLaminate', 'dailyLaminateSqft', 'installsLaminateOnStairs',
    'wantsToAddVinyl', 'installsSheetVinyl', 'installsLuxuryVinylPlank',
    'dailyLuxuryVinylPlankSqft', 'installsLuxuryVinylTile', 'installsVinylCompositionTile',
    'dailyVinylCompositionTileSqft', 'wantsToAddTile', 'installsCeramicTile',
    'dailyCeramicTileSqft', 'installsPorcelainTile', 'dailyPorcelainTileSqft',
    'installsStoneTile', 'dailyStoneTileSqft', 'offersTileRemoval',
    'installsTileBacksplash', 'dailyTileBacksplashSqft', 'movesFurniture', 'installsTrim'
  ])
  
  // Insurance & Registration fields
  const insuranceFields = new Set([
    'hasInsurance', 'insuranceType', 'hasGeneralLiability', 'hasCommercialAutoLiability',
    'hasWorkersComp', 'hasWorkersCompExemption', 'isSunbizRegistered', 'isSunbizActive',
    'hasBusinessLicense', 'feiEin', 'employerLiabilityPolicyNumber'
  ])
  
  // Insurance & Certificate Expiry Dates fields
  const expiryFields = new Set([
    'llrpExpiry', 'llrpExpiryDates', 'btrExpiry', 'workersCompExemExpiryDates', 'workersCompExemExpiry',
    'generalLiabilityExpiry', 'automobileLiabilityExpiryDates', 'automobileLiabilityExpiry',
    'employersLiabilityExpiry'
  ])
  
  // License & Background Check fields
  const licenseFields = new Set([
    'hasLicense', 'licenseNumber', 'licenseExpiry', 'canPassBackgroundCheck', 'backgroundCheckDetails'
  ])
  
  for (const field of fields) {
    if (profileFields.has(field)) {
      sections.add('Profile Information')
    } else if (insuranceFields.has(field)) {
      sections.add('Insurance & Registration')
    } else if (expiryFields.has(field)) {
      sections.add('Insurance & Certificate Expiry Dates')
    } else if (licenseFields.has(field)) {
      sections.add('License & Background Check')
    }
  }
  
  return Array.from(sections)
}

const INSTALLER_ALLOWED_UPDATE_FIELDS = new Set<string>([
  // Basic / company
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

  // Experience / operations
  'yearsOfExperience',
  'hasOwnCrew',
  'crewSize',
  'hasOwnTools',
  'toolsDescription',
  'hasVehicle',
  'hasInsurance',
  'hasGeneralLiability',
  'hasCommercialAutoLiability',
  'hasWorkersComp',
  'hasWorkersCompExemption',
  'isSunbizRegistered',
  'isSunbizActive',
  'hasBusinessLicense',
  'feiEin',
  'employerLiabilityPolicyNumber',

  // Compliance / expirations (installer-managed)
  'llrpExpiry',
  'llrpExpiryDates',
  'btrExpiry',
  'workersCompExemExpiryDates',
  'workersCompExemExpiry',
  'generalLiabilityExpiry',
  'automobileLiabilityExpiryDates',
  'automobileLiabilityExpiry',
  'employersLiabilityExpiry',
  'canPassBackgroundCheck',
  'backgroundCheckDetails',
  'insuranceType',
  'hasLicense',
  'licenseNumber',
  'licenseExpiry',

  // Availability / travel
  'willingToTravel',
  'maxTravelDistance',
  'canStartImmediately',
  'preferredStartDate',
  'availability',
  'mondayToFridayAvailability',
  'saturdayAvailability',

  // Skills (subset used by installer portal)
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

  // Payment info (installer portal)
  'paymentCompanyName',
  'paymentContactPerson',
  'paymentPhoneNumber',
  'paymentBusinessAddress',
  'paymentEmailAddress',
  'paymentBankName',
  'paymentAccountName',
  'paymentAccountNumber',
  'paymentRoutingNumber',
  'paymentAccountType',
  'paymentAuthorizationName',
  'paymentAuthorizationSignature',
  'paymentAuthorizationDate',
])

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // NOTE: Prisma client types in this repo can drift when prisma generate hasn't been run locally.
    // To avoid blocking builds with type-only mismatches, we cast the client to `any` in this route.
    const prismaAny = prisma as any

    // Check if Prisma is available
    if (!prisma) {
      return NextResponse.json(
        { 
          error: 'Database not initialized', 
          details: 'Prisma client needs to be generated. Please run: npx prisma generate',
          code: 'PRISMA_NOT_INITIALIZED'
        },
        { status: 500 }
      )
    }

    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    
    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }
    
    console.log('Fetching installer with ID:', installerId)
    
    try {
      const installer = await prisma.installer.findUnique({
        where: { id: installerId },
    })

    if (!installer) {
        console.error('Installer not found with ID:', installerId)
        return NextResponse.json(
          { error: 'Installer not found', installerId },
          { status: 404 }
        )
    }

      /**
       * Access control:
       * - If an installer token is present and valid, allow the installer to fetch their own record.
       * - Otherwise, require a dashboard session (Admin or Moderator).
       * - Moderators can only access Qualified installers (status = "passed").
       */
      const token = getInstallerTokenFromRequest(request)
      if (token) {
        try {
          const payload = verifyInstallerToken(token)
          if (!payload.installerId || payload.installerId !== installerId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        } catch {
          return NextResponse.json({ error: 'Unauthorized', details: 'Invalid installer token' }, { status: 401 })
        }
      } else {
        const session = await getServerSession(authOptions)
        const email = session?.user?.email?.toLowerCase()
        if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = (await prismaAny.admin.findUnique({
          where: { email },
        })) as any
        if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

        const st = String(installer.status || '').toLowerCase()
        if (admin.role === 'MODERATOR' && !['passed', 'pending', 'failed'].includes(st)) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }

      // Ensure referral code exists (backfill for older installers)
      let referralCode = (installer as any).referralCode || null
      try {
        referralCode = await ensureInstallerReferralCode(installerId)
      } catch (err) {
        console.error('Failed to ensure referral code:', err)
      }

      // Basic referral stats
      let referralsCount = 0
      try {
        referralsCount = await prismaAny.installer.count({
          where: { referredByInstallerId: installerId } as any,
        })
      } catch (err) {
        console.error('Failed to compute referralsCount:', err)
    }

      // Pending change requests (used by installer portal to show "submitted for approval" banner)
      let pendingChangeRequestsCount = 0
      try {
        pendingChangeRequestsCount = await prismaAny.installerChangeRequest.count({
          where: { installerId, status: 'pending' },
        })
      } catch (err) {
        console.error('Failed to compute pendingChangeRequestsCount:', err)
      }

      console.log('Installer found:', installer.email)
      return NextResponse.json({
        installer: {
          ...installer,
          referralCode,
          referralsCount,
          pendingChangeRequestsCount,
        },
      })
    } catch (dbError: any) {
      // Handle Prisma/database specific errors
      console.error('Database error fetching installer:', dbError)
      if (dbError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Database constraint violation', details: dbError.message },
          { status: 400 }
        )
      }
      // Return JSON error instead of throwing to prevent HTML error pages
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: dbError.message || 'An error occurred while fetching installer',
          code: dbError.code || 'DB_ERROR'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error fetching installer:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
    })
    
    // Check if it's a Prisma client initialization error
    if (error.message?.includes('PrismaClient') || error.message?.includes('Cannot find module')) {
      return NextResponse.json(
        { 
          error: 'Database connection error', 
          details: 'The database client is not properly initialized. Please restart the server.',
          code: 'DB_INIT_ERROR'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch installer', 
        details: error.message || 'An unexpected error occurred',
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    )
  }
}

// Helper function to normalize date strings to YYYY-MM-DD format with validation
function normalizeDateString(dateStr: string): string | null {
  // If already in YYYY-MM-DD format, validate and return
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00')
    if (!Number.isNaN(d.getTime()) && d.getFullYear() >= 1000 && d.getFullYear() <= 2099) {
      return dateStr
    }
  }
  
  // Try parsing as date
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return null
  
  // Check if year is reasonable (not year 20 AD)
  const year = d.getFullYear()
  if (year < 1000 || year > 2099) {
    // Try to fix common issues like "12/12/0020" -> "2020-12-12"
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
    if (match) {
      const [, month, day, yearStr] = match
      const fullYear = yearStr.length === 2 
        ? (parseInt(yearStr) < 50 ? 2000 + parseInt(yearStr) : 1900 + parseInt(yearStr))
        : parseInt(yearStr)
      if (fullYear >= 1000 && fullYear <= 2099) {
        const fixedDate = new Date(fullYear, parseInt(month) - 1, parseInt(day))
        if (!Number.isNaN(fixedDate.getTime())) {
          return fixedDate.toISOString().split('T')[0]
        }
      }
    }
    return null
  }
  
  return d.toISOString().split('T')[0]
}

function normalizeComparableValue(key: string, val: any): any {
  if (val === undefined) return undefined
  if (val === null) return null

  // Normalize strings (trim)
  if (typeof val === 'string') return val.trim()

  // Normalize Dates to ISO strings
  if (val instanceof Date) return val.toISOString()

  // For our multi-date fields we store JSON strings in the Installer table.
  // Compare as-is (string) after trimming above.

  return val
}

function isEqualForChangeRequest(key: string, proposed: any, current: any): boolean {
  const a = normalizeComparableValue(key, proposed)
  const b = normalizeComparableValue(key, current)

  // If proposed is a date string and current is a Date, normalize both to ISO.
  if (typeof a === 'string' && b instanceof Date) {
    const d = new Date(a)
    if (!Number.isNaN(d.getTime())) return d.toISOString() === b.toISOString()
  }
  if (a instanceof Date && typeof b === 'string') {
    const d = new Date(b)
    if (!Number.isNaN(d.getTime())) return a.toISOString() === d.toISOString()
  }

  // Basic deep-ish compare for JSON strings (already stable-sorted upstream)
  if (typeof a === 'string' && typeof b === 'string') return a === b

  return Object.is(a, b)
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // See note in GET: prisma types can drift locally; cast to any to prevent type-only build blockers.
    const prismaAny = prisma as any

    // Check if Prisma is available
    if (!prisma) {
      return NextResponse.json(
        { 
          error: 'Database not initialized', 
          details: 'Prisma client needs to be generated. Please run: npx prisma generate',
          code: 'PRISMA_NOT_INITIALIZED'
        },
        { status: 500 }
      )
    }

    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    
    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    let data: any
    let cleanedData: any = {}
    let approvalSource: string | null = null
    let notificationMethod: 'email' | 'notification' | 'both' | undefined = undefined
    
    try {
      data = await request.json()

      // Extract meta fields that should not be persisted
      if (data?._approvalSource !== undefined) {
        approvalSource = typeof data._approvalSource === 'string' ? data._approvalSource : null
        delete data._approvalSource
      }

      // Extract notificationMethod (not persisted to DB)
      notificationMethod = data?.notificationMethod as 'email' | 'notification' | 'both' | undefined
      delete data.notificationMethod

      // Normalize workroom
      if (data.workroom !== undefined) {
        if (data.workroom === null) {
          data.workroom = null
        } else if (typeof data.workroom === 'string') {
          const v = data.workroom.trim()
          data.workroom = v ? v : null
        } else {
          data.workroom = null
        }
      }

      // Handle multi-policy automobile liability dates (stored as JSON string)
      if (data.automobileLiabilityExpiryDates !== undefined) {
        let arr: string[] = []
        if (Array.isArray(data.automobileLiabilityExpiryDates)) {
          arr = data.automobileLiabilityExpiryDates
        } else if (typeof data.automobileLiabilityExpiryDates === 'string') {
          try {
            const parsed = JSON.parse(data.automobileLiabilityExpiryDates)
            if (Array.isArray(parsed)) arr = parsed
          } catch {
            arr = []
          }
        }

        const cleaned = arr
          .filter((v) => typeof v === 'string')
          .map((v) => (v as string).trim())
          .filter(Boolean)
          .map((v) => normalizeDateString(v))
          .filter((v): v is string => v !== null) as string[]

        // Keep duplicates (multiple policies can share the same expiry date), just sort.
        cleaned.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        data.automobileLiabilityExpiryDates = cleaned.length > 0 ? JSON.stringify(cleaned) : null

        // Keep the single-date field in sync for legacy logic (earliest date)
        data.automobileLiabilityExpiry = cleaned.length > 0 ? new Date(cleaned[0]) : null
      }

      // Handle multi-date workers comp certificate expiry dates (stored as JSON string)
      if (data.workersCompExemExpiryDates !== undefined) {
        let arr: string[] = []
        if (Array.isArray(data.workersCompExemExpiryDates)) {
          arr = data.workersCompExemExpiryDates
        } else if (typeof data.workersCompExemExpiryDates === 'string') {
          try {
            const parsed = JSON.parse(data.workersCompExemExpiryDates)
            if (Array.isArray(parsed)) arr = parsed
          } catch {
            arr = []
          }
        }

        const cleaned = arr
          .filter((v) => typeof v === 'string')
          .map((v) => (v as string).trim())
          .filter(Boolean)
          .map((v) => normalizeDateString(v))
          .filter((v): v is string => v !== null) as string[]

        // Keep duplicates (multiple certificates can share the same expiry date), just sort.
        cleaned.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        data.workersCompExemExpiryDates = cleaned.length > 0 ? JSON.stringify(cleaned) : null
        data.workersCompExemExpiry = cleaned.length > 0 ? new Date(cleaned[0]) : null
      }

      // Handle multi-date LLRP expiry dates (stored as JSON string)
      if ((data as any).llrpExpiryDates !== undefined) {
        let arr: string[] = []
        const incoming = (data as any).llrpExpiryDates
        if (Array.isArray(incoming)) {
          arr = incoming
        } else if (typeof incoming === 'string') {
          try {
            const parsed = JSON.parse(incoming)
            if (Array.isArray(parsed)) arr = parsed
          } catch {
            arr = []
          }
        }

        const cleaned = arr
          .filter((v) => typeof v === 'string')
          .map((v) => (v as string).trim())
          .filter(Boolean)
          .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))

        cleaned.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        ;(data as any).llrpExpiryDates = cleaned.length > 0 ? JSON.stringify(cleaned) : null
        data.llrpExpiry = cleaned.length > 0 ? new Date(cleaned[0]) : null
      }
      
      // Convert date strings to Date objects for expiry date fields
      const dateFields = ['llrpExpiry', 'btrExpiry', 'workersCompExemExpiry', 'generalLiabilityExpiry', 'automobileLiabilityExpiry', 'employersLiabilityExpiry', 'paymentAuthorizationDate', 'preferredStartDate', 'licenseExpiry', 'followUpDate']
      for (const field of dateFields) {
        if (data[field] !== undefined) {
          if (data[field] === null || data[field] === '') {
            data[field] = null
          } else if (typeof data[field] === 'string' && data[field].trim() !== '') {
            try {
              // Handle date-only strings (YYYY-MM-DD) by adding time component
              let dateStr = data[field].trim()
              // If it's just a date (YYYY-MM-DD), add time to make it a valid DateTime
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                dateStr = dateStr + 'T00:00:00.000Z'
              }
              const date = new Date(dateStr)
              // Check if date is valid
              if (!isNaN(date.getTime())) {
                data[field] = date
              } else {
                // Invalid date, set to null
                data[field] = null
              }
            } catch (e) {
              data[field] = null
            }
          }
          // If it's already a Date object, keep it as is
        }
      }
      
      // Handle remarks field (JSON string)
      if (data.remarks !== undefined) {
        if (data.remarks === null || data.remarks === '') {
          data.remarks = null
        } else if (typeof data.remarks === 'string') {
          // Validate it's valid JSON
          try {
            JSON.parse(data.remarks)
            // Keep as is if valid JSON
          } catch {
            // If not valid JSON, try to wrap it
            data.remarks = JSON.stringify([{ note: data.remarks, createdAt: new Date().toISOString() }])
          }
        }
      }
      
      // Remove undefined values to avoid Prisma errors
      // Also: avoid accidentally wiping existing optional string fields when the client sends empty strings.
      // Admin UI historically sent many fields on save; if any local state wasn't populated, it could send "" and erase data.
      cleanedData = {}
      for (const key in data) {
        if (data[key] !== undefined) {
          const v = data[key]

          // For required string fields, ensure they're not empty
          if ((key === 'firstName' || key === 'lastName' || key === 'email') && v === '') {
            return NextResponse.json(
              { 
                error: 'Validation error',
                details: `${key} cannot be empty`,
                code: 'VALIDATION_ERROR'
              },
              { status: 400 }
            )
          }

          // For optional string fields: ignore empty-string updates to prevent unintended data loss.
          // If callers truly want to clear a field, they should send `null`.
          if (typeof v === 'string' && v.trim() === '' && key !== 'firstName' && key !== 'lastName' && key !== 'email') {
            continue
          }

          cleanedData[key] = v
        }
      }
      
      // Ensure we have at least one field to update
      if (Object.keys(cleanedData).length === 0) {
        return NextResponse.json(
          { 
            error: 'No valid fields to update',
            details: 'At least one field must be provided for update',
            code: 'EMPTY_UPDATE'
          },
          { status: 400 }
        )
      }
    } catch (parseError: any) {
      console.error('Error parsing request JSON:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: 'The request body is not valid JSON',
          code: 'INVALID_JSON'
        },
        { status: 400 }
      )
    }

    try {
      /**
       * IMPORTANT:
       * If an installer token is present, we treat this request as an installer submission
       * and create a pending change request, even if a NextAuth admin session cookie exists
       * (e.g. same browser previously used the admin dashboard).
       */
      const token = getInstallerTokenFromRequest(request)
      if (token) {
        let payload
        try {
          payload = verifyInstallerToken(token)
        } catch {
          return NextResponse.json({ error: 'Unauthorized', details: 'Invalid installer token' }, { status: 401 })
        }

        if (!payload.installerId || payload.installerId !== installerId) {
          return NextResponse.json(
            { error: 'Forbidden', details: 'Token does not match installer' },
            { status: 403 }
          )
        }

        // Load current installer state so we can create a true diff (avoid "changed everything" requests).
        const currentInstaller = await prismaAny.installer.findUnique({ where: { id: installerId } })
        if (!currentInstaller) {
          return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
        }
        if ((currentInstaller.status || '').toLowerCase() === 'deactive') {
          return NextResponse.json(
            { error: 'Account deactivated', details: 'This installer account is deactivated.' },
            { status: 403 }
          )
        }

        // Only allow a safe whitelist of fields from installer submissions
        const filtered: Record<string, any> = {}
        for (const [key, value] of Object.entries(cleanedData)) {
          if (INSTALLER_ALLOWED_UPDATE_FIELDS.has(key)) {
            // Ensure JSON-serializable values for Prisma Json field
            if (value instanceof Date) filtered[key] = value.toISOString()
            else filtered[key] = value
          }
        }

        // Reduce to only actual changes vs current installer
        const diffOnly: Record<string, any> = {}
        for (const [key, value] of Object.entries(filtered)) {
          // @ts-ignore - dynamic access
          const currentVal = (currentInstaller as any)[key]
          if (!isEqualForChangeRequest(key, value, currentVal)) {
            diffOnly[key] = value
          }
        }

        if (Object.keys(diffOnly).length === 0) {
          return NextResponse.json(
            {
              error: 'No changes detected',
              details: 'Nothing changed compared to the saved profile.',
            },
            { status: 400 }
          )
        }

        // Determine which sections changed
        const changedSections = getSectionsFromFields(Object.keys(diffOnly))

        const source = approvalSource || 'profile'

        // If there's already a pending request for this installer+source, merge into it (prevents duplicates).
        const existingPending = await prismaAny.installerChangeRequest.findFirst({
          where: { installerId, status: 'pending', source },
          orderBy: { createdAt: 'desc' },
        })

        if (existingPending) {
          const prevPayload = (existingPending.payload || {}) as Record<string, any>
          const mergedPayload = { ...prevPayload, ...diffOnly }

          // Re-diff merged payload vs current installer to drop any accidental/no-op keys.
          const mergedDiff: Record<string, any> = {}
          for (const [key, value] of Object.entries(mergedPayload)) {
            // @ts-ignore
            const currentVal = (currentInstaller as any)[key]
            if (!isEqualForChangeRequest(key, value, currentVal)) mergedDiff[key] = value
          }
          if (Object.keys(mergedDiff).length === 0) {
            return NextResponse.json(
              {
                error: 'No changes detected',
                details: 'Nothing changed compared to the saved profile.',
              },
              { status: 400 }
            )
          }

          const prevSections = Array.isArray(existingPending.sections) ? (existingPending.sections as any[]) : []
          const mergedSections = Array.from(
            new Set([...(prevSections as string[]), ...getSectionsFromFields(Object.keys(mergedDiff))])
          ).filter(Boolean)

          const [, updatedRequest] = await prismaAny.$transaction([
            prismaAny.installer.updateMany({
              where: { id: installerId, status: 'active' },
              data: { status: 'pending' },
            }),
            prismaAny.installerChangeRequest.update({
              where: { id: existingPending.id },
              data: {
                payload: mergedDiff as any,
                sections: mergedSections.length > 0 ? (mergedSections as any) : null,
                updatedAt: new Date(),
              },
            }),
          ])

          return NextResponse.json({
            success: true,
            pendingApproval: true,
            requestId: updatedRequest.id,
            message: 'Changes updated and submitted for admin approval',
          })
        }

        const [, changeRequest] = await prismaAny.$transaction([
          // Flip installer status to pending only if currently active (do not overwrite other statuses).
          prismaAny.installer.updateMany({
            where: { id: installerId, status: 'active' },
            data: { status: 'pending' },
          }),
          prismaAny.installerChangeRequest.create({
            data: {
              installerId,
              status: 'pending',
              source,
              sections: changedSections.length > 0 ? changedSections : null,
              payload: diffOnly,
              submittedBy: (payload.email || payload.username || null) as string | null,
            } as any,
          }),
        ])

        return NextResponse.json({
          success: true,
          pendingApproval: true,
          requestId: changeRequest.id,
          message: 'Changes submitted for admin approval',
        })
      }

      // No installer token: allow admins (NextAuth session) to update immediately.
      let adminEmail: string | null = null
      try {
        const session = await getServerSession(authOptions)
        const email = session?.user?.email?.toLowerCase()
        if (email) {
          const admin = await prismaAny.admin.findUnique({ where: { email } })
          if (admin?.isActive) adminEmail = email
        }
      } catch {
        // ignore session errors
      }

      if (!adminEmail) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Missing installer token' },
          { status: 401 }
        )
      }

      // If admin is deactivating the installer, append a system remark reminding to disable external access.
      // This helps the Remarks page act as an internal checklist.
      if (cleanedData.status && String(cleanedData.status).toLowerCase() === 'deactive') {
        const currentInstaller = await prismaAny.installer.findUnique({
          where: { id: installerId },
          select: { status: true, remarks: true, firstName: true, lastName: true, email: true } as any,
        })
        const baseRemarksRaw = (cleanedData.remarks !== undefined ? cleanedData.remarks : currentInstaller?.remarks) as any
        let remarksArr: Array<{ date?: string | null; note: string; createdAt: string }> = []
        if (typeof baseRemarksRaw === 'string' && baseRemarksRaw.trim() !== '') {
          try {
            const parsed = JSON.parse(baseRemarksRaw)
            if (Array.isArray(parsed)) remarksArr = parsed as any
            else remarksArr = []
          } catch {
            remarksArr = [{ note: String(baseRemarksRaw), createdAt: new Date().toISOString() }]
          }
        }

        const alreadyHasSystemNote = remarksArr.some((r) => {
          const note = (r as any)?.note
          return typeof note === 'string' && note.startsWith('SYSTEM: Installer deactivated.')
        })

        // Add the system note if missing (even if installer was already deactive from a previous version)
        if (!alreadyHasSystemNote) {
          const installerName = `${currentInstaller?.firstName || ''} ${currentInstaller?.lastName || ''}`.trim()
          const installerEmail = currentInstaller?.email || ''
          const note = `SYSTEM: Installer deactivated. Please deactivate this installer’s ProjectForce account and disable access for any associated staff/team members. (${installerName || installerId}${installerEmail ? ` • ${installerEmail}` : ''})`
          remarksArr.unshift({ note, createdAt: new Date().toISOString() })
          cleanedData.remarks = JSON.stringify(remarksArr)
        }
      }

      // Get current installer to check if status or trackerStage changed
      const currentInstaller = await prismaAny.installer.findUnique({
        where: { id: installerId },
        select: { status: true, trackerStage: true, email: true, firstName: true, lastName: true } as any,
      })

      // IMPORTANT: Check for changes BEFORE updating the database
      // Send notification if status or trackerStage changed (default to 'both' if notificationMethod not provided)
      const effectiveNotificationMethod = notificationMethod !== undefined && notificationMethod !== null ? notificationMethod : 'both'
      
      // Debug logging - check what's in cleanedData
      console.log(`🔍 Checking changes for installer ${installerId}:`)
      console.log(`  - cleanedData keys: ${Object.keys(cleanedData).join(', ')}`)
      console.log(`  - Current status: ${currentInstaller?.status}, New status: ${cleanedData.status}`)
      console.log(`  - Current trackerStage: ${currentInstaller?.trackerStage}, New trackerStage: ${cleanedData.trackerStage}`)
      console.log(`  - trackerStage in cleanedData: ${cleanedData.trackerStage !== undefined ? 'YES' : 'NO'}`)
      console.log(`  - notificationMethod provided: ${notificationMethod}`)
      console.log(`  - effectiveNotificationMethod: ${effectiveNotificationMethod}`)
      
      // Check if status changed (only if status is explicitly provided in request)
      const statusChanged = Boolean(
        currentInstaller && 
        cleanedData.status !== undefined && 
        cleanedData.status !== null &&
        currentInstaller.status !== cleanedData.status
      )
      
      // Check if trackerStage changed (only if trackerStage is explicitly provided in request)
      // CRITICAL FIX: Make sure we're checking the actual value, not just existence
      const trackerStageChanged = Boolean(
        currentInstaller && 
        cleanedData.trackerStage !== undefined && 
        cleanedData.trackerStage !== null &&
        String(currentInstaller.trackerStage) !== String(cleanedData.trackerStage)
      )
      
      console.log(`🔍 Change detection results:`)
      console.log(`  - statusChanged: ${statusChanged}`)
      console.log(`  - trackerStageChanged: ${trackerStageChanged}`)
      console.log(`  - Will send notifications: ${statusChanged || trackerStageChanged}`)

      const installer = await prismaAny.installer.update({
        where: { id: installerId },
        data: cleanedData,
      })
      
      // Log changes for debugging
      if (statusChanged || trackerStageChanged) {
        console.log(`📢 Status/Stage change detected for installer ${installerId}:`)
        if (statusChanged && currentInstaller) {
          console.log(`  - Status: ${currentInstaller.status} → ${cleanedData.status}`)
        }
        if (trackerStageChanged && currentInstaller) {
          console.log(`  - Tracker Stage: ${currentInstaller.trackerStage} → ${cleanedData.trackerStage}`)
        }
        console.log(`  - Notification Method: ${effectiveNotificationMethod}`)
      } else {
        console.log(`⚠️ No status or trackerStage change detected`)
      }
      
      if ((statusChanged || trackerStageChanged) && currentInstaller) {
        const newStatus = cleanedData.status || currentInstaller.status
        const oldStatus = currentInstaller.status
        const newTrackerStage = cleanedData.trackerStage || currentInstaller.trackerStage
        const oldTrackerStage = currentInstaller.trackerStage

        // Status labels for display
        const statusLabels: Record<string, string> = {
          'qualified': 'Qualified',
          'failed': 'Not Qualified',
          'pending': 'Pending',
          'active': 'Active',
          'deactive': 'Deactivated',
        }

        // Tracker stage labels
        const trackerStageLabels: Record<string, string> = {
          'PENDING': 'Pending',
          'QUALIFIED': 'Qualified',
          'WAITING_FOR_APPROVAL': 'Waiting for Approval',
          'VERIFICATION_IN_PROGRESS': 'Verification in Progress',
          'BACKGROUND': 'Background Check',
          'ACTIVE_APPROVED': 'Active / Approved',
        }

        // Create welcoming status messages
        const getStatusMessage = (oldStatus: string, newStatus: string, oldTrackerStage: string | null, newTrackerStage: string | null, statusChanged: boolean, trackerStageChanged: boolean) => {
          const oldLabel = statusLabels[oldStatus] || oldStatus
          const newLabel = statusLabels[newStatus] || newStatus
          const oldTrackerLabel = oldTrackerStage ? trackerStageLabels[oldTrackerStage] || oldTrackerStage : null
          const newTrackerLabel = newTrackerStage ? trackerStageLabels[newTrackerStage] || newTrackerStage : null
          
          // Build message based on what changed
          let changeDescription = ''
          if (statusChanged && trackerStageChanged) {
            changeDescription = `Your status has been updated from "${oldLabel}" to "${newLabel}" and your stage has moved from "${oldTrackerLabel}" to "${newTrackerLabel}".`
          } else if (statusChanged) {
            changeDescription = `Your status has been updated from "${oldLabel}" to "${newLabel}".`
          } else if (trackerStageChanged) {
            changeDescription = `Your application stage has been updated from "${oldTrackerLabel}" to "${newTrackerLabel}".`
          }
          
          // More welcoming messages based on status/stage change
          if (newStatus === 'qualified' || newStatus === 'active' || newTrackerStage === 'ACTIVE_APPROVED') {
            return `Great news! ${changeDescription} We're excited to have you on board and look forward to working with you.`
          } else if (newStatus === 'pending' || newTrackerStage === 'PENDING') {
            return `${changeDescription} Our team is reviewing your information and will be in touch soon. Thank you for your patience.`
          } else if (newStatus === 'failed' || newStatus === 'deactive') {
            return `${changeDescription} If you have any questions or concerns, please don't hesitate to reach out to our support team.`
          } else {
            return `${changeDescription} We appreciate your continued partnership with us.`
          }
        }

        const statusMessage = getStatusMessage(oldStatus, newStatus, oldTrackerStage, newTrackerStage, statusChanged, trackerStageChanged)
        const notificationTitle = statusChanged && trackerStageChanged ? 'Status & Stage Update' : (statusChanged ? 'Status Update' : 'Stage Update')
        const notificationContent = statusMessage

        // Send notification (if method is 'notification' or 'both')
        if (effectiveNotificationMethod === 'notification' || effectiveNotificationMethod === 'both') {
          try {
            // Determine priority based on status and trackerStage
            const isHighPriority = 
              newStatus === 'qualified' || 
              newStatus === 'active' || 
              newTrackerStage === 'ACTIVE_APPROVED' ||
              newTrackerStage === 'QUALIFIED'
            
            const notification = await prismaAny.notification.create({
              data: {
                installerId: installerId,
                type: 'notification',
                title: notificationTitle,
                content: notificationContent,
                priority: isHighPriority ? 'high' : 'normal',
                link: '/installer/profile',
                senderId: 'admin',
                senderType: 'admin',
              },
            })
            console.log(`✅ ${trackerStageChanged ? 'Tracker stage' : 'Status'} change notification created successfully for installer ${installerId} (Notification ID: ${notification.id})`)
          } catch (e: any) {
            console.error('❌ Failed to create notification:', e?.message || e)
          }
        }

        // Send email (if method is 'email' or 'both')
        if ((effectiveNotificationMethod === 'email' || effectiveNotificationMethod === 'both') && currentInstaller.email) {
          try {
            const { Resend } = await import('resend')
            const resendApiKey = process.env.RESEND_API_KEY
            if (resendApiKey) {
              const resend = new Resend(resendApiKey)
              const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
              const fromName = process.env.RESEND_FROM_NAME || 'Floor Interior Service'
              const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://floor-interior-service-six.vercel.app'
              
              // Use URL for logo to prevent email clipping (base64 makes emails too large)
              const logoUrl = process.env.EMAIL_LOGO_URL || `${appUrl}/logo.png`
              
              // Create welcoming email message
              const getWelcomeMessage = (oldStatus: string, newStatus: string, oldTrackerStage: string | null, newTrackerStage: string | null, firstName: string, statusChanged: boolean, trackerStageChanged: boolean) => {
                // Priority: Use tracker stage messages if tracker stage changed, otherwise fall back to status-based messages
                if (trackerStageChanged && newTrackerStage) {
                  switch (newTrackerStage) {
                    case 'PENDING':
                      return `Thank you for your interest in working with Floor Interior Services and for completing the AI interview! 🎉 Your status is now <strong>Pending ⏳</strong>. To move forward to the next stage, please complete your full profile in the installer portal, including all required information and documents. We're excited to move ahead with you!`
                    
                    case 'QUALIFIED':
                      return `Great news! 🎉 Your status has been updated to <strong>Qualified ✅</strong>. You've successfully met our initial requirements, and we're excited to continue the process with you. Please complete your full profile, upload all required attachments, and add expiration dates. Once submitted, your documents will move to verification. You're getting closer! 🚀`
                    
                    case 'WAITING_FOR_APPROVAL':
                      return `Thank you for submitting your documents! 🙌 Your status is now <strong>Waiting for Approval 📂</strong>, and our Compliance Specialist is currently reviewing everything. We appreciate your patience and will keep you updated soon. You're almost there!`
                    
                    case 'VERIFICATION_IN_PROGRESS':
                      return `Your application is now in <strong>Verification in Progress 🔎</strong>. Our team is carefully reviewing your documents to ensure everything meets compliance standards. If any corrections are needed, we'll notify you right away. Once approved, you'll move to the Background stage. Keep an eye out — you're making great progress! 💪`
                    
                    case 'BACKGROUND':
                      return `Congratulations! 🎊 You've moved to the <strong>Background 🛡️</strong> stage. This process typically takes 3–7 days to complete. Once finalized, you'll be just one step away from becoming fully approved. Thank you for your patience during this final review!`
                    
                    case 'ACTIVE_APPROVED':
                      return `Congratulations! Your background has been successfully completed, and your status is now <strong>Active / Approved 🎉🚀</strong>! You are officially an approved installer with Floor Interior Services. You'll now connect with your Regional Manager and be ready to get started with work. We're excited to have you on board — welcome to the team! 👏🔥`
                    
                    default:
                      // Fall through to status-based messages
                      break
                  }
                }
                
                // Fallback to status-based messages if no tracker stage change or unknown stage
                const oldLabel = statusLabels[oldStatus] || oldStatus
                const newLabel = statusLabels[newStatus] || newStatus
                const oldTrackerLabel = oldTrackerStage ? trackerStageLabels[oldTrackerStage] || oldTrackerStage : null
                const newTrackerLabel = newTrackerStage ? trackerStageLabels[newTrackerStage] || newTrackerStage : null
                
                // Build change description
                let changeDesc = ''
                if (statusChanged && trackerStageChanged) {
                  changeDesc = `your status has been updated to <strong>"${newLabel}"</strong> and your application stage has moved to <strong>"${newTrackerLabel}"</strong>`
                } else if (statusChanged) {
                  changeDesc = `your status has been updated to <strong>"${newLabel}"</strong>`
                } else if (trackerStageChanged) {
                  changeDesc = `your application stage has been updated to <strong>"${newTrackerLabel}"</strong>`
                }
                
                if (newStatus === 'qualified' || newStatus === 'active' || newTrackerStage === 'ACTIVE_APPROVED') {
                  return `We're thrilled to inform you that ${changeDesc}! 🎉<br><br>This is an exciting milestone, and we're delighted to have you as part of our team. You can now access all the features available to active installers and start exploring opportunities with us.`
                } else if (newStatus === 'pending' || newTrackerStage === 'PENDING') {
                  return `We wanted to let you know that ${changeDesc}.<br><br>Our team is currently reviewing your information and documentation. We appreciate your patience during this process and will be in touch with you soon. If you have any questions in the meantime, please don't hesitate to reach out.`
                } else if (newStatus === 'failed' || newStatus === 'deactive') {
                  return `We're writing to inform you that ${changeDesc}.<br><br>If you have any questions about this change or would like to discuss your account status, our support team is here to help. Please feel free to contact us at any time.`
                } else {
                  return `We wanted to keep you informed that ${changeDesc}.<br><br>Thank you for being part of our installer community. We value your partnership and look forward to continuing to work together.`
                }
              }
              
              const welcomeMessage = getWelcomeMessage(oldStatus, newStatus, oldTrackerStage, newTrackerStage, currentInstaller.firstName || '', statusChanged, trackerStageChanged)

              const emailResult = await resend.emails.send({
                from: `${fromName} <${fromEmail}>`,
                to: currentInstaller.email,
                subject: statusChanged && trackerStageChanged 
                  ? `Status & Stage Update: ${statusLabels[newStatus] || newStatus} - ${trackerStageLabels[newTrackerStage] || newTrackerStage}`
                  : statusChanged 
                    ? `Status Update: ${statusLabels[newStatus] || newStatus}`
                    : `Stage Update: ${trackerStageLabels[newTrackerStage] || newTrackerStage}`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
                      <div style="text-align: center; margin-bottom: 30px; padding: 20px 0;">
                        <img src="${logoUrl}" alt="Floor Interior Service" style="max-width: 180px; height: auto; display: block; margin: 0 auto; border-radius: 8px;" />
                      </div>
                      
                      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h1 style="color: #22c55e; margin-top: 0; text-align: center;">Status Update</h1>
                      </div>
                      
                      <p style="font-size: 16px; margin-bottom: 20px;">Hi ${currentInstaller.firstName || 'there'},</p>
                      
                      <p style="font-size: 15px; line-height: 1.8; color: #4a5568; margin-bottom: 25px;">
                        ${welcomeMessage}
                      </p>
                      
                      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #22c55e; padding: 20px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        ${statusChanged ? `
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;"><strong style="color: #334155;">Previous Status:</strong> ${statusLabels[oldStatus] || oldStatus}</p>
                        <p style="margin: 0 0 12px 0; font-size: 16px; color: #1e40af; font-weight: 600;"><strong style="color: #334155;">New Status:</strong> ${statusLabels[newStatus] || newStatus}</p>
                        ` : ''}
                        ${trackerStageChanged ? `
                        <p style="margin: ${statusChanged ? '12px' : '0'} 0 8px 0; font-size: 14px; color: #64748b;"><strong style="color: #334155;">Previous Stage:</strong> ${trackerStageLabels[oldTrackerStage] || oldTrackerStage}</p>
                        <p style="margin: 0; font-size: 16px; color: #1e40af; font-weight: 600;"><strong style="color: #334155;">New Stage:</strong> ${trackerStageLabels[newTrackerStage] || newTrackerStage}</p>
                        ` : ''}
                      </div>
                      
                      <div style="text-align: center; margin: 30px 0;">
                        <a href="${appUrl}/installer/profile" 
                           style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                          View Profile
                        </a>
                      </div>
                      
                      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                      <p style="color: #999; font-size: 12px; text-align: center;">
                        Floor Interior Service - Installer Portal
                      </p>
                    </body>
                  </html>
                `,
                text: `
Hi ${currentInstaller.firstName || 'there'},

${welcomeMessage.replace(/<br>/g, '\n').replace(/<strong>/g, '').replace(/<\/strong>/g, '').replace(/🎉/g, '')}

${statusChanged ? `Previous Status: ${statusLabels[oldStatus] || oldStatus}\nNew Status: ${statusLabels[newStatus] || newStatus}\n` : ''}
${trackerStageChanged ? `Previous Stage: ${trackerStageLabels[oldTrackerStage] || oldTrackerStage}\nNew Stage: ${trackerStageLabels[newTrackerStage] || newTrackerStage}\n` : ''}
View your profile: ${appUrl}/installer/profile

If you have any questions, please don't hesitate to reach out to our support team.

Best regards,
Floor Interior Service Team
                `,
              })

              if (emailResult && 'id' in emailResult) {
                console.log(`✅ Status change email sent successfully to ${currentInstaller.email} (Email ID: ${emailResult.id})`)
              } else if (emailResult && 'error' in emailResult) {
                console.error('❌ Failed to send status change email:', emailResult.error)
              }
            } else {
              console.warn('⚠️ RESEND_API_KEY not configured - email not sent')
            }
          } catch (e: any) {
            console.error('❌ Failed to send status change email:', e?.message || e)
          }
        }
      }

      return NextResponse.json({ installer })
    } catch (dbError: any) {
      // Handle database-specific errors
      console.error('Database error updating installer:', dbError)
      console.error('Error details:', {
        message: dbError?.message,
        code: dbError?.code,
        name: dbError?.name,
        meta: dbError?.meta,
      })
      console.error('Attempted update data:', JSON.stringify(cleanedData, null, 2))
      
      // Provide more detailed error information
      let errorMessage = 'Failed to update installer'
      let errorDetails = dbError?.message || 'Unknown error'
      
      // Check for Prisma errors
      if (dbError?.code?.startsWith('P')) {
        if (dbError.code === 'P2002') {
          errorMessage = 'A record with this value already exists'
          errorDetails = dbError.meta?.target ? `Duplicate value for: ${dbError.meta.target.join(', ')}` : dbError.message
        } else if (dbError.code === 'P2025') {
          errorMessage = 'Installer not found'
          errorDetails = 'The installer you are trying to update does not exist'
        } else if (dbError.code === 'P2003') {
          errorMessage = 'Invalid reference'
          errorDetails = dbError.message || 'A referenced record does not exist'
        }
      }
      
      // Check for field validation errors
      if (dbError?.message?.includes('Unknown argument') || dbError?.message?.includes('Unknown field')) {
        errorMessage = 'Database schema mismatch'
        errorDetails = 'The database schema may need to be updated. Please run: npx prisma migrate dev'
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: errorDetails,
          code: dbError?.code || 'UPDATE_ERROR'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error updating installer:', error)
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
    })
    
    // Provide more detailed error information
    let errorMessage = 'Failed to update installer'
    let errorDetails = error?.message || 'Unknown error'
    
    // Check for Prisma errors
    if (error?.code?.startsWith('P')) {
      if (error.code === 'P2002') {
        errorMessage = 'A record with this value already exists'
        errorDetails = error.meta?.target ? `Duplicate value for: ${error.meta.target.join(', ')}` : error.message
      } else if (error.code === 'P2025') {
        errorMessage = 'Installer not found'
        errorDetails = 'The installer you are trying to update does not exist'
      } else if (error.code === 'P2003') {
        errorMessage = 'Invalid reference'
        errorDetails = error.message || 'A referenced record does not exist'
      }
    }
    
    // Check for field validation errors
    if (error?.message?.includes('Unknown argument') || error?.message?.includes('Unknown field')) {
      errorMessage = 'Database schema mismatch'
      errorDetails = 'The database schema may need to be updated. Please run: npx prisma migrate dev'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: errorDetails,
        code: error?.code || 'UPDATE_ERROR'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id
    
    await prisma.installer.delete({
      where: { id: installerId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting installer:', error)
    return NextResponse.json(
      { error: 'Failed to delete installer' },
      { status: 500 }
    )
  }
}





