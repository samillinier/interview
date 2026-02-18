import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// Update application status (accept/reject)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; applicationId: string }> | { id: string; applicationId: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const { id: jobId, applicationId } = resolvedParams

    const body = await request.json()
    const { status, notes } = body

    if (!status || !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (pending, accepted, or rejected)' },
        { status: 400 }
      )
    }

    // Verify application exists and belongs to the job
    const application = await prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        jobId: jobId,
      },
    })

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    // Update application status
    const updatedApplication = await prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        status,
        notes: notes || null,
      },
      include: {
        Installer: {
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
        job: {
          select: {
            title: true,
            location: true,
          },
        },
      },
    })

    // Send notification to installer about status change
    const statusMessage = status === 'accepted' 
      ? `Congratulations! Your application for "${updatedApplication.job.title}" in ${updatedApplication.job.location} has been accepted.`
      : `Your application for "${updatedApplication.job.title}" in ${updatedApplication.job.location} has been reviewed.`

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        installerId: updatedApplication.installerId,
        type: 'notification',
        title: status === 'accepted' ? 'Application Accepted' : 'Application Update',
        content: statusMessage,
        priority: status === 'accepted' ? 'high' : 'normal',
        link: '/installer/jobs',
        senderId: 'admin',
        senderType: 'admin',
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      application: updatedApplication,
    })
  } catch (error: any) {
    console.error('Error updating application status:', error)
    return NextResponse.json(
      { error: 'Failed to update application status', details: error.message },
      { status: 500 }
    )
  }
}
