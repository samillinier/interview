# Add BLOB_READ_WRITE_TOKEN Manually

## Issue
The `BLOB_READ_WRITE_TOKEN` environment variable wasn't automatically created.

## Solution: Add It Manually

### Step 1: Get the Token from Blob Storage

1. **In Vercel Dashboard:**
   - Go to **Storage** tab (not Settings)
   - Click on your Blob Storage: `floor-interior-blob`
   - Look for a section showing connection details or `.env.local` tab
   - You should see `BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...`
   - Copy the token value (the part after `=`)

### Step 2: Add Environment Variable

1. **Go back to Settings → Environment Variables**
2. **Click "Add Environment Variable"**
3. **Fill in:**
   - **Name:** `BLOB_READ_WRITE_TOKEN`
   - **Value:** Paste the token you copied
   - **Environments:** 
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
4. **Click "Save"**

### Step 3: Verify

After adding, you should see:
- `BLOB_READ_WRITE_TOKEN` in the list
- It should be enabled for Production, Preview, and Development

### Alternative: Check Blob Storage Settings

If you can't find the token in Storage tab:
1. Click on `floor-interior-blob` in Storage tab
2. Look for "Settings" or "Connection" section
3. The token should be displayed there
4. Copy it and add as environment variable

## After Adding Token

1. **Redeploy:**
   - Go to **Deployments** tab
   - Click **Redeploy** on latest deployment
   - Or push code to trigger auto-deploy

2. **Test:**
   - Try uploading a file in production
   - It should work now!
