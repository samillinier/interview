# Azure AD Redirect URI Fix - No Wildcards Allowed

## The Problem

Azure AD **does NOT support wildcard patterns** in redirect URIs. You cannot use:
- ❌ `https://floor-interior-service-*.vercel.app/api/auth/callback/azure-ad`

Azure AD requires **exact URL matches**.

## Solution Options

### Option 1: Use Custom Domain (BEST - Recommended)

This is the **best long-term solution** because the URL never changes:

1. **Set up Custom Domain in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add a custom domain (e.g., `dashboard.fiscorponline.com` or `recruiting.fiscorponline.com`)
   - Follow Vercel's DNS setup instructions
   - Wait for DNS propagation (usually 5-30 minutes)

2. **Update Azure AD Redirect URI:**
   - Go to Azure Portal → App registrations → Your app → Authentication
   - Remove the wildcard URL (the one with the error)
   - Add: `https://your-custom-domain.com/api/auth/callback/azure-ad`
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local dev)
   - Click **Save**

3. **Update Vercel Environment Variables:**
   - Update `NEXTAUTH_URL` to: `https://your-custom-domain.com`
   - Update `NEXT_PUBLIC_APP_URL` to: `https://your-custom-domain.com`
   - Save

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Add Current Production URL (Temporary Fix)

If you can't set up a custom domain right now:

1. **Get Current Production URL:**
   ```bash
   vercel ls | grep Production | head -1
   ```
   Current URL: `https://floor-interior-service-pxo02ug5w.vercel.app`

2. **Update Azure AD Redirect URI:**
   - Go to Azure Portal → App registrations → Your app → Authentication
   - Remove the wildcard URL (the one with the error)
   - Add: `https://floor-interior-service-pxo02ug5w.vercel.app/api/auth/callback/azure-ad`
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local dev)
   - Click **Save**

3. **Update Vercel Environment Variables:**
   - Update `NEXTAUTH_URL` (Production) to: `https://floor-interior-service-pxo02ug5w.vercel.app`
   - Update `NEXT_PUBLIC_APP_URL` (Production) to: `https://floor-interior-service-pxo02ug5w.vercel.app`
   - Save

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

**⚠️ Note:** You'll need to update Azure AD redirect URI every time Vercel generates a new production URL. This is why Option 1 (custom domain) is recommended.

### Option 3: Add Multiple Specific URLs

You can add multiple redirect URIs in Azure AD:

1. Add your current production URL
2. Add previous production URLs (if you know them)
3. Add localhost for development

But this becomes hard to manage as URLs change.

## Recommended: Custom Domain

**Why custom domain is best:**
- ✅ URL never changes
- ✅ Professional appearance
- ✅ No need to update Azure AD after each deployment
- ✅ Better for production use
- ✅ Easier to remember and share

## Quick Fix Steps (Right Now)

1. **Remove the wildcard URL** from Azure AD (the one showing the error)
2. **Add the current production URL:**
   - `https://floor-interior-service-pxo02ug5w.vercel.app/api/auth/callback/azure-ad`
3. **Update NEXTAUTH_URL in Vercel** to match
4. **Redeploy**
5. **Test sign-in**

Then plan to set up a custom domain for a permanent solution.

