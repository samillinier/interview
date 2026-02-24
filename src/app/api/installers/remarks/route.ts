import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Fetch all installers that have remarks
    const installers = await prisma.installer.findMany({
      where: {
        remarks: {
          not: null,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        remarks: true,
        companyName: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Parse remarks for each installer and format the response
    const installersWithRemarks = installers.map((installer) => {
      let parsedRemarks: Array<{ date: string | null; note: string; createdAt: string }> = []
      
      if (installer.remarks) {
        try {
          const parsed = JSON.parse(installer.remarks)
          if (Array.isArray(parsed)) {
            parsedRemarks = parsed.sort(
              (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          }
        } catch (error) {
          console.error('Error parsing remarks for installer', installer.id, error)
        }
      }

      return {
        id: installer.id,
        firstName: installer.firstName,
        lastName: installer.lastName,
        email: installer.email,
        phone: installer.phone,
        status: installer.status,
        companyName: installer.companyName,
        remarksCount: parsedRemarks.length,
        remarks: parsedRemarks,
        createdAt: installer.createdAt,
        updatedAt: installer.updatedAt,
      }
    })

    return NextResponse.json({
      success: true,
      installers: installersWithRemarks,
    })
  } catch (error: any) {
    console.error('Error fetching installers with remarks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch installers with remarks', details: error.message },
      { status: 500 }
    )
  }
}
