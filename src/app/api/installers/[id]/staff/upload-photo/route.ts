import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function requireInstallerOrAdmin(request: NextRequest, installerId: string) {
  // Installer token path
  const token = getInstallerTokenFromRequest(request)
  if (token) {
    try {
      const payload = verifyInstallerToken(token)
      if (!payload.installerId || payload.installerId !== installerId) {
        return { ok: false as const, status: 403, error: 'Forbidden' }
      }
      return { ok: true as const, actor: 'installer' as const }
    } catch {
      return { ok: false as const, status: 401, error: 'Unauthorized' }
    }
  }

  // Admin session path
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = (await prisma.admin.findUnique({ where: { email } })) as any
  if (!admin?.isActive) return { ok: false as const, status: 403, error: 'Admin access required' }

  // Moderators can only access Qualified installers (status = "passed", "pending", "failed")
  if (admin.role === 'MODERATOR') {
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { status: true },
    })
    if (installer) {
      const st = String(installer.status || '').toLowerCase()
      if (!['passed', 'pending', 'failed'].includes(st)) {
        return { ok: false as const, status: 403, error: 'Forbidden' }
      }
    }
  }

  return { ok: true as const, actor: 'admin' as const }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json(
        { error: 'Installer ID is required' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, status: true },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Check authentication
    const authResult = await requireInstallerOrAdmin(request, installerId)
    if (!authResult.ok) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const formData = await request.formData()
    const photo = formData.get('photo') as File | null
    const staffMemberId = formData.get('staffMemberId') as string | null

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo is required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image size must be less than 10MB' },
        { status: 400 }
      )
    }

    // If updating existing staff member, delete old photo
    if (staffMemberId) {
      const staffMember = await prisma.staffMember.findUnique({
        where: { id: staffMemberId },
        select: { photoUrl: true, installerId: true },
      })

      if (!staffMember) {
        return NextResponse.json(
          { error: 'Staff member not found' },
          { status: 404 }
        )
      }

      if (staffMember.installerId !== installerId) {
        return NextResponse.json(
          { error: 'Staff member does not belong to this installer' },
          { status: 403 }
        )
      }

      // Delete old photo if exists (would need deleteFile function)
      // For now, we'll just upload the new one
    }

    // Generate unique filename
    const fileExtension = photo.name.split('.').pop() || 'jpg'
    const fileName = `staff-${installerId}-${Date.now()}.${fileExtension}`

    // Upload file using storage utility
    let photoUrl: string
    try {
      const uploadResult = await uploadFile(photo, 'staff', fileName)
      photoUrl = uploadResult.url
    } catch (uploadError: any) {
      console.error('Staff photo upload error:', uploadError)
      return NextResponse.json(
        { 
          error: `Failed to upload photo: ${uploadError.message || 'Unknown error'}`,
          details: process.env.NODE_ENV === 'development' ? uploadError.stack : undefined
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error uploading staff photo:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload photo',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
