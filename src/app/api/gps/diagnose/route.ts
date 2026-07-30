import { NextResponse } from 'next/server'
import * as ruhavik from '@/lib/ruhavik'

export async function GET() {
  const hasUser = !!(process.env.RUHAVIK_USERNAME || process.env.TRACCAR_USERNAME)
  const hasPass = !!(process.env.RUHAVIK_PASSWORD || process.env.TRACCAR_PASSWORD)
  const hasToken = !!process.env.RUHAVIK_ACCESS_TOKEN
  const apiUrl = process.env.RUHAVIK_API_URL || 'https://ruhavik.gurtam.space/api/platform'

  let reachable = false
  let reachableError = ''

  try {
    reachable = await ruhavik.isReachable()
  } catch (e: any) {
    reachableError = e.message || String(e)
  }

  return NextResponse.json({
    provider: 'ruhavik',
    env: {
      RUHAVIK_API_URL: apiUrl,
      RUHAVIK_USERNAME: hasUser ? '(set)' : '(not set)',
      RUHAVIK_PASSWORD: hasPass ? '(set)' : '(not set)',
      RUHAVIK_ACCESS_TOKEN: hasToken ? '(set)' : '(not set)',
    },
    reachable,
    reachableError: reachableError || null,
    timestamp: new Date().toISOString(),
  })
}
