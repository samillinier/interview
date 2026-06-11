import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string; attachmentNumber: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const { orderNumber, attachmentNumber } = resolvedParams

    const baseUrl = process.env.CILIO_API_BASE_URL || "https://cilioapimgmt.azure-api.net/gatewayqa"
    const subscriptionKey = process.env.CILIO_SUBSCRIPTION_KEY || ""

    const url = `${baseUrl}/job/${orderNumber}/attachment/${attachmentNumber}/file`

    const cilioRes = await fetch(url, {
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
      },
    })

    if (!cilioRes.ok) {
      // If Cilio returns 500, the QA environment likely doesn't support file downloads.
      // Return a user-friendly HTML page instead of JSON.
      if (cilioRes.status === 500) {
        const errorText = await cilioRes.text().catch(() => "")
        return new NextResponse(
          `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Attachment Unavailable</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #334155; }
  .card { background: white; border-radius: 12px; padding: 32px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; max-width: 420px; }
  h2 { margin: 0 0 8px; font-size: 18px; color: #0f172a; }
  p { margin: 0 0 16px; font-size: 14px; color: #64748b; line-height: 1.5; }
  .tag { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
</style></head>
<body>
  <div class="card">
    <h2>Attachment Not Available</h2>
    <p>The Cilio QA environment does not support binary file downloads. Attachment metadata (filename, type, date) is available on the Jobs page.</p>
    <span class="tag">QA Environment</span>
  </div>
</body>
</html>`,
          {
            status: 503,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          }
        )
      }

      return NextResponse.json(
        { error: `Cilio API error ${cilioRes.status}` },
        { status: 502 }
      )
    }

    const contentType = cilioRes.headers.get("content-type") || "application/octet-stream"
    const contentDisposition =
      cilioRes.headers.get("content-disposition") ||
      `attachment; filename="attachment-${attachmentNumber}"`

    const arrayBuffer = await cilioRes.arrayBuffer()

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("Attachment file download error:", error)
    return NextResponse.json(
      { error: "Failed to download attachment" },
      { status: 500 }
    )
  }
}
