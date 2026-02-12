# Quick Setup: Vercel Blob Storage

## ✅ Code Changes Complete
All upload routes have been updated to use Vercel Blob Storage. The code is ready!

## 📦 Step 1: Install Package (Run this locally)

```bash
npm install @vercel/blob
```

If you get permission errors, try:
```bash
sudo npm install @vercel/blob
```

Or use yarn:
```bash
yarn add @vercel/blob
```

## 🔧 Step 2: Set Up Vercel Blob Storage

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Create Blob Storage:**
   - Click on the **Storage** tab
   - Click **Create Database** button
   - Select **Blob** from the options
   - Name it: `floor-interior-blob` (or any name you prefer)
   - Select the same region as your app
   - Click **Create**

3. **Verify Environment Variable:**
   - After creating, go to **Settings** → **Environment Variables**
   - You should see `BLOB_READ_WRITE_TOKEN` automatically created
   - If not, manually add it:
     - Name: `BLOB_READ_WRITE_TOKEN`
     - Value: (Get from Blob Storage settings → `.env.local` tab)
     - Environments: ✅ Production ✅ Preview ✅ Development
     - Click **Save**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Create blob storage (this will prompt you)
vercel blob create
```

## 🚀 Step 3: Deploy

After setting up blob storage:

1. **Commit and push:**
   ```bash
   git add .
   git commit -m "Add Vercel Blob Storage for file uploads"
   git push
   ```

2. **Or redeploy in Vercel Dashboard:**
   - Go to **Deployments** tab
   - Click **Redeploy** on latest deployment

## ✅ Step 4: Test

1. **Test in Production:**
   - Go to your production URL
   - Try uploading a document/photo
   - It should work now! 🎉

2. **Verify:**
   - Check Vercel Dashboard → Storage → Your Blob Storage
   - You should see uploaded files there

## 🔍 Troubleshooting

**If uploads still fail:**
- ✅ Check `BLOB_READ_WRITE_TOKEN` exists in Vercel environment variables
- ✅ Make sure it's set for Production environment
- ✅ Redeploy after adding the variable
- ✅ Check Vercel deployment logs for errors

**If package not found:**
- ✅ Run `npm install @vercel/blob` locally
- ✅ Commit `package.json` and `package-lock.json`
- ✅ Push and redeploy

## 📝 What Changed

- ✅ Document upload route (`/api/installers/[id]/documents`)
- ✅ Photo upload route (`/api/installers/upload-photo`)
- ✅ Staff photo upload route (`/api/installers/[id]/staff/upload-photo`)
- ✅ Added `@vercel/blob` to package.json

All routes now:
- Use Vercel Blob Storage in production (when token exists)
- Fall back to local filesystem for development (when token missing)
