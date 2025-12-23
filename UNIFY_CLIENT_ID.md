# Unify Azure AD Client ID for Local and Production

## Goal
Use the same Azure AD client ID (`1e9c9b96-10e8-43b2-a75c-8995c45d7c26`) for both local and production.

## Current Status

✅ **Local:** Already using `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
❌ **Production:** Currently using `dd3245ef-30b6-4929-8373-dc5bbcd06268` (needs to be changed)

## Step 1: Update Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Update `AZURE_AD_CLIENT_ID`:**
   - Go to: **Settings** → **Environment Variables**
   - Find `AZURE_AD_CLIENT_ID`
   - Click on it to edit
   - **Change the value to:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Make sure it's set for **Production** environment (and Preview/Development if needed)
   - Click **Save**

3. **Verify:**
   - After updating, `AZURE_AD_CLIENT_ID` should be: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - For all environments (Production, Preview, Development)

## Step 2: Update Azure AD Redirect URIs

The Azure AD app with ID `1e9c9b96-10e8-43b2-a75c-8995c45d7c26` needs to have BOTH redirect URIs:

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Sign in with your admin account

2. **Find the App:**
   - Navigate to: **Azure Active Directory** → **App registrations**
   - Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Click on the app

3. **Go to Authentication:**
   - Click **Authentication** (left menu)
   - Scroll to **Redirect URIs** section

4. **Add/Verify Redirect URIs:**
   Make sure you have BOTH of these:
   
   **For Local Development:**
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
   
   **For Production:**
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```

5. **If missing, add them:**
   - Click **Add URI** or **Add a platform** → **Web**
   - Paste the URL
   - Click **Save** after each addition

6. **Verify both are there:**
   - You should see both URLs in the Redirect URIs list
   - No trailing slashes
   - Exact matches

## Step 3: Redeploy

After updating Vercel environment variables:

1. **Go to Vercel Dashboard:**
   - **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push to GitHub (auto-deploys)

2. **Wait for deployment to complete**

## Step 4: Test

1. **Test Local:**
   - Visit: http://localhost:3000/login
   - Try signing in
   - Should work ✅

2. **Test Production:**
   - Visit: https://floor-interior-service.vercel.app/login
   - Try signing in
   - Should work ✅

## Summary

After completing these steps:
- ✅ Both local and production will use: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- ✅ One Azure AD app to manage
- ✅ Both redirect URIs configured in the same app
- ✅ Simpler configuration

## Checklist

- [ ] Updated `AZURE_AD_CLIENT_ID` in Vercel to: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- [ ] Verified it's set for Production environment
- [ ] Added `http://localhost:3000/api/auth/callback/azure-ad` to Azure AD app
- [ ] Added `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` to Azure AD app
- [ ] Saved changes in Azure AD
- [ ] Redeployed on Vercel
- [ ] Tested local sign-in
- [ ] Tested production sign-in

