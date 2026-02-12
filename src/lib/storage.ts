// Storage utility for handling file uploads
// Uses Vercel Blob in production, local filesystem in development

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export interface UploadResult {
  url: string
  path?: string
}

/**
 * Upload a file to storage
 * In production: Uses Vercel Blob Storage
 * In development: Uses local filesystem
 */
export async function uploadFile(
  file: File,
  folder: string,
  fileName: string
): Promise<UploadResult> {
  // Check if we have Vercel Blob configured (try blob first if token exists)
  const blobStoreToken = process.env.BLOB_READ_WRITE_TOKEN
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = process.env.VERCEL === '1'
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Use Vercel Blob if token is available (try it first if token exists)
  if (blobStoreToken) {
    try {
      // Dynamic import to handle case where package might not be installed
      const blobModule = await import('@vercel/blob').catch((err) => {
        console.error('Failed to import @vercel/blob:', err)
        return null
      })
      
      if (!blobModule) {
        throw new Error('@vercel/blob package not found. Install it with: npm install @vercel/blob')
      }
      
      const { put } = blobModule
      
      console.log('Attempting Vercel Blob upload:', {
        fileName: `${folder}/${fileName}`,
        fileSize: file.size,
        contentType: file.type,
        hasToken: !!blobStoreToken,
        tokenLength: blobStoreToken?.length,
        isProduction,
        isVercel,
        fileType: file.constructor.name,
      })
      
      // Convert File to Buffer - Vercel Blob v2 works best with Buffer
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      
      // Vercel Blob v2 - try with explicit token first, then fallback to env var
      const blob = await put(`${folder}/${fileName}`, buffer, {
        access: 'public',
        contentType: file.type || 'application/octet-stream',
        addRandomSuffix: false,
        token: blobStoreToken, // Explicitly pass token
      })

      console.log('Successfully uploaded to Vercel Blob:', blob.url)
      return {
        url: blob.url,
      }
    } catch (error: any) {
      const errorMessage = error.message || String(error)
      const errorDetails = {
        message: errorMessage,
        code: error.code,
        statusCode: error.statusCode,
        status: error.status,
        hasToken: !!blobStoreToken,
        tokenLength: blobStoreToken?.length,
        isProduction,
        isVercel,
        stack: error.stack,
      }
      
      console.error('Vercel Blob upload error:', errorMessage)
      console.error('Full error details:', JSON.stringify(errorDetails, null, 2))
      
      // In production/Vercel, don't fallback to local storage - throw error instead
      if (isProduction || isVercel) {
        throw new Error(`Vercel Blob upload failed: ${error.message || 'Unknown error'}. Please check your BLOB_READ_WRITE_TOKEN environment variable.`)
      }
      
      // Only fallback to local in development if blob fails
      if (isDevelopment) {
        console.log('Vercel Blob failed, falling back to local storage...')
      } else {
        throw error // Re-throw if not in development
      }
    }
  }

  // Use local filesystem (development only, when no token or blob failed)
  // Check if we're in a serverless environment - if so, don't use local storage
  if ((isProduction || isVercel) && !isDevelopment) {
    throw new Error('File upload failed: No storage configured. Please set BLOB_READ_WRITE_TOKEN environment variable.')
  }

  const uploadsDir = join(process.cwd(), 'public', 'uploads', folder)
  
  try {
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filePath = join(uploadsDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const fileUrl = `/uploads/${folder}/${fileName}`
    console.log('Successfully uploaded to local storage:', fileUrl)
    return {
      url: fileUrl,
      path: filePath,
    }
  } catch (error: any) {
    console.error('Local file upload error:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(url: string): Promise<void> {
  // If it's a Vercel Blob URL, delete from blob storage
  if (url.startsWith('https://') && url.includes('.blob.vercel-storage.com')) {
    try {
      const blobStoreToken = process.env.BLOB_READ_WRITE_TOKEN
      if (blobStoreToken) {
        const blobModule = await import('@vercel/blob').catch(() => null)
        if (blobModule) {
          const { del } = blobModule
          await del(url)
          return
        }
      }
    } catch (error: any) {
      console.error('Vercel Blob delete error:', error.message || error)
      // Continue to try local delete
    }
  }

  // Delete from local filesystem
  if (url.startsWith('/uploads/')) {
    try {
      const filePath = join(process.cwd(), 'public', url)
      if (existsSync(filePath)) {
        const { unlink } = await import('fs/promises')
        await unlink(filePath).catch(() => {}) // Ignore errors if file doesn't exist
      }
    } catch (error: any) {
      console.error('Local file delete error:', error)
      // Don't throw - file might not exist
    }
  }
}
