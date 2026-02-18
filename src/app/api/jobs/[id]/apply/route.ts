import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Apply to a job (installer)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const jobId = resolvedParams.id

    const body = await request.json()
    const { installerId } = body

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Check if job exists
    const job = await prisma.job.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'active') {
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 400 }
      )
    }

    // Check if installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Check if already applied
    const existingApplication = await prisma.jobApplication.findUnique({
      where: {
        jobId_installerId: {
          jobId,
          installerId,
        },
      },
    })

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      )
    }

    // Create application
    const application = await prisma.jobApplication.create({
      data: {
        id: crypto.randomUUID(),
        jobId,
        installerId,
        status: 'pending',
        updatedAt: new Date(),
      },
      include: {
        job: {
          select: {
            title: true,
            location: true,
          },
        },
        installer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      application,
      message: 'Application submitted successfully!',
    })
  } catch (error: any) {
    console.error('Error applying to job:', error)
    return NextResponse.json(
      { error: 'Failed to apply to job', details: error.message },
      { status: 500 }
    )
  }
}
