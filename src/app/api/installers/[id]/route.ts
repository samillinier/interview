import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const installer = await prisma.installer.findUnique({
      where: { id: params.id },
      include: {
        interviews: {
          include: {
            responses: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
        communications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    return NextResponse.json({ installer })
  } catch (error) {
    console.error('Error fetching installer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installer' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json()

    const installer = await prisma.installer.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ installer })
  } catch (error) {
    console.error('Error updating installer:', error)
    return NextResponse.json(
      { error: 'Failed to update installer' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.installer.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting installer:', error)
    return NextResponse.json(
      { error: 'Failed to delete installer' },
      { status: 500 }
    )
  }
}

