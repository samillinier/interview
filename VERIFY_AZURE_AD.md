# Verify Azure AD Configuration - Step by Step

## Current Configuration (from debug endpoint)
- ✅ Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- ✅ Client Secret: Set
- ✅ Tenant ID: `51905564-c059-411b-bdc8-17a6f4668fb9`
- ✅ NEXTAUTH_URL: `https://floor-interior-service.vercel.app`
- ✅ Expected Callback: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## Step 1: Verify Azure AD Redirect URI

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Sign in with admin account

2. **Navigate to App Registration:**
   - Click: **Azure Active Directory** (left sidebar)
   - Click: **App registrations**
   - Search for or find: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
   - Click on the app name

3. **Check Redirect URIs:**
   - Click: **Authentication** (left sidebar)
   - Scroll to: **Redirect URIs** section
   - **You should see:**
     ```
     https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
     ```
   - **If you DON'T see it:**
     - Click **Add a platform** → **Web**
     - Paste exactly: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
     - Click **Save**

4. **Verify it's EXACTLY:**
   - ✅ Starts with `https://` (not `http://`)
   - ✅ No trailing slash
   - ✅ Exact case match
   - ✅ Includes `/api/auth/callback/azure-ad` at the end

## Step 2: Double-Check Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select: `floor-interior-service`

2. **Check NEXTAUTH_URL:**
   - Settings → Environment Variables
   - Find `NEXTAUTH_URL` (Production)
   - **Must be exactly:** `https://floor-interior-service.vercel.app`
   - **NO trailing slash!**
   - If wrong, click Edit, update, Save

3. **Verify Azure AD Variables:**
   - `AZURE_AD_CLIENT_ID` = `dd3245ef-30b6-4929-8373-dc5bbcd06268`
   - `AZURE_AD_CLIENT_SECRET` = `a115ae4f-a109-4f29-9858-151650334f30`
   - `AZURE_AD_TENANT_ID` = `51905564-c059-411b-bdc8-17a6f4668fb9` (no newline!)

## Step 3: Check Client Secret Expiration

1. **In Azure Portal:**
   - Go to your app → **Certificates & secrets**
   - Check if the client secret has expired
   - If expired, create a new one and update Vercel

## Step 4: Verify Tenant ID

The tenant ID in your debug output shows: `51905564-c059-411b-bdc8-17a6f4668fb9`

Make sure:
- In Azure AD app → **Overview** → **Directory (tenant) ID** matches
- In Vercel → `AZURE_AD_TENANT_ID` matches exactly (no newlines/spaces)

## Step 5: Test After Changes

1. **After updating Azure AD redirect URI:**
   - Wait 1-2 minutes for changes to propagate
   - Clear browser cache or use incognito mode
   - Visit: `https://floor-interior-service.vercel.app/auth/signin`
   - Click "Sign in with Microsoft"
   - Check debug panel for any errors

## Common Mistakes

❌ **Wrong:** `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad/` (trailing slash)
✅ **Correct:** `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

❌ **Wrong:** `http://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (http instead of https)
✅ **Correct:** `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

❌ **Wrong:** Different URL entirely
✅ **Correct:** Exact match to `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## Still Not Working?

If after all this it still doesn't work:

1. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```
   Then try signing in and watch for NextAuth errors

2. **Check Browser Network Tab:**
   - Open DevTools → Network tab
   - Try signing in
   - Look for failed requests to `/api/auth/callback/azure-ad`
   - Check the error response

3. **Verify App Registration Status:**
   - In Azure Portal, make sure the app is **Active**
   - Check that it's not disabled or deleted

