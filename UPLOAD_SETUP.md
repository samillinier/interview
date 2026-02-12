# File Upload Setup for Production

## Problem
File uploads work locally but fail in production because serverless environments (like Vercel) have read-only filesystems.

## Solution
The application now uses **Vercel Blob Storage** for production and falls back to local filesystem for development.

## Setup Instructions

### 1. Install Vercel Blob Package

```bash
npm install @vercel/blob
```

**Important:** Make sure to install this package before deploying to production!

### 2. Get Vercel Blob Token

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Storage**
3. Create a new **Blob Store** (if you don't have one)
4. Copy the **BLOB_READ_WRITE_TOKEN**

### 3. Add Environment Variable

**For Local Development:**
Create a `.env.local` file in your project root (it's already in .gitignore):
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
```

**For Production (Vercel Dashboard):**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add: `BLOB_READ_WRITE_TOKEN` = `vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n`
4. Make sure to select all environments (Production, Preview, Development)

**Or via CLI:**
```bash
vercel env add BLOB_READ_WRITE_TOKEN production
# Enter the token when prompted: vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
```

### 4. Deploy

After adding the environment variable, redeploy your application:

```bash
vercel --prod
```

Or push to your main branch if auto-deployment is enabled.

## How It Works

- **Development (local)**: Files are saved to `public/uploads/` directory
- **Production**: Files are uploaded to Vercel Blob Storage and URLs are stored in the database

The code automatically detects the environment and uses the appropriate storage method.

## Troubleshooting

### Uploads Still Failing?

1. **Check Environment Variable**: Ensure `BLOB_READ_WRITE_TOKEN` is set in production
2. **Check Logs**: Look at Vercel function logs for detailed error messages
3. **Verify Package**: Ensure `@vercel/blob` is installed: `npm list @vercel/blob`

### Alternative: Use AWS S3

If you prefer AWS S3 instead of Vercel Blob, you can modify `src/lib/storage.ts` to use AWS SDK:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// Replace Vercel Blob code with S3 code
```

## Files Modified

- `src/lib/storage.ts` - New storage utility
- `src/app/api/installers/[id]/documents/route.ts` - Updated to use storage utility
- `src/app/api/installers/[id]/documents/[documentId]/route.ts` - Updated delete route
