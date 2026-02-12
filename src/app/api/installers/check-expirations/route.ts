import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Helper function to get expiration status
function getExpirationStatus(expiryDate: Date | null | undefined): 'valid' | 'expiring' | 'expired' | 'none' {
  if (!expiryDate) return 'none'
  
  const expiry = new Date(expiryDate)
  const today = new Date()
  
  // Set both dates to start of day for accurate comparison
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  
  // Check if expired (past date) - compare full date including year, month, and day
  if (expiry < today) {
    return 'expired'
  }
  
  // Calculate the difference in months between today and expiry date
  const yearsDiff = expiry.getFullYear() - today.getFullYear()
  const monthsDiff = expiry.getMonth() - today.getMonth()
  const totalMonthsDiff = yearsDiff * 12 + monthsDiff
  
  // Adjust for day difference - if expiry day is before today's day in the same month, count as one less month
  const daysDiff = expiry.getDate() - today.getDate()
  const adjustedMonthsDiff = daysDiff < 0 ? totalMonthsDiff - 1 : totalMonthsDiff
  
  // If expiry is 0-3 months away, it's expiring soon
  if (adjustedMonthsDiff >= 0 && adjustedMonthsDiff <= 3) {
    return 'expiring'
  }
  
  // If expiry is more than 3 months away, it's valid
  return 'valid'
}

// Get field name for display
function getFieldName(field: string): string {
  const fieldNames: { [key: string]: string } = {
    licenseExpiry: 'License',
    llrpExpiry: 'LLRP',
    btrExpiry: 'BTR',
    workersCompExemExpiry: 'Workers Compensation Exem Certificate',
    generalLiabilityExpiry: 'General Liability',
    automobileLiabilityExpiry: 'Automobile Liability',
    employersLiabilityExpiry: "Employer's Liability",
  }
  return fieldNames[field] || field
}

function parseDateJsonArray(value: unknown): Date[] {
  if (!value || typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return []
    const dates = parsed
      .map((v: any) => new Date(String(v)))
      .filter((d: Date) => !Number.isNaN(d.getTime()))
    dates.sort((a, b) => a.getTime() - b.getTime())
    return dates
  } catch {
    return []
  }
}

