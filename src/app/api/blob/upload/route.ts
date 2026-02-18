import { NextResponse } from 'next/server'
import { handleUpload } from '@vercel/blob/client'

export const runtime = 'nodejs'
export const maxDuration = 30

// Direct-to-Blob upload handler:
// The browser uploads the file directly to Vercel Blob (bypassing Vercel function body limits),
// then the client stores the returned URL in our DB via /api/installers/[id]/documents (JSON).
export async function POST(request: Request) {
  try {
    // Some projects store the token under Vercel's system env var name.
    // The Blob client upload handler expects BLOB_READ_WRITE_TOKEN specifically.
    if (!process.env.BLOB_READ_WRITE_TOKEN && process.env.VERCEL_BLOB_READ_WRITE_TOKEN) {
      process.env.BLOB_READ_WRITE_TOKEN = process.env.VERCEL_BLOB_READ_WRITE_TOKEN
    }

    const rawBody: any = await request.json()

    // Normalize across @vercel/blob/client versions:
    // Some versions send `{ type, payload: {...} }`, others send a flat payload.
    const body: any = rawBody?.payload
      ? rawBody
      : {
          type: rawBody?.type || 'blob.generate-client-token',
          payload: rawBody,
        }

    const jsonResponse = await (handleUpload as any)({
      request,
      body,
      // Called before generating the signed upload token
      onBeforeGenerateToken: async (pathname: string) => {
        if (!pathname || !pathname.startsWith('documents/')) {
          throw new Error('Invalid upload path')
        }

        return {
          allowedContentTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
            'image/jpg',
          ],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB
          tokenPayload: JSON.stringify({ pathname }),
        }
      },
      // Called after upload completes
      onUploadCompleted: async () => {
        // No-op: DB write happens client-side after we receive blob.url
      },
    })

    // `handleUpload` returns a JSON-serializable object; always return a Response.
    return NextResponse.json(jsonResponse)
  } catch (error: any) {
    console.error('Blob upload handler error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create upload token' },
      { status: 500 }
    )
  }
}

