import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { ensureInstallerReferralCode } from '@/lib/referrals'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

      // Ensure referral code exists (backfill for older installers)
      let referralCode = installer.referralCode || null
      try {
        referralCode = await ensureInstallerReferralCode(installerId)
      } catch (err) {
        console.error('Failed to ensure referral code:', err)
      }

      // Basic referral stats
      let referralsCount = 0
      try {
        referralsCount = await prisma.installer.count({
          where: { referredByInstallerId: installerId },
        })
      } catch (err) {
        console.error('Failed to compute referralsCount:', err)
    }

      console.log('Installer found:', installer.email)
      return NextResponse.json({
        installer: {
          ...installer,
          referralCode,
          referralsCount,
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
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
    
    try {
      data = await request.json()

      // Extract meta fields that should not be persisted
      if (data?._approvalSource !== undefined) {
        approvalSource = typeof data._approvalSource === 'string' ? data._approvalSource : null
        delete data._approvalSource
      }

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

        const uniq = Array.from(new Set(cleaned))
        uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        data.automobileLiabilityExpiryDates = uniq.length > 0 ? JSON.stringify(uniq) : null

        // Keep the single-date field in sync for legacy logic (earliest date)
        data.automobileLiabilityExpiry = uniq.length > 0 ? new Date(uniq[0]) : null
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

        const uniq = Array.from(new Set(cleaned))
        uniq.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        data.workersCompExemExpiryDates = uniq.length > 0 ? JSON.stringify(uniq) : null
        data.workersCompExemExpiry = uniq.length > 0 ? new Date(uniq[0]) : null
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
      cleanedData = {}
      for (const key in data) {
        if (data[key] !== undefined) {
          // For required string fields, ensure they're not empty
          if ((key === 'firstName' || key === 'lastName' || key === 'email') && data[key] === '') {
            return NextResponse.json(
              { 
                error: 'Validation error',
                details: `${key} cannot be empty`,
                code: 'VALIDATION_ERROR'
              },
              { status: 400 }
            )
          }
          cleanedData[key] = data[key]
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

    // Log what we're trying to update (for debugging)
    console.log('Updating installer:', installerId)
    console.log('Update data keys:', Object.keys(cleanedData))
    console.log('Update data:', JSON.stringify(cleanedData, null, 2))

    try {
      // Admins (NextAuth session) can update immediately.
      let adminEmail: string | null = null
      try {
        const session = await getServerSession(authOptions)
        const email = session?.user?.email?.toLowerCase()
        if (email) {
          const admin = await prisma.admin.findUnique({ where: { email } })
          if (admin?.isActive) adminEmail = email
        }
      } catch (e) {
        // ignore session errors and fall back to installer token auth
      }

      if (adminEmail) {
        const installer = await prisma.installer.update({
          where: { id: installerId },
          data: cleanedData,
        })
        console.log('Installer updated successfully (admin)')
        return NextResponse.json({ installer })
      }

      // Installers must submit updates as a pending change request (requires token).
      const token = getInstallerTokenFromRequest(request)
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', details: 'Missing installer token' },
          { status: 401 }
        )
      }

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

      // Only allow a safe whitelist of fields from installer submissions
      const filtered: Record<string, any> = {}
      for (const [key, value] of Object.entries(cleanedData)) {
        if (INSTALLER_ALLOWED_UPDATE_FIELDS.has(key)) {
          // Ensure JSON-serializable values for Prisma Json field
          if (value instanceof Date) {
            filtered[key] = value.toISOString()
          } else {
            filtered[key] = value
          }
        }
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json(
          {
            error: 'No allowed fields to update',
            details: 'The submitted changes do not contain any fields that require approval.',
          },
          { status: 400 }
        )
      }

      const changeRequest = await prisma.installerChangeRequest.create({
        data: {
          installerId,
          status: 'pending',
          source: approvalSource,
          payload: filtered,
          submittedBy: (payload.email || payload.username || null) as string | null,
        },
      })

      console.log('Installer change request created:', changeRequest.id)
      return NextResponse.json({
        success: true,
        pendingApproval: true,
        requestId: changeRequest.id,
        message: 'Changes submitted for admin approval',
      })
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





