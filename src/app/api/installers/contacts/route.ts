import { NextRequest, NextResponse } from 'next/server'
import { getInstallerTokenFromRequest, verifyInstallerToken } from '@/lib/installerToken'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

function serialize(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    category: row.category || '',
    role: row.role || '',
    notes: row.notes || '',
    workroom: row.workroom || '',
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getInstallerTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let installerId: string | undefined
    try {
      const payload = verifyInstallerToken(token)
      installerId = payload.installerId
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    if (!installerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contacts = await prisma.contact.findMany({
      where: { isHidden: false },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ contacts: contacts.map(serialize) })
  } catch (error: any) {
    console.error('Error fetching installer contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}