// Check for expiring certificates/insurance and send notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { installerId } = body

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Get installer with expiry dates
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        licenseExpiry: true,
        llrpExpiry: true,
        btrExpiry: true,
        workersCompExemExpiry: true,
        workersCompExemExpiryDates: true,
        generalLiabilityExpiry: true,
        automobileLiabilityExpiry: true,
        automobileLiabilityExpiryDates: true,
        employersLiabilityExpiry: true,
      },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    const expiringItems: Array<{ field: string; name: string; expiryDate: Date; status: 'expiring' | 'expired' }> = []

    // Check each expiry field
    const expiryFields: Array<{ key: string; value: Date | null | undefined; nameSuffix?: string }> = [
      { key: 'licenseExpiry', value: (installer as any).licenseExpiry },
      { key: 'llrpExpiry', value: installer.llrpExpiry },
      { key: 'btrExpiry', value: installer.btrExpiry },
      { key: 'workersCompExemExpiry', value: installer.workersCompExemExpiry },
      { key: 'generalLiabilityExpiry', value: installer.generalLiabilityExpiry },
      { key: 'employersLiabilityExpiry', value: installer.employersLiabilityExpiry },
    ]

    // Workers Comp Certificate can have multiple certificates
    const workersCompDates = parseDateJsonArray((installer as any).workersCompExemExpiryDates)
    if (workersCompDates.length > 0) {
      workersCompDates.forEach((d, idx) => {
        expiryFields.push({ key: 'workersCompExemExpiry', value: d, nameSuffix: ` (Cert ${idx + 1})` })
      })
    } else {
      // keep existing single field behavior
      // (already included via workersCompExemExpiry above)
    }

    // Automobile Liability can have multiple policies
    const autoDates = parseDateJsonArray((installer as any).automobileLiabilityExpiryDates)
    if (autoDates.length > 0) {
      autoDates.forEach((d, idx) => {
        expiryFields.push({ key: 'automobileLiabilityExpiry', value: d, nameSuffix: ` (Policy ${idx + 1})` })
      })
    } else {
      expiryFields.push({ key: 'automobileLiabilityExpiry', value: installer.automobileLiabilityExpiry })
    }

    for (const item of expiryFields) {
      const { key, value } = item
      if (value) {
        const status = getExpirationStatus(value)
        // Check for both expiring and expired items
        if (status === 'expiring' || status === 'expired') {
          expiringItems.push({
            field: key,
            name: `${getFieldName(key)}${item.nameSuffix || ''}`,
            expiryDate: value,
            status: status,
          })
        }
      }
    }

    // Separate expired and expiring items
    const expiredItems = expiringItems.filter(item => item.status === 'expired')
    const expiringOnlyItems = expiringItems.filter(item => item.status === 'expiring')
    
    // If there are expired or expiring items, send notifications
    if (expiredItems.length > 0 || expiringOnlyItems.length > 0) {
      const allItems = [...expiredItems, ...expiringOnlyItems]
      const expiryList = allItems
        .map((item) => {
          const dateStr = item.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          return item.status === 'expired' 
            ? `${item.name} (expired ${dateStr})`
            : `${item.name} (expires ${dateStr})`
        })
        .join(', ')
      
      const title = expiredItems.length > 0 
        ? 'Certificate/Insurance Expired or Expiring Soon'
        : 'Certificate/Insurance Expiring Soon'
      
      const content = expiredItems.length > 0
        ? `Your ${expiryList} ${allItems.length === 1 ? 'has' : 'have'} ${expiredItems.length > 0 ? 'expired or are' : 'are'} expiring soon. Please update ${allItems.length === 1 ? 'it' : 'them'} immediately to maintain your active status.`
        : `Your ${expiryList} ${expiringOnlyItems.length === 1 ? 'is' : 'are'} expiring soon. Please update ${expiringOnlyItems.length === 1 ? 'it' : 'them'} to maintain your active status.`

      // Check if we already sent a notification today for this installer to avoid duplicates
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

        const existingNotification = await prisma.notification.findFirst({
          where: {
            installerId: installer.id,
            type: 'notification',
            title: {
              in: ['Certificate/Insurance Expiring Soon', 'Certificate/Insurance Expired or Expiring Soon'],
            },
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        })

        // Only send notification if we haven't sent one today
        if (!existingNotification) {
          // Send notification to installer
          await prisma.notification.create({
            data: {
              installerId: installer.id,
              type: 'notification',
              title: title,
              content: content,
              priority: expiredItems.length > 0 ? 'urgent' : 'high',
              link: '/installer/profile',
              senderId: 'system',
              senderType: 'admin',
            },
          })
        }

      return NextResponse.json({
        success: true,
        message: existingNotification ? 'Notification already sent today' : 'Notifications sent',
        expiredItems: expiredItems.map((item) => ({
          name: item.name,
          expiryDate: item.expiryDate,
          status: 'expired',
        })),
        expiringItems: expiringOnlyItems.map((item) => ({
          name: item.name,
          expiryDate: item.expiryDate,
          status: 'expiring',
        })),
        count: allItems.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No expiring items found',
      count: 0,
    })
  } catch (error: any) {
    console.error('Error checking expirations:', error)
    return NextResponse.json(
      { error: 'Failed to check expirations', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint to check all installers for expiring items (for admin/cron job)
export async function GET(request: NextRequest) {
  try {
    // Get all installers with expiry dates
    const installers = await prisma.installer.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        licenseExpiry: true,
        llrpExpiry: true,
        btrExpiry: true,
        workersCompExemExpiry: true,
        workersCompExemExpiryDates: true,
        generalLiabilityExpiry: true,
        automobileLiabilityExpiry: true,
        automobileLiabilityExpiryDates: true,
        employersLiabilityExpiry: true,
      },
    })

    const results: Array<{
      installerId: string
      installerName: string
      expiringItems: Array<{ name: string; expiryDate: Date }>
    }> = []

    for (const installer of installers) {
      const expiringItems: Array<{ name: string; expiryDate: Date; status: 'expiring' | 'expired' }> = []

      const expiryFields: Array<{ key: string; value: Date | null | undefined; nameSuffix?: string }> = [
        { key: 'licenseExpiry', value: (installer as any).licenseExpiry },
        { key: 'llrpExpiry', value: installer.llrpExpiry },
        { key: 'btrExpiry', value: installer.btrExpiry },
        { key: 'workersCompExemExpiry', value: installer.workersCompExemExpiry },
        { key: 'generalLiabilityExpiry', value: installer.generalLiabilityExpiry },
        { key: 'employersLiabilityExpiry', value: installer.employersLiabilityExpiry },
      ]

      const workersCompDates = parseDateJsonArray((installer as any).workersCompExemExpiryDates)
      if (workersCompDates.length > 0) {
        workersCompDates.forEach((d, idx) => {
          expiryFields.push({ key: 'workersCompExemExpiry', value: d, nameSuffix: ` (Cert ${idx + 1})` })
        })
      }

      const autoDates = parseDateJsonArray((installer as any).automobileLiabilityExpiryDates)
      if (autoDates.length > 0) {
        autoDates.forEach((d, idx) => {
          expiryFields.push({ key: 'automobileLiabilityExpiry', value: d, nameSuffix: ` (Policy ${idx + 1})` })
        })
      } else {
        expiryFields.push({ key: 'automobileLiabilityExpiry', value: installer.automobileLiabilityExpiry })
      }

      for (const item of expiryFields) {
        const { key, value } = item
        if (value) {
          const status = getExpirationStatus(value)
          if (status === 'expiring' || status === 'expired') {
            expiringItems.push({
              name: `${getFieldName(key)}${item.nameSuffix || ''}`,
              expiryDate: value,
              status: status,
            })
          }
        }
      }

      if (expiringItems.length > 0) {
        // Separate expired and expiring items
        const expiredItems = expiringItems.filter(item => item.status === 'expired')
        const expiringOnlyItems = expiringItems.filter(item => item.status === 'expiring')
        const allItems = [...expiredItems, ...expiringOnlyItems]
        
        // Check if we already sent a notification today for this installer to avoid duplicates
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const existingNotification = await prisma.notification.findFirst({
          where: {
            installerId: installer.id,
            type: 'notification',
            title: {
              in: ['Certificate/Insurance Expiring Soon', 'Certificate/Insurance Expired or Expiring Soon'],
            },
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        })

        // Only send notification if we haven't sent one today
        if (!existingNotification) {
          // Send notification to installer
          const expiryList = allItems
            .map((item) => {
              const dateStr = item.expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              return item.status === 'expired' 
                ? `${item.name} (expired ${dateStr})`
                : `${item.name} (expires ${dateStr})`
            })
            .join(', ')
          
          const title = expiredItems.length > 0 
            ? 'Certificate/Insurance Expired or Expiring Soon'
            : 'Certificate/Insurance Expiring Soon'
          
          const content = expiredItems.length > 0
            ? `Your ${expiryList} ${allItems.length === 1 ? 'has' : 'have'} ${expiredItems.length > 0 ? 'expired or are' : 'are'} expiring soon. Please update ${allItems.length === 1 ? 'it' : 'them'} immediately to maintain your active status.`
            : `Your ${expiryList} ${expiringOnlyItems.length === 1 ? 'is' : 'are'} expiring soon. Please update ${expiringOnlyItems.length === 1 ? 'it' : 'them'} to maintain your active status.`

          await prisma.notification.create({
            data: {
              installerId: installer.id,
              type: 'notification',
              title: title,
              content: content,
              priority: expiredItems.length > 0 ? 'urgent' : 'high',
              link: '/installer/profile',
              senderId: 'system',
              senderType: 'admin',
            },
          })
        }

        results.push({
          installerId: installer.id,
          installerName: `${installer.firstName} ${installer.lastName}`,
          expiringItems,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Checked ${installers.length} installers`,
      notificationsSent: results.length,
      installersWithExpiringItems: results,
    })
  } catch (error: any) {
    console.error('Error checking all expirations:', error)
    return NextResponse.json(
      { error: 'Failed to check expirations', details: error.message },
      { status: 500 }
    )
  }
}
