import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all installers with their related data
    const installers = await prisma.installer.findMany({
      include: {
        Document: true,
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
      generalLiability: installers.filter(i => i.hasGeneralLiability === true).length,
      commercialAuto: installers.filter(i => i.hasCommercialAutoLiability === true).length,
      workersComp: installers.filter(i => i.hasWorkersComp === true).length,
      workersCompExemption: installers.filter(i => i.hasWorkersCompExemption === true).length,
      sunbizRegistered: installers.filter(i => i.isSunbizRegistered === true).length,
      sunbizActive: installers.filter(i => i.isSunbizActive === true).length,
      businessLicense: installers.filter(i => i.hasBusinessLicense === true).length,
    }

    // Certificate expiry tracking
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const certificateExpiry = {
      expiring30Days: installers.filter(i => {
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
      expiring60Days: installers.filter(i => {
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
      expiring90Days: installers.filter(i => {
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
      expired: installers.filter(i => {
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
    const allDocuments = installers.flatMap(i => i.Document || [])
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
      totalStaffMembers: installers.reduce((sum, i) => sum + (i.StaffMember?.length || 0), 0),
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
    const allInterviews = installers.flatMap(i => i.Interview || [])
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
        const withDocuments = installers.filter(i => (i.Document?.length || 0) > 0).length
        return totalInstallers > 0 ? (withDocuments / totalInstallers) * 100 : 0
      })(),
      totalDocuments: allDocuments.length,
      averageDocumentsPerInstaller: totalInstallers > 0 ? allDocuments.length / totalInstallers : 0,
    }

    // Notification engagement
    const allNotifications = installers.flatMap(i => i.Notification || [])
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

    // 7. Job & Application Analytics
    const allJobApplications = installers.flatMap(i => i.JobApplication || [])
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

    return NextResponse.json({
      totalInstallers,
      qualified: installers.filter(i => i.status === 'passed' || i.status === 'qualified').length,
      notQualified: installers.filter(i => i.status === 'failed').length,
      pending: installers.filter(i => i.status === 'pending' || !i.status).length,
      averageExperience,
      totalExperience,
      statusDistribution,
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
      installationCapabilities,
      engagementAnalytics,
      notificationEngagement,
      paymentAnalytics,
      jobAnalytics,
      qualityAnalytics,
      backgroundAnalytics,
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    )
  }
}
