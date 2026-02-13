import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

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

      console.log('Installer found:', installer.email)
    return NextResponse.json({ installer })
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

    let data
    try {
      data = await request.json()

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
      const dateFields = ['llrpExpiry', 'btrExpiry', 'workersCompExemExpiry', 'generalLiabilityExpiry', 'automobileLiabilityExpiry', 'employersLiabilityExpiry', 'paymentAuthorizationDate', 'preferredStartDate']
      for (const field of dateFields) {
        if (data[field] !== undefined) {
          if (data[field] === null || data[field] === '') {
            data[field] = null
          } else if (typeof data[field] === 'string' && data[field].trim() !== '') {
            try {
              const date = new Date(data[field])
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
    const installer = await prisma.installer.update({
      where: { id: installerId },
      data,
    })

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





