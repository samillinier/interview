# Fix Wrong Blob Store Configuration

## Issue
You accidentally added a blob store that's using the wrong database/project.

## Steps to Fix

### Step 1: Check Current Blob Stores

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click on **Storage** in the top navigation

2. **List All Blob Stores:**
   - You should see all blob stores listed
   - Note which ones belong to which project
   - Look for blob stores that might be incorrectly linked

### Step 2: Check Environment Variables

1. **Go to floor-interior-service project:**
   - Select: **floor-interior-service**
   - Go to **Settings** → **Environment Variables**

2. **Check BLOB_READ_WRITE_TOKEN:**
   - Find the `BLOB_READ_WRITE_TOKEN` variable
   - Note the token value (first few characters)
   - This token should match the blob store for **floor-interior-service**

### Step 3: Identify the Correct Blob Store

1. **In Storage tab:**
   - Find the blob store that belongs to **floor-interior-service**
   - Click on it
   - Copy the **BLOB_READ_WRITE_TOKEN** from that blob store

2. **Verify it's the right one:**
   - The blob store should be linked to the correct project
   - Check the project association in the blob store settings

### Step 4: Update Environment Variable

1. **Go to floor-interior-service → Settings → Environment Variables**

2. **Update BLOB_READ_WRITE_TOKEN:**
   - Click on the existing `BLOB_READ_WRITE_TOKEN`
   - Click **Edit** or **Delete** (if wrong)
   - Add the **correct** token from the right blob store
   - Make sure it's set for **all environments** (Production, Preview, Development)
   - Click **Save**

### Step 5: Delete Wrong Blob Store (if needed)

If you created a blob store by mistake:

1. **Go to Storage tab**
2. **Find the wrong blob store**
3. **Click on it**
4. **Delete it** (if it's not being used by any project)

### Step 6: Redeploy

After fixing the token:

1. **Redeploy the application:**
   - Go to **Deployments**
   - Click **"..."** on latest deployment
   - Select **Redeploy**

OR

2. **Push a commit** (if auto-deploy is enabled)

## How to Verify

After fixing:

1. **Test file upload** in production
2. **Check Vercel logs** for successful upload messages
3. **Verify files appear** in the correct blob store

## Current Token (Check if this is correct)

The token currently configured:
```
vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
```

**Action:** Verify this token belongs to the **floor-interior-service** blob store, not another project's blob store.
