import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getTokenInfo } from "@/lib/ringCentral"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const info = await getTokenInfo()
    return NextResponse.json({
      tokenInfo: info,
      relevantPermissions: {
        hasReadCallLog: info.scope?.includes("ReadCallLog") || false,
        scopes: info.scope || null,
      },
      env: {
        clientIdSet: !!process.env.RINGCENTRAL_CLIENT_ID,
        clientSecretSet: !!process.env.RINGCENTRAL_CLIENT_SECRET,
        jwtSet: !!process.env.RINGCENTRAL_JWT_TOKEN,
        serverUrl: process.env.RINGCENTRAL_SERVER_URL || "default",
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
