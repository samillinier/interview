import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!match) return null
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) {
    return new NextResponse(null, { status: 401 })
  }

  const admin = await prisma.admin.findUnique({
    where: { email },
    select: { photoUrl: true },
  })

  const photoUrl = admin?.photoUrl
  if (!photoUrl) {
    return new NextResponse(null, { status: 404 })
  }

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return NextResponse.redirect(photoUrl)
  }

  const parsed = parseDataUrl(photoUrl)
  if (!parsed) {
    return new NextResponse(null, { status: 404 })
  }

  return new NextResponse(parsed.buffer, {
    headers: {
      'Content-Type': parsed.mime,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
