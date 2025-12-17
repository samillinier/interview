import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const experience = searchParams.get('experience')
    const specialty = searchParams.get('specialty')
    const location = searchParams.get('location')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ]
    }

    if (experience && experience !== 'all') {
      const [min, max] = experience.split('-').map(Number)
      if (max) {
        where.yearsOfExperience = { gte: min, lte: max }
      } else {
        where.yearsOfExperience = { gte: min }
      }
    }

    if (specialty && specialty !== 'all') {
      where.flooringSpecialties = { contains: specialty }
    }

    if (location && location !== 'all') {
      where.serviceAreas = { contains: location }
    }

    // Get total count
    const total = await prisma.installer.count({ where })

    // Get installers
    const installers = await prisma.installer.findMany({
      where,
      include: {
        interviews: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      installers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching installers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const installer = await prisma.installer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        status: 'pending',
      },
    })

    return NextResponse.json({ installer })
  } catch (error) {
    console.error('Error creating installer:', error)
    return NextResponse.json(
      { error: 'Failed to create installer' },
      { status: 500 }
    )
  }
}



