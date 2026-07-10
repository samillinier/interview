import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const requestorLocation = searchParams.get('requestorLocation')
    const receivingWorkroom = searchParams.get('receivingWorkroom')
    const fulfillmentWorkroom = searchParams.get('fulfillmentWorkroom')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {}
    if (requestorLocation) where.requestorLocation = requestorLocation
    if (receivingWorkroom) where.receivingWorkroom = receivingWorkroom
    if (fulfillmentWorkroom) where.fulfillmentWorkroom = fulfillmentWorkroom
    if (startDate || endDate) {
      where.dateRequested = {}
      if (startDate) where.dateRequested.gte = new Date(startDate)
      if (endDate) where.dateRequested.lte = new Date(endDate)
    }

    const [transfers, total] = await Promise.all([
      prisma.padTransfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.padTransfer.count({ where }),
    ])

    return NextResponse.json({ success: true, transfers, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error('Error fetching pad transfers:', error)
    return NextResponse.json({ error: 'Failed to fetch pad transfers', details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { dateRequested, requestorLocation, receivingWorkroom, fulfillmentWorkroom, reasonForTransfer, transferMethod, estimatedCost, padType, rollQuantity, linearFeet, hasAdditionalItems, additionalItems, attachmentUrls, authorizedBy } = body

    if (!dateRequested || !requestorLocation || !receivingWorkroom || !fulfillmentWorkroom || !reasonForTransfer) {
      return NextResponse.json({ error: 'Date, requestor location, receiving workroom, fulfillment workroom, and reason are required' }, { status: 400 })
    }

    const user = session.user as any
    const transfer = await prisma.padTransfer.create({
      data: {
        dateRequested: new Date(dateRequested),
        requestorLocation,
        receivingWorkroom,
        fulfillmentWorkroom,
        reasonForTransfer,
        transferMethod: transferMethod || null,
        estimatedCost: estimatedCost || null,
        padType: padType || null,
        rollQuantity: typeof rollQuantity === 'number' && rollQuantity >= 0 ? rollQuantity : null,
        linearFeet: typeof linearFeet === 'number' && linearFeet >= 0 ? linearFeet : null,
        hasAdditionalItems: hasAdditionalItems || false,
        additionalItems: additionalItems || null,
        attachmentUrls: attachmentUrls && Array.isArray(attachmentUrls) ? attachmentUrls : [],
        createdByEmail: user.email || null,
        createdByName: user.name || null,
        authorizedBy: null,
      },
    })

    return NextResponse.json({ success: true, transfer })
  } catch (error: any) {
    console.error('Error creating pad transfer:', error)
    return NextResponse.json({ error: 'Failed to create pad transfer', details: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = session.user as any

  try {
    const body = await request.json()
    const { id, authorized } = body

    if (!id) {
      return NextResponse.json({ error: 'Transfer id is required' }, { status: 400 })
    }

    const updateData: any = {}

    if (typeof authorized === 'boolean') {
      updateData.authorized = authorized
      if (authorized) {
        updateData.authorizationMethod = user.name || user.email || 'Unknown'
        updateData.authorizedBy = user.name || user.email || null
      } else {
        updateData.authorizationMethod = null
        updateData.authorizedBy = null
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const transfer = await prisma.padTransfer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ success: true, transfer })
  } catch (error: any) {
    console.error('Error updating pad transfer:', error)
    return NextResponse.json({ error: 'Failed to update pad transfer', details: error.message }, { status: 500 })
  }
}
