# Debugging Upload Issues

## Current Status
The upload system has been updated to use Vercel Blob Storage. Here's how to debug if uploads are still failing:

## Check These Things:

### 1. Environment Variable Setup

**Local Development:**
- Check `.env.local` exists and contains:
  ```
  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_kysUQ7sC3rZLJsyu_Yl7L75MCRzvbPkEEoRUHx11QXJnB8n
  ```
- Restart your dev server after creating/updating `.env.local`

**Production (Vercel):**
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Make sure it's set for **all environments** (Production, Preview, Development)
- **Redeploy** after adding/updating the variable

### 2. Check Server Logs

Look at your server logs (Vercel function logs or local terminal) for:
- `Vercel Blob upload error:` - Shows the actual error
- `Error details:` - Shows environment detection info
- `Successfully uploaded to Vercel Blob:` - Confirms successful upload

### 3. Common Issues

**Issue: "Vercel Blob package not found"**
- Solution: Run `npm install @vercel/blob`

**Issue: "No storage configured"**
- Solution: Add `BLOB_READ_WRITE_TOKEN` to environment variables

**Issue: "Vercel Blob upload failed: [error]"**
- Check the token is correct
- Check the token has read/write permissions
- Verify the token is set in the correct environment

**Issue: Works locally but not in production**
- Make sure the token is set in Vercel environment variables
- Redeploy after adding the token
- Check Vercel function logs for specific errors

### 4. Test Upload

Try uploading a small file (under 1MB) and check:
1. Browser console for errors
2. Network tab for the API response
3. Server logs for detailed error messages

### 5. Manual Test

You can test the storage utility directly by checking:
- Is `@vercel/blob` installed? (`npm list @vercel/blob`)
- Is the token accessible? (Check `.env.local` locally, Vercel env vars in production)
- Are you testing locally or in production?

## Next Steps

If uploads still fail:
1. Share the exact error message from server logs
2. Share whether you're testing locally or in production
3. Share the response from the API endpoint (check browser Network tab)
