# Production Sign-In Fix Guide

## Issue
Microsoft sign-in works locally but not in production.

## Root Cause
The redirect URI in Azure AD must exactly match your production URL.

## Current Production URL
Based on your latest deployment:
- **Production URL:** `https://floor-interior-service-gg2yzwpmp.vercel.app`
- **Required Redirect URI:** `https://floor-interior-service-gg2yzwpmp.vercel.app/api/auth/callback/azure-ad`

## Fix Steps

### Step 1: Update Azure AD Redirect URI

1. **Go to Azure Portal:**
   - Visit https://portal.azure.com
   - Sign in with your admin account

2. **Navigate to App Registration:**
   - Go to: **Azure Active Directory** → **App registrations**
   - Find your app with Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

3. **Update Redirect URIs:**
   - Click on your app
   - Go to **Authentication** (left sidebar)
   - Under **Redirect URIs**, click **Add a platform** → **Web**
   - Add these redirect URIs:
     - `https://floor-interior-service-gg2yzwpmp.vercel.app/api/auth/callback/azure-ad`
     - `https://floor-interior-service-*.vercel.app/api/auth/callback/azure-ad` (for preview deployments)
     - `http://localhost:3000/api/auth/callback/azure-ad` (for local development)
   - Click **Save**

### Step 2: Verify Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Check Environment Variables:**
   - Go to: **Settings** → **Environment Variables**
   - Verify these are set for **Production**:
     - `NEXTAUTH_URL` = `https://floor-interior-service-gg2yzwpmp.vercel.app`
     - `NEXT_PUBLIC_APP_URL` = `https://floor-interior-service-gg2yzwpmp.vercel.app`
     - `AZURE_AD_CLIENT_ID` = `dd3245ef-30b6-4929-8373-dc5bbcd06268`
     - `AZURE_AD_CLIENT_SECRET` = `a115ae4f-a109-4f29-9858-151650334f30`
     - `AZURE_AD_TENANT_ID` = (your tenant ID or `common`)

3. **If any are missing, add them:**
   - Click **Add New**
   - Select **Production** environment
   - Add the variable name and value
   - Click **Save**

### Step 3: Redeploy

After updating Azure AD and Vercel:

```bash
# Redeploy to production
vercel --prod
```

Or trigger a redeploy from Vercel Dashboard.

### Step 4: Test

1. Visit: `https://floor-interior-service-gg2yzwpmp.vercel.app/auth/signin`
2. Click "Sign in with Microsoft"
3. You should be redirected to Microsoft login
4. After login, you should be redirected back to the dashboard

## Troubleshooting

### If sign-in still doesn't work:

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for errors when clicking sign-in

2. **Check Vercel Logs:**
   ```bash
   vercel logs https://floor-interior-service-gg2yzwpmp.vercel.app
   ```

3. **Verify Redirect URI Match:**
   - The redirect URI in Azure AD must **exactly** match (case-sensitive)
   - No trailing slashes
   - Must use `https://` (not `http://`)

4. **Check NEXTAUTH_URL:**
   - Must match your production URL exactly
   - No trailing slash

## Important Notes

- **Vercel URLs change** if you redeploy to a new branch or after inactivity
- Consider setting up a **custom domain** for a stable URL
- The redirect URI must be added **before** users can sign in
- Changes to Azure AD can take a few minutes to propagate

