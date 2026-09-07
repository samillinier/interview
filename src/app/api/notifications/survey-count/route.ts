import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'

export const dynamic = 'force-dynamic'

function installerIdFromToken(request: NextRequest): string | null {
  const token = getInstallerTokenFromRequest(request)
  if (!token) return null
  try {
    return String(verifyInstallerToken(token)?.installerId || '').trim() || null
  } catch {
    return null
  }
}

// Get unread survey notification count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fromToken = installerIdFromToken(request)
    const queryId = searchParams.get('installerId')

    let installerId = fromToken
    if (!installerId) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      installerId = queryId
    }

    if (!installerId) {
      return NextResponse.json({ error: 'installerId is required' }, { status: 400 })
    }

    const count = await prisma.notification.count({
      where: {
        installerId,
        isRead: false,
        type: 'survey',
      },
    })

    return NextResponse.json({ success: true, count })
  } catch (error: any) {
    console.error('Error fetching survey notification count:', error)
    return NextResponse.json(
      { error: 'Failed to fetch survey notification count', details: error.message },
      { status: 500 }
    )
  }
}
