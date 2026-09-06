import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { deleteFile } from '@/lib/storage'
import { requireActiveAdmin } from '@/lib/installerAccess'

export async function POST(request: NextRequest) {
  try {
    // The file is uploaded client-side directly to Vercel Blob (via /api/blob/upload),
    // which avoids the serverless function body limit (~4.5MB). This route only
    // persists the resulting Blob URL onto the installer record.
    const body = await request.json().catch(() => null)
    const installerId = typeof body?.installerId === 'string' ? body.installerId.trim() : ''
    const photoUrl = typeof body?.photoUrl === 'string' ? body.photoUrl.trim() : ''

    if (!installerId || !photoUrl) {
      return NextResponse.json(
        { error: 'Installer ID and photo URL are required' },
        { status: 400 }
      )
    }

    // Verify installer exists
    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
    })

    if (!installer) {
      return NextResponse.json(
        { error: 'Installer not found' },
        { status: 404 }
      )
    }

    // Delete old photo if exists (only if it differs from the new one)
    if (installer.photoUrl && installer.photoUrl !== photoUrl) {
      try {
        await deleteFile(installer.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting old photo:', deleteError)
        // Continue even if deletion fails
      }
    }

    // Persist the photo URL onto the installer record
    await prisma.installer.update({
      where: { id: installerId },
      data: { photoUrl },
    })

    return NextResponse.json({
      success: true,
      photoUrl,
      message: 'Photo uploaded successfully',
    })
  } catch (error: any) {
    console.error('Error saving photo:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to save photo',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await requireActiveAdmin()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    if (access.admin.role === 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const installerId = request.nextUrl.searchParams.get('installerId')
    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: { id: true, photoUrl: true },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    if (installer.photoUrl) {
      try {
        await deleteFile(installer.photoUrl)
      } catch (deleteError: any) {
        console.error('Error deleting profile photo file:', deleteError)
      }
    }

    await prisma.installer.update({
      where: { id: installerId },
      data: { photoUrl: null },
    })

    return NextResponse.json({
      success: true,
      message: 'Photo removed successfully',
    })
  } catch (error: any) {
    console.error('Error removing photo:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove photo' },
      { status: 500 }
    )
  }
}
