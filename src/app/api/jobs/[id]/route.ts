import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Get a single job
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const jobId = resolvedParams.id

    // Check if installerId is provided in query params (for installer view)
    const { searchParams } = new URL(request.url)
    const installerId = searchParams.get('installerId')

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: installerId
          ? {
              where: {
                installerId: installerId,
              },
              include: {
                installer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    photoUrl: true,
                    status: true,
                  },
                },
              },
            }
          : {
              include: {
                installer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                    photoUrl: true,
                    status: true,
                  },
                },
              },
            },
        _count: {
          select: { JobApplication: true },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error: any) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job', details: error.message },
      { status: 500 }
    )
  }
}

// Update a job (admin only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const jobId = resolvedParams.id

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
      status,
      targetStatus,
      benefits,
    } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (location !== undefined) updateData.location = location
    if (jobType !== undefined) updateData.jobType = jobType
    if (requirements !== undefined) updateData.requirements = requirements ? JSON.stringify(requirements) : null
    if (skills !== undefined) updateData.skills = skills ? JSON.stringify(skills) : null
    if (payRange !== undefined) updateData.payRange = payRange
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null
    if (status !== undefined) updateData.status = status
    if (targetStatus !== undefined) updateData.targetStatus = targetStatus
    if (benefits !== undefined) {
      // Handle benefits - it might be an array or already a JSON string
      if (benefits === null) {
        updateData.benefits = null
      } else if (typeof benefits === 'string') {
        // If it's already a string (JSON), use it directly
        updateData.benefits = benefits
      } else if (Array.isArray(benefits)) {
        // If it's an array, stringify it
        updateData.benefits = JSON.stringify(benefits)
      } else {
        // Fallback: stringify whatever it is
        updateData.benefits = JSON.stringify(benefits)
      }
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error: any) {
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job', details: error.message },
      { status: 500 }
    )
  }
}

// Delete a job (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const jobId = resolvedParams.id

    await prisma.job.delete({
      where: { id: jobId },
    })

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job', details: error.message },
      { status: 500 }
    )
  }
}
