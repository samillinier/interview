# Fix OAuthSignin Error

## Current Status
- ✅ Azure AD provider is configured correctly
- ❌ OAuthSignin error - Sign-in failing
- 🔍 Expected callback URL: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## The Problem
The `OAuthSignin` error means one of these is wrong:
1. Redirect URI in Azure AD doesn't match
2. NEXTAUTH_URL in Vercel doesn't match production URL
3. Client ID or Secret is incorrect

## Step-by-Step Fix

### Step 1: Verify Production URL
Your production URL is: `https://floor-interior-service.vercel.app`

### Step 2: Update Azure AD Redirect URI

1. **Go to Azure Portal:**
   - Visit https://portal.azure.com
   - Sign in with admin account

2. **Navigate to App Registration:**
   - Azure Active Directory → App registrations
   - Find app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

3. **Update Redirect URI:**
   - Click on your app
   - Go to **Authentication** (left sidebar)
   - Under **Redirect URIs**, remove any incorrect URLs
   - **Add this EXACT URL:**
     ```
     https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
     ```
   - **Keep this for local dev:**
     ```
     http://localhost:3000/api/auth/callback/azure-ad
     ```
   - Click **Save**

### Step 3: Verify Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select project: `floor-interior-service`

2. **Check Environment Variables:**
   - Go to: **Settings** → **Environment Variables**
   - Find `NEXTAUTH_URL` (Production)
   - **Must be exactly:** `https://floor-interior-service.vercel.app`
   - **NO trailing slash!**
   - If wrong, click Edit and update it

3. **Check `NEXT_PUBLIC_APP_URL`:**
   - Should also be: `https://floor-interior-service.vercel.app`
   - Update if different

4. **Verify Azure AD Variables:**
   - `AZURE_AD_CLIENT_ID` = `dd3245ef-30b6-4929-8373-dc5bbcd06268`
   - `AZURE_AD_CLIENT_SECRET` = `a115ae4f-a109-4f29-9858-151650334f30`
   - `AZURE_AD_TENANT_ID` = `common` (or your tenant ID)

### Step 4: Redeploy (if you changed NEXTAUTH_URL)

If you updated `NEXTAUTH_URL` in Vercel:
- Go to **Deployments** tab
- Click **Redeploy** on the latest deployment
- Or wait for next automatic deployment

### Step 5: Test

1. Visit: `https://floor-interior-service.vercel.app/auth/signin`
2. Click "Sign in with Microsoft"
3. Check the debug panel for any new errors

## Common Mistakes

❌ **Wrong:** `https://floor-interior-service.vercel.app/` (trailing slash)
✅ **Correct:** `https://floor-interior-service.vercel.app` (no trailing slash)

❌ **Wrong:** `https://floor-interior-service-xxxxx.vercel.app` (old deployment URL)
✅ **Correct:** `https://floor-interior-service.vercel.app` (main production URL)

❌ **Wrong:** Case mismatch or extra spaces
✅ **Correct:** Exact match, case-sensitive

## Verification Checklist

- [ ] Azure AD redirect URI = `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- [ ] NEXTAUTH_URL (Production) = `https://floor-interior-service.vercel.app`
- [ ] NEXT_PUBLIC_APP_URL (Production) = `https://floor-interior-service.vercel.app`
- [ ] AZURE_AD_CLIENT_ID is correct
- [ ] AZURE_AD_CLIENT_SECRET is correct
- [ ] All variables saved in Vercel
- [ ] Redeployed after changes

## If Still Not Working

1. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```
   Then try signing in and watch for errors

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for any additional errors

3. **Verify Azure AD App:**
   - Make sure the app is active
   - Check that the client secret hasn't expired
   - Verify tenant ID is correct

