import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Local debugging: confirms Prisma can reach Postgres using `DATABASE_URL`.
 * Disabled in production (returns 404).
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  try {
    await prisma.$queryRaw`SELECT 1 AS ok`
    return NextResponse.json({
      ok: true,
      hint: 'DATABASE_URL is reachable. If the app still fails, restart `npm run dev` after changing env files.',
    })
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string; meta?: unknown }
    return NextResponse.json(
      {
        ok: false,
        code: err.code,
        message: err.message,
        meta: err.meta,
        checklist: [
          'Copy `env.local.example` → `.env.local` and set real Postgres URLs (not placeholders).',
          'Next.js loads `.env` then `.env.local`; keys in `.env.local` override `.env` — fix or remove a bad `DATABASE_URL` there.',
          'Set both `DATABASE_URL` (pooled is fine) and `DATABASE_URL_UNPOOLED` (Neon “direct” host, often without `-pooler`) for Prisma migrations; you can paste the same URL into both if unsure.',
          'Neon free tier: the compute may be asleep — open the project in https://console.neon.tech then retry.',
          'Run `npx prisma migrate deploy` after the DB is reachable.',
        ],
      },
      { status: 503 }
    )
  }
}
