import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/db'
import { canAccessInvoices } from '@/lib/invoiceAccess'
import { notArchivedInstallerWhere } from '@/lib/installerAccountArchive'
import { notifyInstallerAndPush } from '@/lib/pushNotifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const noStore = { 'Cache-Control': 'private, no-store, no-cache, must-revalidate', Pragma: 'no-cache' } as const

async function requireInvoiceAdmin() {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { ok: false as const, status: 401, error: 'Unauthorized' }

  const admin = await prisma.admin.findUnique({ where: { email } })
  if (!admin?.isActive || !canAccessInvoices((admin as any).role)) {
    return { ok: false as const, status: 403, error: 'Invoice access required' }
  }

  return {
    ok: true as const,
    email,
    name: String(admin.name || session?.user?.name || '').trim() || email,
  }
}

function mapInvoice(row: any) {
  return {
    id: row.id,
    createdAt: row.createdAt,
    installerId: row.installerId,
    title: row.title,
    note: row.note,
    fileName: row.fileName,
    fileUrl: row.fileUrl,
    fileSize: row.fileSize,
    sentByEmail: row.sentByEmail,
    sentByName: row.sentByName,
    readAt: row.readAt,
    installer: row.Installer
      ? {
          id: row.Installer.id,
          firstName: row.Installer.firstName,
          lastName: row.Installer.lastName,
          email: row.Installer.email,
          companyName: row.Installer.companyName,
          photoUrl: row.Installer.photoUrl,
        }
      : null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await requireInvoiceAdmin()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    const installerId = String(request.nextUrl.searchParams.get('installerId') || '').trim()
    const invoices = await prisma.installerInvoice.findMany({
      where: installerId ? { installerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        Installer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            photoUrl: true,
          },
        },
      },
      take: 500,
    })

    return NextResponse.json(
      { success: true, invoices: invoices.map(mapInvoice), count: invoices.length },
      { headers: noStore }
    )
  } catch (error: any) {
    console.error('admin installer invoices GET failed', error)
    return NextResponse.json(
      { error: 'Failed to load invoices', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireInvoiceAdmin()
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status, headers: noStore })
    }

    const body = await request.json().catch(() => null)
    const title = String(body?.title || '').trim()
    const note = String(body?.note || '').trim()
    const fileName = String(body?.fileName || '').trim()
    const fileUrl = String(body?.fileUrl || '').trim()
    const fileSizeRaw = Number(body?.fileSize)
    const sendToAll = Boolean(body?.sendToAll)
    const installerIds: string[] = Array.isArray(body?.installerIds)
      ? Array.from(
          new Set(
            body.installerIds
              .map((id: unknown) => String(id || '').trim())
              .filter((id: string) => id.length > 0)
          )
        )
      : []

    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400, headers: noStore })
    if (!fileName || !fileUrl) {
      return NextResponse.json({ error: 'Please attach an invoice file' }, { status: 400, headers: noStore })
    }

    let recipients: Array<{ id: string; firstName: string; lastName: string }> = []
    if (sendToAll) {
      recipients = await prisma.installer.findMany({
        where: notArchivedInstallerWhere,
        select: { id: true, firstName: true, lastName: true },
      })
    } else {
      if (installerIds.length === 0) {
        return NextResponse.json({ error: 'Select at least one installer' }, { status: 400, headers: noStore })
      }
      recipients = await prisma.installer.findMany({
        where: { id: { in: installerIds }, ...notArchivedInstallerWhere },
        select: { id: true, firstName: true, lastName: true },
      })
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No installers found to send this invoice' }, { status: 400, headers: noStore })
    }

    const created = await prisma.installerInvoice.createMany({
      data: recipients.map((installer) => ({
        installerId: installer.id,
        title,
        note: note || null,
        fileName,
        fileUrl,
        fileSize: Number.isFinite(fileSizeRaw) && fileSizeRaw > 0 ? Math.round(fileSizeRaw) : null,
        sentByEmail: access.email,
        sentByName: access.name,
      })),
    })

    const bodyText = note || `${title} is ready to view.`
    for (let i = 0; i < recipients.length; i += 25) {
      const slice = recipients.slice(i, i + 25)
      await Promise.all(
        slice.map((installer) =>
          notifyInstallerAndPush({
            installerId: installer.id,
            title: 'New invoice',
            content: bodyText,
            link: '/installer/invoices',
            attachmentUrl: fileUrl,
            attachmentName: fileName,
            data: { type: 'invoice' },
          }).catch((err) => {
            console.error('installer invoice notify failed', installer.id, err)
            return null
          })
        )
      )
    }

    return NextResponse.json(
      { success: true, sent: created.count, recipients: recipients.length },
      { headers: noStore }
    )
  } catch (error: any) {
    console.error('admin installer invoices POST failed', error)
    return NextResponse.json(
      { error: 'Failed to send invoice', details: error?.message },
      { status: 500, headers: noStore }
    )
  }
}
