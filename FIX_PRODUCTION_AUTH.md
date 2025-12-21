# Fix Production Authentication Callback Error

## 🔴 The Problem

You're seeing this error in production:
```
Authentication callback failed. This usually means the redirect URI in Azure AD doesn't match. 
Please check that https://your-production-url.vercel.app/api/auth/callback/azure-ad is configured in Azure Portal.
```

## ✅ The Solution

You need to add your **production redirect URI** to Azure AD. Azure AD requires **exact URL matches** - no wildcards.

## 📋 Step-by-Step Fix

### Step 1: Get Your Production URL

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project
   - Go to **Deployments** tab
   - Click on the latest production deployment
   - Copy the URL (e.g., `https://floor-interior-service-abc123.vercel.app`)

2. **Or check your domain:**
   - If you have a custom domain, use that instead
   - Go to **Settings** → **Domains** to see your domain

### Step 2: Add Redirect URI to Azure AD

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Sign in with your admin account

2. **Navigate to App Registration:**
   - Click **Azure Active Directory** (left sidebar)
   - Click **App registrations** (under "Manage")
   - Find your app with Client ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Click on it

3. **Go to Authentication:**
   - In the left menu, click **Authentication**
   - Scroll to **Redirect URIs** section

4. **Add Production Redirect URI:**
   - Click **Add URI** or **Add a platform** → **Web**
   - Add your production URL in this format:
     ```
     https://your-production-url.vercel.app/api/auth/callback/azure-ad
     ```
   - **IMPORTANT:** 
     - ✅ Use `https://` (not `http://`)
     - ✅ No trailing slash at the end
     - ✅ Exact path: `/api/auth/callback/azure-ad`
     - ✅ Match your exact Vercel URL

5. **Keep Local Development URI:**
   - Make sure this is still there:
     ```
     http://localhost:3000/api/auth/callback/azure-ad
     ```

6. **Save:**
   - Click **Save** at the top
   - Wait for confirmation

### Step 3: Verify Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Settings → **Environment Variables**

2. **Check `NEXTAUTH_URL`:**
   - Should be your production URL: `https://your-production-url.vercel.app`
   - **NO trailing slash!**
   - If wrong, click Edit and update

3. **Check `NEXT_PUBLIC_APP_URL`:**
   - Should match `NEXTAUTH_URL`
   - Update if different

### Step 4: Redeploy (If Needed)

If you updated environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment
3. Or push to GitHub (auto-deploys)

## 🎯 Example

If your production URL is: `https://floor-interior-service-abc123.vercel.app`

**Add to Azure AD:**
```
https://floor-interior-service-abc123.vercel.app/api/auth/callback/azure-ad
```

**Vercel Environment Variables:**
```
NEXTAUTH_URL=https://floor-interior-service-abc123.vercel.app
NEXT_PUBLIC_APP_URL=https://floor-interior-service-abc123.vercel.app
```

## ⚠️ Important Notes

1. **Vercel URLs Change:**
   - Each deployment gets a new URL (if using default Vercel domain)
   - You'll need to update Azure AD redirect URI each time
   - **Solution:** Use a custom domain (see below)

2. **Custom Domain (Recommended):**
   - Set up a custom domain in Vercel (e.g., `dashboard.yourdomain.com`)
   - Add that to Azure AD redirect URI
   - URL never changes, no need to update

3. **Multiple Environments:**
   - Production: `https://your-app.vercel.app/api/auth/callback/azure-ad`
   - Preview: `https://your-app-*.vercel.app/api/auth/callback/azure-ad` (if needed)
   - Local: `http://localhost:3000/api/auth/callback/azure-ad`

## ✅ After Fixing

1. Try signing in again
2. Should redirect properly
3. Check Vercel logs if still having issues

## 🔍 Troubleshooting

If still not working:

1. **Check Azure AD Logs:**
   - Azure Portal → Your App → **Sign-in logs**
   - Look for errors

2. **Check Vercel Logs:**
   - Vercel Dashboard → Your Project → **Logs**
   - Look for authentication errors

3. **Verify Exact Match:**
   - Redirect URI in Azure AD must match **exactly**
   - No extra spaces, no trailing slashes
   - Case-sensitive

4. **Wait for Propagation:**
   - Azure AD changes can take 1-2 minutes to propagate
   - Try again after waiting

