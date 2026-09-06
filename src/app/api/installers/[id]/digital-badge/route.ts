import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveDigitalBadgeUrl, scrapeDigitalBadge } from '@/lib/digitalBadge'

/**
 * Loads an installer's wallet id (digitalId) and, when it is a FADV badge
 * URL or dbId, scrapes the official badge so mobile can show it as an image.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = context.params
    const resolvedParams = params instanceof Promise ? await params : params
    const installerId = resolvedParams.id

    if (!installerId) {
      return NextResponse.json({ error: 'Installer ID is required' }, { status: 400 })
    }

    const installer = await prisma.installer.findUnique({
      where: { id: installerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
        photoUrl: true,
        status: true,
        digitalId: true,
      },
    })

    if (!installer) {
      return NextResponse.json({ error: 'Installer not found' }, { status: 404 })
    }

    const raw = (installer.digitalId || '').trim()
    const badgeUrl = resolveDigitalBadgeUrl(raw)

    const base = {
      installerId: installer.id,
      firstName: installer.firstName,
      lastName: installer.lastName,
      email: installer.email,
      companyName: installer.companyName || null,
      photoUrl: installer.photoUrl || null,
      status: installer.status,
      digitalId: raw,
      hasBadge: Boolean(raw),
      isUrl: Boolean(badgeUrl),
      badgeUrl,
    }

    if (!badgeUrl) {
      return NextResponse.json({
        ...base,
        badgeNumber: raw || null,
        expiresOn: null,
        badgeType: null,
        badgeName: null,
        badgeCompany: null,
        qrImage: null,
        photoImage: null,
        logoImage: null,
      })
    }

    try {
      const scraped = await scrapeDigitalBadge(badgeUrl)
      return NextResponse.json({
        ...base,
        ...scraped,
      })
    } catch (err) {
      console.error('Error scraping digital badge:', err)
      return NextResponse.json({
        ...base,
        badgeNumber: null,
        expiresOn: null,
        badgeType: null,
        badgeName: null,
        badgeCompany: null,
        qrImage: null,
        photoImage: null,
        logoImage: null,
      })
    }
  } catch (error: any) {
    console.error('Error fetching digital badge:', error)
    return NextResponse.json(
      { error: 'Failed to fetch digital badge', details: error.message },
      { status: 500 }
    )
  }
}
