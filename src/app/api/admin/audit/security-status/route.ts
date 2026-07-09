import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const prismaAny = prisma as any
    const session = await getServerSession(authOptions)
    const email = session?.user?.email?.toLowerCase()
    if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await prismaAny.admin.findUnique({ where: { email } })
    if (!admin?.isActive) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (admin.role === 'MODERATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const auditLogCount = await prismaAny.adminAuditLog.count({
      where: { NOT: { targetType: 'cilio_api' } },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const recentChangesToday = await prismaAny.adminAuditLog.count({
      where: { createdAt: { gte: today }, NOT: { targetType: 'cilio_api' } },
    })

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const recentChangesWeek = await prismaAny.adminAuditLog.count({
      where: { createdAt: { gte: weekStart }, NOT: { targetType: 'cilio_api' } },
    })

    const recentActions = await prismaAny.$queryRawUnsafe(`
      SELECT action, COUNT(*)::int as count
      FROM "AdminAuditLog"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        AND "targetType" <> 'cilio_api'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `)

    const cilioGeoRows = await prismaAny.$queryRawUnsafe(`
      SELECT
        country,
        region,
        city,
        NULLIF(latitude, '') AS latitude,
        NULLIF(longitude, '') AS longitude,
        action,
        count::int AS count,
        "lastSeen"
      FROM "CilioGeoMetric"
      WHERE action IN ('cilio.api_access', 'cilio.api_blocked')
        AND "lastSeen" >= NOW() - INTERVAL '30 days'
      ORDER BY count DESC
      LIMIT 100
    `)

    const countryMap = new Map<string, { country: string; allowed: number; blocked: number }>()
    let cilioAllowed = 0
    let cilioBlocked = 0
    for (const row of cilioGeoRows as any[]) {
      const country = String(row.country || 'UNKNOWN').toUpperCase()
      const count = Number(row.count || 0)
      const current = countryMap.get(country) || { country, allowed: 0, blocked: 0 }
      if (row.action === 'cilio.api_blocked') {
        current.blocked += count
        cilioBlocked += count
      } else {
        current.allowed += count
        cilioAllowed += count
      }
      countryMap.set(country, current)
    }

    const securityMeasures = [
      {
        id: 'cron-secret-header',
        category: 'Authentication',
        label: 'CRON_SECRET restricted to Authorization header only',
        status: 'secured',
        description: 'Cron jobs authenticate via header instead of query string, preventing exposure in logs.',
      },
      {
        id: 'session-auth',
        category: 'Authentication',
        label: 'getServerSession on all admin/sensitive API routes',
        status: 'secured',
        description: 'All analytics, job sync, notification, and debug endpoints require valid admin session.',
      },
      {
        id: 'jwt-verify-messages',
        category: 'Authentication',
        label: 'JWT verification on installer messaging endpoint',
        status: 'secured',
        description: 'POST /api/installers/[id]/messages now calls verifyToken to authenticate the installer.',
      },
      {
        id: 'check-expirations-auth',
        category: 'Authentication',
        label: 'Authentication on installer expiration checks',
        status: 'secured',
        description: 'GET/POST /api/installers/check-expirations requires getServerSession.',
      },
      {
        id: 'notifications-auth',
        category: 'Authentication',
        label: 'Authentication on notification endpoints',
        status: 'secured',
        description: '/api/notifications/count, survey-count, and survey-mark-read are all auth-gated.',
      },
      {
        id: 'jwt-fallback-removed',
        category: 'Secrets',
        label: 'Hardcoded JWT fallback secrets removed',
        status: 'secured',
        description: 'installerToken.ts and all login/verify routes throw errors if env secrets are missing instead of falling back.',
      },
      {
        id: 'dev-auth-gated',
        category: 'Environment',
        label: 'Local dev auth bypass gated by ALLOW_LOCAL_DEV_AUTH',
        status: 'secured',
        description: 'The dev-only email-based auth bypass in auth.ts is disabled unless ALLOW_LOCAL_DEV_AUTH=true.',
      },
      {
        id: 'env-backups-deleted',
        category: 'Environment',
        label: 'Backup .env files containing credentials deleted',
        status: 'secured',
        description: '.env.local.bak, .env.local.bak2, .env.local 2.bak, .env.bak — all removed from the filesystem.',
      },
      {
        id: 'cilio-headers-centralized',
        category: 'Secrets',
        label: 'Cilio API credentials accessed only from lib/cilio.ts',
        status: 'secured',
        description: 'No route directly reads CILIO_SUBSCRIPTION_KEY — all go through getCilioAuthHeader().',
      },
      {
        id: 'cilio-us-geo-guard',
        category: 'Network',
        label: 'Cilio API proxy blocks known non-US requests',
        status: 'secured',
        description: 'Cilio routes reject requests when Vercel identifies the source country as outside the United States.',
      },
      {
        id: 'reset-token-expiry',
        category: 'Authentication',
        label: 'Password reset tokens expire after 1 hour',
        status: 'secured',
        description: 'Installer password reset links store an expiry timestamp and are rejected after the TTL passes.',
      },
      {
        id: 'reset-urls-in-response',
        category: 'Authentication',
        label: 'Reset/verification URLs are hidden in production responses',
        status: 'secured',
        description: 'Tokenized reset and verification links are returned only in local development, never from production API responses.',
      },
      {
        id: 'hardcoded-admin-email',
        category: 'Authorization',
        label: 'Admin access is controlled by database roles',
        status: 'secured',
        description: 'Hardcoded fallback admin email allowlists were removed; admin access now requires an active Admin record and role.',
      },
    ]

    return NextResponse.json({
      auditStats: {
        totalLogs: auditLogCount,
        changesToday: recentChangesToday,
        changesThisWeek: recentChangesWeek,
        recentActions,
      },
      cilioGeoStats: {
        allowed: cilioAllowed,
        blocked: cilioBlocked,
        total: cilioAllowed + cilioBlocked,
        countries: Array.from(countryMap.values()).sort(
          (a, b) => b.allowed + b.blocked - (a.allowed + a.blocked)
        ),
        cities: (cilioGeoRows as any[]).map((row) => ({
          country: String(row.country || 'UNKNOWN').toUpperCase(),
          region: row.region || null,
          city: row.city || 'Unknown',
          latitude: row.latitude !== null ? Number(row.latitude) : null,
          longitude: row.longitude !== null ? Number(row.longitude) : null,
          action: row.action,
          count: Number(row.count || 0),
          lastSeen: row.lastSeen,
        })),
      },
      securityMeasures,
      securedCount: securityMeasures.filter((m) => m.status === 'secured').length,
      warningCount: securityMeasures.filter((m) => m.status === 'warning').length,
      totalCount: securityMeasures.length,
    })
  } catch (e: any) {
    console.error('Security status GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch security status' }, { status: 500 })
  }
}
