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

const OUTREACH_STATUSES = new Set(['pending', 'contacted', 'offered', 'contracted', 'declined'])
const ROW_COLORS = new Set(['gray', 'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'sky', 'blue', 'purple'])

export async function PATCH(
  request: NextRequest,
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

    const body = await request.json().catch(() => ({}))
    const outreachStatus = String(body?.outreachStatus || '').trim().toLowerCase()
    const remark = body?.remark === undefined ? undefined : String(body.remark || '').trim().slice(0, 240) || null
    if (body?.outreachStatus !== undefined && !OUTREACH_STATUSES.has(outreachStatus)) {
      return NextResponse.json({ error: 'Pick pending, contacted, offered, contracted, or declined.' }, { status: 400, headers: noStoreHeaders })
    }

    const data: { outreachStatus?: string; remark?: string | null; rowColor?: string | null } = {}
    if (body?.outreachStatus !== undefined) data.outreachStatus = outreachStatus
    if (body?.remark !== undefined) data.remark = remark
    if (body?.rowColor !== undefined) {
      if (body.rowColor === null || body.rowColor === '' || String(body.rowColor).trim().toLowerCase() === 'white') {
        data.rowColor = null
      } else {
        const rowColor = String(body.rowColor).trim().toLowerCase()
        if (!ROW_COLORS.has(rowColor)) {
          return NextResponse.json({ error: 'Pick a valid row color.' }, { status: 400, headers: noStoreHeaders })
        }
        data.rowColor = rowColor
      }
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400, headers: noStoreHeaders })
    }

    const lead = await prisma.marketingLead.update({ where: { id }, data })
    return NextResponse.json({ success: true, lead }, { headers: noStoreHeaders })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update lead' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
