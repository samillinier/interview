import { NextRequest, NextResponse } from 'next/server'
import { requireMarketingAdmin } from '@/lib/marketing-admin'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const auth = await requireMarketingAdmin()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: noStoreHeaders })
    }

    const params = context.params
    const resolved = params instanceof Promise ? await params : params
    const id = String(resolved?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Lead id required' }, { status: 400, headers: noStoreHeaders })
    }

    await prisma.marketingLead.delete({ where: { id } })
    return NextResponse.json({ success: true }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete lead' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
