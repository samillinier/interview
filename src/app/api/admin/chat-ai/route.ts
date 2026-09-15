import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isChatAiGloballyEnabled, setChatAiGloballyEnabled } from '@/lib/chat-ai-settings'

export const dynamic = 'force-dynamic'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const

async function requireSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  return session
}

export async function GET() {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  const enabled = await isChatAiGloballyEnabled()
  return NextResponse.json({ success: true, enabled }, { headers: noStoreHeaders })
}

export async function PATCH(request: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders })
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body?.enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled is required' }, { status: 400, headers: noStoreHeaders })
    }
    const enabled = await setChatAiGloballyEnabled(body.enabled)
    return NextResponse.json({ success: true, enabled }, { headers: noStoreHeaders })
  } catch (error: any) {
    console.error('PATCH /api/admin/chat-ai failed', error?.message || error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update Alice' },
      { status: 500, headers: noStoreHeaders },
    )
  }
}
