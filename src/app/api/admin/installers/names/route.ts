import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from '@/lib/db'

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/installers/names
 * Returns all active installer id, firstName, lastName for name-matching with Cilio.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const installers = await prisma.installer.findMany({
      where: { status: { not: 'rejected' } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
      },
      orderBy: { firstName: 'asc' },
    })

    return NextResponse.json({ installers })
  } catch (error: any) {
    console.error("Error fetching installer names:", error)
    return NextResponse.json({ error: "Failed to fetch installers" }, { status: 500 })
  }
}
