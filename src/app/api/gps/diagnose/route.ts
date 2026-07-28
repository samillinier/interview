import { NextResponse } from 'next/server'
import * as traccar from '@/lib/traccar'

export async function GET() {
  const TRACCAR_URL = process.env.TRACCAR_SERVER_URL || ''
  const hasUser = !!process.env.TRACCAR_USERNAME
  const hasPass = !!process.env.TRACCAR_PASSWORD
  const hasPushKey = !!process.env.TRACCAR_PUSH_API_KEY

  let reachable = false
  let reachableError = ''

  if (TRACCAR_URL) {
    try {
      reachable = await traccar.isReachable()
    } catch (e: any) {
      reachableError = e.message || String(e)
    }
  }

  return NextResponse.json({
    env: {
      TRACCAR_SERVER_URL: TRACCAR_URL || '(not set)',
      TRACCAR_USERNAME: hasUser ? '(set)' : '(not set)',
      TRACCAR_PASSWORD: hasPass ? '(set)' : '(not set)',
      TRACCAR_PUSH_API_KEY: hasPushKey ? '(set)' : '(not set)',
    },
    reachable,
    reachableError: reachableError || null,
    timestamp: new Date().toISOString(),
  })
}
