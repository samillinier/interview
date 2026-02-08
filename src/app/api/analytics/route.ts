import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Get all installers with their data
    const installers = await prisma.installer.findMany({
      include: {
        interviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
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

    // Registration trends (last 6 months)
    const months: string[] = []
    const monthCounts: Record<string, number> = {}
    const now = new Date()
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
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
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
    })
  } catch (error: any) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    )
  }
}
