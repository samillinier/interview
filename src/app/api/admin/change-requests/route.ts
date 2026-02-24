import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prisma.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const take = Math.min(parseInt(searchParams.get('take') || '50', 10) || 50, 200)

    const requests = await prisma.installerChangeRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, requests })
  } catch (error: any) {
    console.error('Error fetching change requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change requests', details: error.message },
      { status: 500 }
    )
  }
}

