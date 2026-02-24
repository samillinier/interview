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

    const count = await prisma.installerChangeRequest.count({
      where: { status: 'pending' },
    })

    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error('Error fetching change request count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change request count', details: error.message },
      { status: 500 }
    )
  }
}

