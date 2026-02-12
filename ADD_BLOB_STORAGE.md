# Add Blob Storage (You Already Have Database ✅)

## Current Setup
- ✅ **Database:** Neon (PostgreSQL) - Already set up!
- ❌ **Blob Storage:** Not set up yet (needed for file uploads)

## What You Need to Do

Since you already have a database, you just need to **ADD** Blob Storage:

### Step 1: Go to Vercel Storage Tab

1. **Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`
   - Click **Storage** tab

2. **You'll see:**
   - Your existing Neon database ✅
   - **"Create Database"** button (to add more storage)

### Step 2: Create Blob Storage

1. **Click "Create Database"**
2. **Select "Blob"** (NOT Postgres - you already have that!)
3. **Name it:** `floor-interior-blob` (or any name)
4. **Select region:** Same as your app
5. **Click "Create"**

### Step 3: Verify Environment Variable

After creating Blob Storage:
- Go to **Settings** → **Environment Variables**
- You should see `BLOB_READ_WRITE_TOKEN` automatically added
- ✅ Make sure it's enabled for **Production** environment

### Step 4: Install Package & Deploy

```bash
# Install package
npm install @vercel/blob

# Commit and push
git add .
git commit -m "Add Blob Storage for file uploads"
git push
```

## Summary

**You'll have TWO things in Storage tab:**
1. ✅ Neon Database (for data) - Already exists
2. ✅ Blob Storage (for files) - Need to add this

**Both work together:**
- Database stores installer info, interviews, etc.
- Blob Storage stores uploaded documents/photos

## Quick Checklist

- [ ] Go to Vercel Dashboard → Storage tab
- [ ] Click "Create Database" → Select "Blob"
- [ ] Create the blob storage
- [ ] Verify `BLOB_READ_WRITE_TOKEN` exists in Environment Variables
- [ ] Run `npm install @vercel/blob` locally
- [ ] Commit and push code
- [ ] Test file uploads in production

That's it! 🎉
