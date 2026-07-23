# Check and Fix Blob Store Configuration

## Current Status
- ✅ `BLOB_READ_WRITE_TOKEN` is set in environment variables (added 20 minutes ago)
- ⚠️ Need to verify it's pointing to the **correct** blob store

## Steps to Fix

### Step 1: Check All Blob Stores

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Click **Storage** in the top navigation bar

2. **List All Blob Stores:**
   - You'll see all blob stores across all projects
   - Each blob store shows:
     - Name
     - Associated project (if any)
     - Created date
     - Token

### Step 2: Identify the Correct Blob Store

**For floor-interior-service project:**
- Look for a blob store that is:
  - Associated with **floor-interior-service** project, OR
  - Created specifically for this project
  - NOT associated with other projects like "interview" or "fis"

### Step 3: Get the Correct Token

1. **Click on the CORRECT blob store** (for floor-interior-service)
2. **Copy the BLOB_READ_WRITE_TOKEN** from that blob store
3. **Note:** The token should start with `vercel_blob_rw_...`

### Step 4: Update Environment Variable

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to: **floor-interior-service** → **Settings** → **Environment Variables**
2. Find `BLOB_READ_WRITE_TOKEN`
3. Click on it → **Edit**
4. Replace with the **correct** token from Step 3
5. Make sure it's set for **all environments**
6. Click **Save**

**Option B: Via CLI**

```bash
# Remove the wrong token
vercel env rm BLOB_READ_WRITE_TOKEN production
vercel env rm BLOB_READ_WRITE_TOKEN preview  
vercel env rm BLOB_READ_WRITE_TOKEN development

# Add the correct token (replace with actual token)
vercel env add BLOB_READ_WRITE_TOKEN production
# Paste the correct token when prompted

vercel env add BLOB_READ_WRITE_TOKEN preview
# Paste the correct token when prompted

vercel env add BLOB_READ_WRITE_TOKEN development
# Paste the correct token when prompted
```

### Step 5: Delete Wrong Blob Store (Optional)

If you created a blob store by mistake:

1. Go to **Storage** tab
2. Find the **wrong** blob store
3. Click on it
4. **Delete** it (only if it's not being used)

### Step 6: Redeploy

After updating the token:

```bash
vercel --prod
```

OR

- Go to **Deployments** → Click **"..."** → **Redeploy**

## Current Token (to verify)

The token currently set:
```
vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
```

**Question:** Does this token belong to the blob store for **floor-interior-service**, or is it from another project's blob store?

## How to Verify After Fix

1. **Test file upload** in production
2. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```
3. **Look for:** "Successfully uploaded to Vercel Blob"
4. **Check Storage tab** to see if files appear in the correct blob store
