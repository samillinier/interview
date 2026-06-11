import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/** Always compute from DB; avoid CDN/browser serving stale totals on production. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function GET(request: NextRequest) {
  try {
    // Get all installers with their related data
    const installers = await prisma.installer.findMany({
      include: {
        Interview: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        Document: true,
        InstallerAgreement: true,
        StaffMember: true,
        Notification: true,
        JobApplication: true,
      },
    })

    const totalInstallers = installers.length

    // Status distribution
    const statusCounts: Record<string, number> = {}
    installers.forEach(installer => {
      const status = installer.status || 'pending'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }))

    // Tracker stage distribution
    const trackerStageCounts: Record<string, number> = {}
    installers.forEach(installer => {
      const stage = installer.trackerStage || 'PENDING'
      trackerStageCounts[stage] = (trackerStageCounts[stage] || 0) + 1
    })
    const trackerStageDistribution = Object.entries(trackerStageCounts)
      .map(([stage, count]) => ({ stage, count }))
      .sort((a, b) => b.count - a.count)

    // Experience distribution
    const experienceRanges = [
      { range: '0-5 years', min: 0, max: 5 },
      { range: '6-10 years', min: 6, max: 10 },
      { range: '11-15 years', min: 11, max: 15 },
      { range: '16-20 years', min: 16, max: 20 },
      { range: '21-25 years', min: 21, max: 25 },
      { range: '26+ years', min: 26, max: 999 },
    ]

    const experienceDistribution = experienceRanges.map(range => ({
      range: range.range,
      count: installers.filter(
        i => i.yearsOfExperience && i.yearsOfExperience >= range.min && i.yearsOfExperience <= range.max
      ).length,
    }))

    // Flooring skills breakdown
    const skillsCount: Record<string, number> = {}
    installers.forEach(installer => {
      if (installer.flooringSkills) {
        const skills = installer.flooringSkills.split(',').map(s => s.trim())
        skills.forEach(skill => {
          if (skill) {
            skillsCount[skill] = (skillsCount[skill] || 0) + 1
          }
        })
      }
    })
    const flooringSkillsBreakdown = Object.entries(skillsCount)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)

    // Get current date once for all date calculations
    const now = new Date()
    const activeInstallers = installers.filter((i) => (i.status || '').toLowerCase() === 'active')

    // Registration trends (last 6 months)
    const months: string[] = []
    const monthCounts: Record<string, number> = {}
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      months.push(monthKey)
      monthCounts[monthKey] = 0
    }

    installers.forEach(installer => {
      if (installer.createdAt) {
        const createdDate = new Date(installer.createdAt)
        const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        if (monthCounts.hasOwnProperty(monthKey)) {
          monthCounts[monthKey]++
        }
      }
    })

    const registrationTrends = months.map(month => ({
      month,
      count: monthCounts[month] || 0,
    }))

    // State distribution
    const stateCounts: Record<string, number> = {}
    installers.forEach(installer => {
      if (installer.companyState) {
        stateCounts[installer.companyState] = (stateCounts[installer.companyState] || 0) + 1
      }
    })
    const stateDistribution = Object.entries(stateCounts)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)

    // Installation categories
    const installationCategories = {
      carpet: installers.filter(i => i.wantsToAddCarpet === true).length,
      hardwood: installers.filter(i => i.wantsToAddHardwood === true).length,
      laminate: installers.filter(i => i.wantsToAddLaminate === true).length,
      vinyl: installers.filter(i => i.wantsToAddVinyl === true).length,
      tile: installers.filter(i => i.wantsToAddTile === true).length,
    }

    // Recent registrations (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentRegistrations = installers.filter(
      installer => installer.createdAt && new Date(installer.createdAt) >= thirtyDaysAgo
    ).length

    // Accounts with photos
    const accountsWithPhotos = installers.filter(i => i.photoUrl).length

    // Accounts with payment info
    const accountsWithPaymentInfo = installers.filter(
      i => i.paymentAccountNumber && i.paymentRoutingNumber
    ).length

    // Calculate average experience
    const experiences = installers
      .map(i => i.yearsOfExperience)
      .filter((exp): exp is number => exp !== null && exp !== undefined)
    const averageExperience = experiences.length > 0
      ? experiences.reduce((a, b) => a + b, 0) / experiences.length
      : 0
    const totalExperience = experiences.reduce((a, b) => a + b, 0)

    // ========== NEW ANALYTICS ==========
    
    // 1. Insurance & Compliance Analytics
    const insuranceCoverage = {
      generalLiability: activeInstallers.filter(i => i.hasGeneralLiability === true).length,
      commercialAuto: activeInstallers.filter(i => i.hasCommercialAutoLiability === true).length,
      workersComp: activeInstallers.filter(i => i.hasWorkersComp === true).length,
      workersCompExemption: activeInstallers.filter(i => i.hasWorkersCompExemption === true).length,
      sunbizRegistered: activeInstallers.filter(i => i.isSunbizRegistered === true).length,
      sunbizActive: activeInstallers.filter(i => i.isSunbizActive === true).length,
      businessLicense: activeInstallers.filter(i => i.hasBusinessLicense === true).length,
    }

    // Certificate expiry tracking
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const certificateExpiry = {
      expiring30Days: activeInstallers.filter(i => {
        const expiries = [
          i.llrpExpiry,
          i.btrExpiry,
          i.workersCompExemExpiry,
          i.generalLiabilityExpiry,
          i.automobileLiabilityExpiry,
          i.employersLiabilityExpiry,
          i.licenseExpiry,
        ].filter(Boolean) as Date[]
        return expiries.some(exp => exp && exp > now && exp <= thirtyDaysFromNow)
      }).length,
      expiring60Days: activeInstallers.filter(i => {
        const expiries = [
          i.llrpExpiry,
          i.btrExpiry,
          i.workersCompExemExpiry,
          i.generalLiabilityExpiry,
          i.automobileLiabilityExpiry,
          i.employersLiabilityExpiry,
          i.licenseExpiry,
        ].filter(Boolean) as Date[]
        return expiries.some(exp => exp && exp > now && exp <= sixtyDaysFromNow)
      }).length,
      expiring90Days: activeInstallers.filter(i => {
        const expiries = [
          i.llrpExpiry,
          i.btrExpiry,
          i.workersCompExemExpiry,
          i.generalLiabilityExpiry,
          i.automobileLiabilityExpiry,
          i.employersLiabilityExpiry,
          i.licenseExpiry,
        ].filter(Boolean) as Date[]
        return expiries.some(exp => exp && exp > now && exp <= ninetyDaysFromNow)
      }).length,
      expired: activeInstallers.filter(i => {
        const expiries = [
          i.llrpExpiry,
          i.btrExpiry,
          i.workersCompExemExpiry,
          i.generalLiabilityExpiry,
          i.automobileLiabilityExpiry,
          i.employersLiabilityExpiry,
          i.licenseExpiry,
        ].filter(Boolean) as Date[]
        return expiries.some(exp => exp && exp <= now)
      }).length,
    }

    // Document verification status
    const allDocuments = installers.flatMap(i => i.Document)
    const documentVerification = {
      total: allDocuments.length,
      verified: allDocuments.filter(d => d.verified === true).length,
      unverified: allDocuments.filter(d => d.verified === false).length,
      withActiveLink: allDocuments.filter(d => d.verificationLinkStatus === 'active').length,
      withExpiredLink: allDocuments.filter(d => d.verificationLinkStatus === 'expired').length,
      withPendingLink: allDocuments.filter(d => d.verificationLinkStatus === 'pending').length,
    }

    // 2. Crew & Capacity Analytics
    const crewAnalytics = {
      withCrew: installers.filter(i => i.hasOwnCrew === true).length,
      withoutCrew: installers.filter(i => i.hasOwnCrew === false).length,
      averageCrewSize: (() => {
        const crewSizes = installers
          .filter(i => i.crewSize !== null && i.crewSize !== undefined)
          .map(i => i.crewSize!)
        return crewSizes.length > 0
          ? crewSizes.reduce((a, b) => a + b, 0) / crewSizes.length
          : 0
      })(),
      totalWorkforce: installers.reduce((sum, i) => sum + (i.crewSize || 0), 0) + installers.length,
      withTools: installers.filter(i => i.hasOwnTools === true).length,
      withVehicles: installers.filter(i => i.hasVehicle === true).length,
      totalStaffMembers: installers.reduce((sum, i) => sum + i.StaffMember.length, 0),
      installersWithTeams: installers.filter(i => i.StaffMember.length > 0).length,
    }

    // 3. Service & Availability Analytics
    const availabilityAnalytics = {
      fullTime: installers.filter(i => i.availability === 'full-time').length,
      partTime: installers.filter(i => i.availability === 'part-time').length,
      contract: installers.filter(i => i.availability === 'contract').length,
      canStartImmediately: installers.filter(i => i.canStartImmediately === true).length,
      willingToTravel: installers.filter(i => i.willingToTravel === true).length,
      averageMaxTravelDistance: (() => {
        const distances = installers
          .filter(i => i.maxTravelDistance !== null && i.maxTravelDistance !== undefined)
          .map(i => i.maxTravelDistance!)
        return distances.length > 0
          ? distances.reduce((a, b) => a + b, 0) / distances.length
          : 0
      })(),
    }

    // Service areas breakdown
    const serviceAreaCounts: Record<string, number> = {}
    installers.forEach(installer => {
      if (installer.serviceAreas) {
        try {
          const areas = JSON.parse(installer.serviceAreas)
          if (Array.isArray(areas)) {
            areas.forEach((area: string) => {
              if (area) {
                serviceAreaCounts[area] = (serviceAreaCounts[area] || 0) + 1
              }
            })
          }
        } catch {
          // If not JSON, treat as comma-separated
          const areas = installer.serviceAreas.split(',').map(a => a.trim())
          areas.forEach(area => {
            if (area) {
              serviceAreaCounts[area] = (serviceAreaCounts[area] || 0) + 1
            }
          })
        }
      }
    })
    const topServiceAreas = Object.entries(serviceAreaCounts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Workroom distribution
    const workroomCounts: Record<string, number> = {}
    installers.forEach(installer => {
      if (installer.workroom) {
        workroomCounts[installer.workroom] = (workroomCounts[installer.workroom] || 0) + 1
      }
    })
    const workroomDistribution = Object.entries(workroomCounts)
      .map(([workroom, count]) => ({ workroom, count }))
      .sort((a, b) => b.count - a.count)

    // County distribution
    const countyCounts: Record<string, number> = {}
    installers.forEach(installer => {
      const county = (installer.companyCounty || '').trim()
      if (county) {
        countyCounts[county] = (countyCounts[county] || 0) + 1
      }
    })
    const countyDistribution = Object.entries(countyCounts)
      .map(([county, count]) => ({ county, count }))
      .sort((a, b) => b.count - a.count)

    const workroomCoords: Record<string, { lat: number; lng: number }> = {
      albany: { lat: 31.5785, lng: -84.1557 },
      sarasota: { lat: 27.3364, lng: -82.5307 },
      tampa: { lat: 27.9506, lng: -82.4572 },
      naples: { lat: 26.142, lng: -81.7948 },
      ocala: { lat: 29.1872, lng: -82.1401 },
      lakeland: { lat: 28.0395, lng: -81.9498 },
      'panama city': { lat: 30.1588, lng: -85.6602 },
      gainesville: { lat: 29.6516, lng: -82.3248 },
      tallahassee: { lat: 30.4383, lng: -84.2807 },
      dothan: { lat: 31.2232, lng: -85.3905 },
    }
    const countyCoords: Record<string, { lat: number; lng: number }> = {
      hillsborough: { lat: 27.9904, lng: -82.3018 },
      pinellas: { lat: 27.8764, lng: -82.7779 },
      sarasota: { lat: 27.1845, lng: -82.3658 },
      manatee: { lat: 27.4823, lng: -82.354 },
      pasco: { lat: 28.3016, lng: -82.4572 },
      polk: { lat: 27.9886, lng: -81.6974 },
      orange: { lat: 28.5383, lng: -81.3792 },
      miami_dade: { lat: 25.7617, lng: -80.1918 },
      broward: { lat: 26.1901, lng: -80.3659 },
      palm_beach: { lat: 26.7056, lng: -80.0364 },
      collier: { lat: 26.1732, lng: -81.8079 },
      lee: { lat: 26.6406, lng: -81.8723 },
      alachua: { lat: 29.6516, lng: -82.3248 },
      leon: { lat: 30.4383, lng: -84.2807 },
      bay: { lat: 30.1805, lng: -85.6846 },
    }
    const normalizeCountyKey = (name: string) =>
      (name || '')
        .toLowerCase()
        .replace(/\bcounty\b/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')

    // Travel radius distribution (map radius readiness)
    const travelRadiusDistribution = [
      { range: '0-25 mi', count: 0 },
      { range: '26-50 mi', count: 0 },
      { range: '51-100 mi', count: 0 },
      { range: '100+ mi', count: 0 },
      { range: 'Not provided', count: 0 },
    ]
    installers.forEach(installer => {
      const d = installer.maxTravelDistance
      if (d === null || d === undefined) travelRadiusDistribution[4].count++
      else if (d <= 25) travelRadiusDistribution[0].count++
      else if (d <= 50) travelRadiusDistribution[1].count++
      else if (d <= 100) travelRadiusDistribution[2].count++
      else travelRadiusDistribution[3].count++
    })

    // Geo pins for map (workroom + county centroids)
    const workroomPins = Object.entries(workroomCounts)
      .map(([workroom, count]) => {
        const c = workroomCoords[workroom.toLowerCase()]
        if (!c) return null
        const installersInGroup = installers.filter(i => (i.workroom || '').toLowerCase() === workroom.toLowerCase())
        const distances = installersInGroup
          .map(i => i.maxTravelDistance)
          .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
        const avgRadiusMiles = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0
        return { label: workroom, type: 'workroom' as const, lat: c.lat, lng: c.lng, count, avgRadiusMiles }
      })
      .filter((v): v is { label: string; type: 'workroom'; lat: number; lng: number; count: number; avgRadiusMiles: number } => v !== null)

    const countyPins = Object.entries(countyCounts)
      .map(([county, count]) => {
        const c = countyCoords[normalizeCountyKey(county)]
        if (!c) return null
        const installersInGroup = installers.filter(i => (i.companyCounty || '').trim().toLowerCase() === county.toLowerCase())
        const distances = installersInGroup
          .map(i => i.maxTravelDistance)
          .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v))
        const avgRadiusMiles = distances.length ? distances.reduce((a, b) => a + b, 0) / distances.length : 0
        return { label: county, type: 'county' as const, lat: c.lat, lng: c.lng, count, avgRadiusMiles }
      })
      .filter((v): v is { label: string; type: 'county'; lat: number; lng: number; count: number; avgRadiusMiles: number } => v !== null)

    const geoPins = [...workroomPins, ...countyPins]
      .sort((a, b) => b.count - a.count)
      .slice(0, 60)

    // Document/certificate compliance analytics
    const normalizeDocType = (type: string): string => {
      const t = (type || '').toLowerCase().trim()
      if (t === 'w9' || t === 'w-9' || t === 'form-w-9') return 'w9'
      if (t === 'workers_comp' || t === 'workers_compensation') return 'workers_comp'
      if (t === 'business_tax_receipt' || t === 'btr' || t === 'business_registration') return 'business_registration'
      return t
    }
    const docTypeToLabel: Record<string, string> = {
      sunbiz: 'Sunbiz',
      business_registration: 'Business Tax Receipt',
      liability_insurance: 'Liability Insurance',
      w9: 'W-9 Form',
      workers_comp: 'Workers Compensation',
      auto_insurance: 'Auto Insurance',
      workers_comp_certificate: 'Workers Compensation Certificate',
      lead_firm_certificate: 'Lead Firm Certificate',
      lrrp: 'Lead Renovator Certificate',
      employers_liability: 'Employer Liability Insurance',
    }
    const complianceDocumentTypes = Object.keys(docTypeToLabel)
    const complianceDocuments = complianceDocumentTypes.map((docType) => {
      const docs = allDocuments.filter(d => normalizeDocType(d.type) === docType)
      const installersWithDoc = new Set(docs.map(d => d.installerId)).size
      const withExpiry = docs.filter(d => !!d.expiryDate).length
      const expired = docs.filter(d => d.expiryDate && new Date(d.expiryDate) <= now).length
      const expiring30Days = docs.filter(d => {
        if (!d.expiryDate) return false
        const ex = new Date(d.expiryDate)
        return ex > now && ex <= thirtyDaysFromNow
      }).length
      return {
        type: docType,
        label: docTypeToLabel[docType],
        totalUploaded: docs.length,
        installersWithDoc,
        withExpiry,
        expired,
        expiring30Days,
      }
    })

    // 4. Installation Capabilities Analytics
    const installationCapabilities = {
      multiCategory: {
        twoPlus: installers.filter(i => {
          const categories = [
            i.wantsToAddCarpet,
            i.wantsToAddHardwood,
            i.wantsToAddLaminate,
            i.wantsToAddVinyl,
            i.wantsToAddTile,
          ].filter(Boolean).length
          return categories >= 2
        }).length,
        threePlus: installers.filter(i => {
          const categories = [
            i.wantsToAddCarpet,
            i.wantsToAddHardwood,
            i.wantsToAddLaminate,
            i.wantsToAddVinyl,
            i.wantsToAddTile,
          ].filter(Boolean).length
          return categories >= 3
        }).length,
        fourPlus: installers.filter(i => {
          const categories = [
            i.wantsToAddCarpet,
            i.wantsToAddHardwood,
            i.wantsToAddLaminate,
            i.wantsToAddVinyl,
            i.wantsToAddTile,
          ].filter(Boolean).length
          return categories >= 4
        }).length,
      },
      dailyCapacity: {
        carpet: (() => {
          const capacities = installers
            .filter(i => i.dailyStretchInCarpetSqft !== null && i.dailyStretchInCarpetSqft !== undefined)
            .map(i => i.dailyStretchInCarpetSqft!)
          return capacities.length > 0
            ? capacities.reduce((a, b) => a + b, 0) / capacities.length
            : 0
        })(),
        hardwood: (() => {
          const capacities = installers
            .filter(i => i.dailyNailDownSolidHardwoodSqft !== null && i.dailyNailDownSolidHardwoodSqft !== undefined)
            .map(i => i.dailyNailDownSolidHardwoodSqft!)
          return capacities.length > 0
            ? capacities.reduce((a, b) => a + b, 0) / capacities.length
            : 0
        })(),
        laminate: (() => {
          const capacities = installers
            .filter(i => i.dailyLaminateSqft !== null && i.dailyLaminateSqft !== undefined)
            .map(i => i.dailyLaminateSqft!)
          return capacities.length > 0
            ? capacities.reduce((a, b) => a + b, 0) / capacities.length
            : 0
        })(),
        vinyl: (() => {
          const capacities = installers
            .filter(i => i.dailyLuxuryVinylPlankSqft !== null && i.dailyLuxuryVinylPlankSqft !== undefined)
            .map(i => i.dailyLuxuryVinylPlankSqft!)
          return capacities.length > 0
            ? capacities.reduce((a, b) => a + b, 0) / capacities.length
            : 0
        })(),
        tile: (() => {
          const capacities = installers
            .filter(i => i.dailyCeramicTileSqft !== null && i.dailyCeramicTileSqft !== undefined)
            .map(i => i.dailyCeramicTileSqft!)
          return capacities.length > 0
            ? capacities.reduce((a, b) => a + b, 0) / capacities.length
            : 0
        })(),
      },
      stairInstallation: installers.filter(i => i.installsLaminateOnStairs === true || i.installsTileBacksplash === true).length,
    }

    // 5. Engagement & Communication Analytics
    const allInterviews = installers.flatMap(i => i.Interview)
    const engagementAnalytics = {
      interviewCompletionRate: (() => {
        const completed = allInterviews.filter(i => i.status === 'completed').length
        const total = allInterviews.length
        return total > 0 ? (completed / total) * 100 : 0
      })(),
      totalInterviews: allInterviews.length,
      completedInterviews: allInterviews.filter(i => i.status === 'completed').length,
      abandonedInterviews: allInterviews.filter(i => i.status === 'abandoned').length,
      averageInterviewDuration: (() => {
        const durations = allInterviews
          .filter(i => i.completedAt && i.startedAt)
          .map(i => {
            const start = new Date(i.startedAt).getTime()
            const end = new Date(i.completedAt!).getTime()
            return (end - start) / 1000 / 60 // minutes
          })
        return durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0
      })(),
      documentUploadRate: (() => {
        const withDocuments = installers.filter(i => i.Document.length > 0).length
        return totalInstallers > 0 ? (withDocuments / totalInstallers) * 100 : 0
      })(),
      totalDocuments: allDocuments.length,
      averageDocumentsPerInstaller: totalInstallers > 0 ? allDocuments.length / totalInstallers : 0,
    }

    // Notification engagement
    const allNotifications = installers.flatMap(i => i.Notification)
    const notificationEngagement = {
      total: allNotifications.length,
      read: allNotifications.filter(n => n.isRead === true).length,
      unread: allNotifications.filter(n => n.isRead === false).length,
      readRate: allNotifications.length > 0
        ? (allNotifications.filter(n => n.isRead === true).length / allNotifications.length) * 100
        : 0,
      byType: {
        notification: allNotifications.filter(n => n.type === 'notification').length,
        message: allNotifications.filter(n => n.type === 'message').length,
        news: allNotifications.filter(n => n.type === 'news').length,
        job: allNotifications.filter(n => n.type === 'job').length,
      },
    }

    // 6. Payment & Account Setup Analytics
    const paymentAnalytics = {
      withPaymentInfo: accountsWithPaymentInfo,
      paymentCompletionRate: totalInstallers > 0 ? (accountsWithPaymentInfo / totalInstallers) * 100 : 0,
      emailVerified: installers.filter(i => i.emailVerifiedAt !== null).length,
      emailVerificationRate: totalInstallers > 0
        ? (installers.filter(i => i.emailVerifiedAt !== null).length / totalInstallers) * 100
        : 0,
      withPhotos: accountsWithPhotos,
      photoUploadRate: totalInstallers > 0 ? (accountsWithPhotos / totalInstallers) * 100 : 0,
      ndaAgreed: installers.filter(i => i.ndaAgreedAt !== null).length,
      serviceAgreementSigned: installers.filter(i => i.serviceAgreementSignedAt !== null).length,
    }

    // 6.1 Agreement signature analytics (Independent Contractor Services Agreement)
    const allAgreements = installers.flatMap(i => i.InstallerAgreement || [])
    const independentContractorAgreements = allAgreements.filter(
      (a: any) => a.type === 'independent-contractor-services-agreement'
    )
    const agreementAnalytics = {
      independentContractor: {
        totalRecords: independentContractorAgreements.length,
        signed: independentContractorAgreements.filter((a: any) => !!a.signedAt).length,
        notSigned: independentContractorAgreements.filter((a: any) => !a.signedAt).length,
        approved: independentContractorAgreements.filter((a: any) => a.status === 'approved').length,
        pendingAdmin: independentContractorAgreements.filter((a: any) => a.status === 'pending_admin').length,
        draft: independentContractorAgreements.filter((a: any) => a.status === 'draft').length,
        withoutRecord: installers.filter(
          (i: any) => !(i.InstallerAgreement || []).some((a: any) => a.type === 'independent-contractor-services-agreement')
        ).length,
      },
    }

    // Profile completeness analytics
    const completionFields: Array<keyof typeof installers[number]> = [
      'phone',
      'workroom',
      'companyName',
      'companyCounty',
      'companyState',
      'yearsOfExperience',
      'flooringSkills',
      'hasGeneralLiability',
      'hasCommercialAutoLiability',
      'hasWorkersComp',
      'isSunbizRegistered',
      'hasBusinessLicense',
      'canPassBackgroundCheck',
      'paymentAccountNumber',
      'paymentRoutingNumber',
      'photoUrl',
    ]
    const completionByInstaller = installers.map((i: any) => {
      let filled = 0
      for (const f of completionFields) {
        const v = i[f]
        if (typeof v === 'boolean') {
          if (v === true) filled++
        } else if (typeof v === 'number') {
          if (!Number.isNaN(v)) filled++
        } else if (v !== null && v !== undefined && String(v).trim() !== '') {
          filled++
        }
      }
      const percent = (filled / completionFields.length) * 100
      return percent
    })
    const profileCompletionAnalytics = {
      averageCompletionPercent:
        completionByInstaller.length > 0
          ? completionByInstaller.reduce((a, b) => a + b, 0) / completionByInstaller.length
          : 0,
      highCompletion: completionByInstaller.filter((p) => p >= 80).length,
      mediumCompletion: completionByInstaller.filter((p) => p >= 50 && p < 80).length,
      lowCompletion: completionByInstaller.filter((p) => p < 50).length,
    }

    // 7. Job & Application Analytics
    const allJobApplications = installers.flatMap(i => i.JobApplication)
    const jobAnalytics = {
      totalApplications: allJobApplications.length,
      applicationStatus: {
        pending: allJobApplications.filter(a => a.status === 'pending').length,
        reviewed: allJobApplications.filter(a => a.status === 'reviewed').length,
        accepted: allJobApplications.filter(a => a.status === 'accepted').length,
        rejected: allJobApplications.filter(a => a.status === 'rejected').length,
      },
      applicationsPerInstaller: totalInstallers > 0 ? allJobApplications.length / totalInstallers : 0,
    }

    // 8. Quality & Scoring Analytics
    const qualityAnalytics = {
      averageScore: (() => {
        const scores = installers
          .filter(i => i.overallScore !== null && i.overallScore !== undefined)
          .map(i => i.overallScore!)
        return scores.length > 0
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : 0
      })(),
      scoreDistribution: {
        excellent: installers.filter(i => i.overallScore !== null && i.overallScore! >= 80).length,
        good: installers.filter(i => i.overallScore !== null && i.overallScore! >= 60 && i.overallScore! < 80).length,
        fair: installers.filter(i => i.overallScore !== null && i.overallScore! >= 40 && i.overallScore! < 60).length,
        poor: installers.filter(i => i.overallScore !== null && i.overallScore! < 40).length,
      },
      averageScoreByStatus: {
        qualified: (() => {
          const qualified = installers.filter(i => i.status === 'passed' || i.status === 'qualified')
          const scores = qualified
            .filter(i => i.overallScore !== null && i.overallScore !== undefined)
            .map(i => i.overallScore!)
          return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        })(),
        notQualified: (() => {
          const notQualified = installers.filter(i => i.status === 'failed')
          const scores = notQualified
            .filter(i => i.overallScore !== null && i.overallScore !== undefined)
            .map(i => i.overallScore!)
          return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        })(),
      },
    }

    // 9. Background & Safety Analytics
    const backgroundAnalytics = {
      canPassBackgroundCheck: installers.filter(i => i.canPassBackgroundCheck === true).length,
      cannotPassBackgroundCheck: installers.filter(i => i.canPassBackgroundCheck === false).length,
      backgroundCheckNotProvided: installers.filter(i => i.canPassBackgroundCheck === null).length,
      safetyCompliance: installers.filter(i => 
        i.hasGeneralLiability === true && 
        i.hasLicense === true && 
        (i.canPassBackgroundCheck === true || i.canPassBackgroundCheck === null)
      ).length,
    }

    // 10. Registration by weekday & by calendar month (all signups, server-local dates)
    const weekdayOrder = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ] as const
    const weekdayBucket: Record<string, number> = {}
    weekdayOrder.forEach((d) => {
      weekdayBucket[d] = 0
    })
    const monthBucket = Array.from({ length: 12 }, () => 0)
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    installers.forEach((installer) => {
      const created = new Date(installer.createdAt)
      const jsDay = created.getDay() // 0 Sun … 6 Sat
      const monIdx = jsDay === 0 ? 6 : jsDay - 1
      weekdayBucket[weekdayOrder[monIdx]]++
      monthBucket[created.getMonth()]++
    })

    const registrationByWeekday = weekdayOrder.map((day) => ({
      day,
      count: weekdayBucket[day] || 0,
    }))
    const registrationByCalendarMonth = monthLabels.map((month, i) => ({
      month,
      count: monthBucket[i] || 0,
    }))

    return NextResponse.json(
      {
      totalInstallers,
      qualified: installers.filter(i => i.status === 'passed' || i.status === 'qualified').length,
      notQualified: installers.filter(i => i.status === 'failed').length,
      pending: installers.filter(i => i.status === 'pending' || !i.status).length,
      averageExperience,
      totalExperience,
      statusDistribution,
      trackerStageDistribution,
      experienceDistribution,
      flooringSkillsBreakdown,
      registrationTrends,
      stateDistribution,
      installationCategories,
      recentRegistrations,
      accountsWithPhotos,
      accountsWithPaymentInfo,
      // New analytics
      insuranceCoverage,
      certificateExpiry,
      documentVerification,
      crewAnalytics,
      availabilityAnalytics,
      topServiceAreas,
      workroomDistribution,
      countyDistribution,
      travelRadiusDistribution,
      geoPins,
      complianceDocuments,
      installationCapabilities,
      engagementAnalytics,
      notificationEngagement,
      paymentAnalytics,
      agreementAnalytics,
      profileCompletionAnalytics,
      jobAnalytics,
      qualityAnalytics,
      backgroundAnalytics,
      registrationByWeekday,
      registrationByCalendarMonth,
    },
      { headers: noStoreHeaders }
    )
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500, headers: noStoreHeaders }
    )
  }
}
