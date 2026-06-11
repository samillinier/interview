# Quick Setup - Vercel Blob Storage

## ✅ Already Done:
1. ✓ Added `@vercel/blob` to `package.json`
2. ✓ Updated all upload routes to use cloud storage
3. ✓ Created storage utility with automatic fallback

## 🔧 What You Need to Do:

### Step 1: Install the Package
Due to some node_modules issues, run this command in your terminal:

```bash
# Option 1: Clean install (recommended if you have issues)
rm -rf node_modules package-lock.json
npm install

# Option 2: Just install the new package
npm install @vercel/blob@latest
```

### Step 2: Create .env.local File
Create a file named `.env.local` in your project root with:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
```

### Step 3: Add to Vercel (Production)
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Name: `BLOB_READ_WRITE_TOKEN`
5. Value: `vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n`
6. Select all environments (Production, Preview, Development)
7. Click **Save**

### Step 4: Redeploy
After adding the environment variable, redeploy:
- Push to your main branch (if auto-deploy is enabled), OR
- Run: `vercel --prod`

## 🎉 That's It!

After these steps, file uploads will work in production!
