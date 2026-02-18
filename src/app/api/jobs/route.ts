import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Get all jobs (for admin and installers)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const installerId = searchParams.get('installerId') // For installer view - filter by their status

    const where: any = {}
    if (status !== 'all') {
      where.status = status
    }

    const jobs = await prisma.job.findMany({
      where,
      include: {
        applications: installerId ? {
          where: { installerId },
        } : true,
        _count: {
          select: { JobApplication: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If installerId provided, filter jobs by targetStatus
    let filteredJobs = jobs
    if (installerId) {
      const installer = await prisma.installer.findUnique({
        where: { id: installerId },
        select: { status: true },
      })

      if (installer) {
        filteredJobs = jobs.filter(job => {
          if (!job.targetStatus || job.targetStatus === 'all') return true
          if (job.targetStatus === 'qualified' && (installer.status === 'passed' || installer.status === 'qualified')) return true
          if (job.targetStatus === 'passed' && installer.status === 'passed') return true
          return false
        })
      }
    }

    return NextResponse.json({
      success: true,
      jobs: filteredJobs,
    })
  } catch (error: any) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs', details: error.message },
      { status: 500 }
    )
  }
}

// Create a new job (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      location,
      jobType,
      requirements,
      skills,
      payRange,
      startDate,
      endDate,
      targetStatus,
      benefits,
    } = body

    if (!title || !description || !location || !jobType) {
      return NextResponse.json(
        { error: 'Title, description, location, and job type are required' },
        { status: 400 }
      )
    }

    const job = await prisma.job.create({
      data: {
        title,
        description,
        location,
        jobType,
        requirements: requirements ? JSON.stringify(requirements) : null,
        skills: skills ? JSON.stringify(skills) : null,
        payRange,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targetStatus: targetStatus || 'all',
        benefits: benefits ? JSON.stringify(benefits) : null,
        status: 'active',
      },
    })

    // Send notifications to all eligible installers
    const whereClause: any = {}
    if (targetStatus && targetStatus !== 'all') {
      if (targetStatus === 'qualified') {
        whereClause.status = { in: ['passed', 'qualified'] }
      } else {
        whereClause.status = targetStatus
      }
    }

    const eligibleInstallers = await prisma.installer.findMany({
      where: whereClause,
      select: { id: true },
    })

    // Create notifications for all eligible installers
    if (eligibleInstallers.length > 0) {
      await Promise.all(
        eligibleInstallers.map((installer) =>
          prisma.notification.create({
            data: {
              id: crypto.randomUUID(),
              installerId: installer.id,
              type: 'job',
              title: 'New Job Opportunity',
              content: `A new ${jobType} job has been posted: ${title} in ${location}`,
              priority: 'high',
              link: `/installer/jobs`,
              senderId: 'admin',
              senderType: 'admin',
              updatedAt: new Date(),
            },
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      job,
      notificationsSent: eligibleInstallers.length,
    })
  } catch (error: any) {
    console.error('=== ERROR CREATING JOB ===')
    console.error('Error type:', typeof error)
    console.error('Error:', error)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Error code:', error?.code)
    console.error('Error meta:', error?.meta)
    console.error('Error name:', error?.name)
    console.error('============================')
    
    return NextResponse.json(
      { 
        error: 'Failed to create job', 
        details: error.message || 'Unknown error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        meta: error.meta || null,
      },
      { status: 500 }
    )
  }
}
