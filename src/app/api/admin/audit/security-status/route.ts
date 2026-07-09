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

    const auditLogCount = await prismaAny.adminAuditLog.count()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const recentChangesToday = await prismaAny.adminAuditLog.count({
      where: { createdAt: { gte: today } },
    })

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const recentChangesWeek = await prismaAny.adminAuditLog.count({
      where: { createdAt: { gte: weekStart } },
    })

    const recentActions = await prismaAny.$queryRawUnsafe(`
      SELECT action, COUNT(*)::int as count
      FROM "AdminAuditLog"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `)

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
        id: 'reset-token-expiry',
        category: 'Pending',
        label: 'Password reset tokens have no expiration check',
        status: 'warning',
        description: 'Reset tokens are stored but never validated for expiration. Recommended to add a TTL check.',
      },
      {
        id: 'reset-urls-in-response',
        category: 'Pending',
        label: 'Reset/verification URLs returned in API responses',
        status: 'warning',
        description: 'When RESEND_API_KEY is missing, reset links are returned in the API response body instead of being emailed.',
      },
      {
        id: 'hardcoded-admin-email',
        category: 'Pending',
        label: 'Hardcoded @fiscorponline.com email admin bypass',
        status: 'warning',
        description: 'Certain routes grant admin access based on hardcoded email domain matches — consider moving to DB roles.',
      },
    ]

    return NextResponse.json({
      auditStats: {
        totalLogs: auditLogCount,
        changesToday: recentChangesToday,
        changesThisWeek: recentChangesWeek,
        recentActions,
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
