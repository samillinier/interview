import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Resend } from 'resend'
import { companyDisplayName } from '@/lib/publicAppUrl'
import { emailLogoUrl } from '@/lib/email-brand'
import { notifyCorporateAuthorizer, notifyRequesterDecision } from '@/lib/corporate-authorization-email'

const REVIEWER_ROLES = new Set(['SUPER_ADMIN'])

function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function sendReceiptEmail(args: {
  to: string
  orderDate: string
  workroom: string
  firstName: string
  lastName: string
  businessPhone: string
  jobTitle: string
  emailAddress: string
  quantity: number
}) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured — business card receipt email skipped')
    return false
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
  const fromName = companyDisplayName()
  const logoUrl = emailLogoUrl()

  const subject = 'Your Business Card order receipt'
  const text = `Your Business Card order has been received.

Name: ${args.firstName} ${args.lastName}
Job title: ${args.jobTitle || '—'}
Business phone: ${args.businessPhone || '—'}
Email: ${args.emailAddress || '—'}
Location: ${args.workroom}
Order date: ${fmtDate(args.orderDate)}
Quantity: ${args.quantity}

— Floor Interior Services
`

  const html = `
<!doctype html>
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.55; color: #0f172a; max-width: 640px; margin: 0 auto; padding: 24px; background: #ffffff;">
    <div style="text-align:center;margin-bottom:20px;">
      <img src="${logoUrl}" alt="Floor Interior Services" style="max-width:180px;height:auto;" />
    </div>
    <h1 style="font-size:20px;margin:0 0 12px 0;">Business Card order received</h1>
    <p style="margin:0 0 16px 0;">Thanks — your Business Card order has been received. Here's a receipt of your responses:</p>
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;margin:0 0 20px 0;">
      <p style="margin:0 0 8px 0;"><strong>Name:</strong> ${escapeHtml(args.firstName)} ${escapeHtml(args.lastName)}</p>
      <p style="margin:0 0 8px 0;"><strong>Job title:</strong> ${escapeHtml(args.jobTitle || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Business phone:</strong> ${escapeHtml(args.businessPhone || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Email:</strong> ${escapeHtml(args.emailAddress || '—')}</p>
      <p style="margin:0 0 8px 0;"><strong>Location:</strong> ${escapeHtml(args.workroom)}</p>
      <p style="margin:0 0 8px 0;"><strong>Order date:</strong> ${escapeHtml(fmtDate(args.orderDate))}</p>
      <p style="margin:0;"><strong>Quantity:</strong> ${args.quantity}</p>
    </div>
    <p style="font-size:12px;color:#64748b;margin:0;">— Floor Interior Services</p>
  </body>
</html>
`

  try {
    const resend = new Resend(resendApiKey)
    const result = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: args.to,
      subject,
      html,
      text,
    })
    if (result.error) {
      console.error('Business card receipt email failed:', result.error)
      return false
    }
    return true
  } catch (error) {
    console.error('Business card receipt email failed:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'count') {
      const role = String((session.user as any)?.role || '').toUpperCase()
      const where: any = { status: 'pending' }
      if (role === 'MANAGER') {
        where.createdByEmail = session.user.email?.toLowerCase() || ''
      }
      const count = await prisma.businessCardOrder.count({ where })
      return NextResponse.json({ success: true, count })
    }

    const role = String((session.user as any)?.role || '').toUpperCase()
    const status = searchParams.get('status')
    const workroom = searchParams.get('workroom')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (workroom) where.workroom = workroom
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role === 'MANAGER') {
      where.createdByEmail = session.user.email?.toLowerCase() || ''
    }

    const orders = await prisma.businessCardOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    console.error('Error fetching business card orders:', error)
    return NextResponse.json({ error: 'Failed to fetch business card orders', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const {
      orderDate,
      workroom,
      firstName,
      lastName,
      businessPhone,
      jobTitle,
      emailAddress,
      sendEmailReceipt,
    } = body

    if (!orderDate || !workroom || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: 'Order date, location, first name, and last name are required' },
        { status: 400 },
      )
    }

    const user = session.user as any
    const order = await prisma.businessCardOrder.create({
      data: {
        orderDate: new Date(orderDate),
        workroom: String(workroom).trim(),
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        businessPhone: businessPhone?.trim() || null,
        jobTitle: jobTitle?.trim() || null,
        emailAddress: emailAddress?.trim() || null,
        quantity: 500,
        sendEmailReceipt: Boolean(sendEmailReceipt),
        createdByEmail: user.email || null,
        createdByName: user.name || null,
      },
    })

    // Notify the corporate authorizer (configurable in Settings → Communication)
    await notifyCorporateAuthorizer({
      kind: 'business-cards',
      recordId: order.id,
      submittedByEmail: user.email,
      submittedByName: user.name,
      details: `${String(firstName).trim()} ${String(lastName).trim()} · ${String(workroom).trim()}`,
    })

    // Send a receipt email to the submitter if requested
    if (sendEmailReceipt) {
      const receiptTo = user.email || String(emailAddress || '').trim()
      if (receiptTo) {
        await sendReceiptEmail({
          to: receiptTo,
          orderDate: String(orderDate),
          workroom: String(workroom).trim(),
          firstName: String(firstName).trim(),
          lastName: String(lastName).trim(),
          businessPhone: businessPhone?.trim() || '',
          jobTitle: jobTitle?.trim() || '',
          emailAddress: emailAddress?.trim() || '',
          quantity: 500,
        })
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error creating business card order:', error)
    return NextResponse.json({ error: 'Failed to create business card order', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = session.user as any
  const role = String(user?.role || '').toUpperCase()
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, status, reviewNote } = body

    if (!id) {
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (status === 'approved' || status === 'denied') {
      updateData.status = status
      updateData.reviewedBy = user.name || user.email || null
      updateData.reviewedAt = new Date()
      updateData.reviewNote = typeof reviewNote === 'string' ? reviewNote.trim() || null : null
    } else if (status === 'pending') {
      updateData.status = 'pending'
      updateData.reviewedBy = null
      updateData.reviewedAt = null
      updateData.reviewNote = null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const order = await prisma.businessCardOrder.update({
      where: { id },
      data: updateData,
    })

    if (status === 'approved' || status === 'denied') {
      const recipient = order.createdByEmail || order.emailAddress
      if (recipient) {
        await notifyRequesterDecision({
          kind: 'business-cards',
          recordId: order.id,
          to: recipient,
          name: order.createdByName,
          status,
          reviewNote,
          details: `${order.firstName} ${order.lastName} · ${order.workroom}`,
        })
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('Error updating business card order:', error)
    return NextResponse.json({ error: 'Failed to update business card order', details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const user = session.user as any
  const role = String(user?.role || '').toUpperCase()
  if (!REVIEWER_ROLES.has(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Order id is required' }, { status: 400 })
    }
    await prisma.businessCardOrder.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting business card order:', error)
    return NextResponse.json({ error: 'Failed to delete business card order', details: error.message }, { status: 500 })
  }
}
