# How to Check the Actual Upload Error

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Try uploading a file
4. Look for any error messages in red

## Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to the **Network** tab
3. Try uploading a file
4. Find the request to `/api/installers/[id]/documents`
5. Click on it
6. Go to the **Response** tab
7. Look for the error message - it should now show detailed information

## Step 3: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Select your project: **floor-interior-service**
3. Go to **Logs** tab (or **Functions** tab)
4. Try uploading a file
5. Look for log entries containing:
   - `Vercel Blob upload error:`
   - `Error details:`
   - `File upload error:`

## Common Error Messages and Solutions

### "Vercel Blob package not found"
- **Solution:** The package isn't installed. Run `npm install @vercel/blob` and redeploy

### "No storage configured"
- **Solution:** The token isn't set. Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables and redeploy

### "401 Unauthorized" or "403 Forbidden"
- **Solution:** The token is invalid or doesn't have the right permissions. Check the token in Vercel

### "Network error" or "Failed to fetch"
- **Solution:** There might be a network issue or the Vercel Blob service is down

### "Invalid token" or "Token expired"
- **Solution:** Generate a new token from Vercel Dashboard → Storage → Blob Store

## What to Share

If uploads still fail, please share:
1. The exact error message from the browser console
2. The response from the Network tab
3. Any relevant logs from Vercel function logs

This will help identify the exact issue!
