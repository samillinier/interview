# Vercel Blob Storage Setup Guide

## Problem
File uploads (attachments, photos) don't work in production because Vercel uses a read-only filesystem. Files written to the local filesystem are ephemeral and will be lost.

## Solution
Use Vercel Blob Storage for production, with filesystem fallback for local development.

## Step 1: Install Package

Run this command locally:
```bash
npm install @vercel/blob
```

## Step 2: Set Up Vercel Blob Storage

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Create Blob Storage:**
   - Go to the **Storage** tab
   - Click **Create Database** → Select **Blob**
   - Name it (e.g., `floor-interior-blob`)
   - Select a region (same as your app)
   - Click **Create**

3. **Get the Token:**
   - After creating the blob storage, go to **Settings** → **Environment Variables**
   - Vercel will automatically create `BLOB_READ_WRITE_TOKEN`
   - Copy this token value

## Step 3: Add Environment Variable

1. **In Vercel Dashboard:**
   - Go to **Settings** → **Environment Variables**
   - Verify `BLOB_READ_WRITE_TOKEN` exists (it should be auto-created)
   - If not, add it manually:
     - Name: `BLOB_READ_WRITE_TOKEN`
     - Value: (copy from Blob Storage settings)
     - Environment: Select **Production**, **Preview**, and **Development**
     - Click **Save**

## Step 4: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push to GitHub (auto-deploys)

## How It Works

- **Production (Vercel):** Files are uploaded to Vercel Blob Storage and stored permanently
- **Local Development:** Files are saved to `public/uploads/` directory (works locally)

The code automatically detects if `BLOB_READ_WRITE_TOKEN` exists:
- ✅ If token exists → Uses Vercel Blob Storage
- ❌ If token missing → Falls back to local filesystem

## Updated Routes

The following routes now support Vercel Blob Storage:
- ✅ `/api/installers/[id]/documents` - Document/attachment uploads
- ✅ `/api/installers/upload-photo` - Installer photo uploads
- ✅ `/api/installers/[id]/staff/upload-photo` - Staff photo uploads

## Testing

1. **Test Locally:**
   - Uploads should work and save to `public/uploads/` directory

2. **Test in Production:**
   - After setting up Blob Storage and redeploying
   - Upload a file/photo
   - Check that it's accessible via the returned URL
   - Files should persist across deployments

## Troubleshooting

**Issue: Uploads still failing in production**
- ✅ Verify `BLOB_READ_WRITE_TOKEN` is set in Vercel environment variables
- ✅ Make sure you selected all environments (Production, Preview, Development)
- ✅ Redeploy after adding the variable
- ✅ Check Vercel deployment logs for errors

**Issue: Package not found error**
- ✅ Run `npm install @vercel/blob` locally
- ✅ Commit `package.json` and `package-lock.json`
- ✅ Push to GitHub and redeploy

**Issue: Files not accessible**
- ✅ Verify blob storage is created in Vercel Dashboard
- ✅ Check that files are uploaded with `access: 'public'`
- ✅ Verify the URL returned from blob storage is correct
