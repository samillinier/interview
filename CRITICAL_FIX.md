# Critical Fix: Production URL Changed

## The Problem

**Vercel production URLs change with each deployment!** Your current production URL is:
- **Current:** `https://floor-interior-service-pxo02ug5w.vercel.app` (deployed 5m ago)

But your `NEXTAUTH_URL` in Vercel might be pointing to an old URL, and your Azure AD redirect URI definitely doesn't match.

## Why Sign-In Stops

When the redirect URI in Azure AD doesn't match the actual production URL, Microsoft redirects back to a URL that doesn't exist or isn't configured, causing the sign-in to "stop" or fail silently.

## Solution: Use Wildcard Redirect URI

Instead of using a specific Vercel URL (which changes), use a **wildcard pattern** in Azure AD:

### Step 1: Update Azure AD Redirect URI

1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations
3. Find app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. Go to **Authentication** → **Redirect URIs**
5. **Remove** the old specific URL
6. **Add** this wildcard pattern:
   ```
   https://floor-interior-service-*.vercel.app/api/auth/callback/azure-ad
   ```
7. **Also keep** the local development one:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
8. Click **Save**

### Step 2: Update NEXTAUTH_URL in Vercel

**Option A: Use Current Production URL (Temporary Fix)**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `NEXTAUTH_URL` (Production)
3. Click Edit
4. Update to: `https://floor-interior-service-pxo02ug5w.vercel.app`
5. Save

**Option B: Use Custom Domain (Permanent Fix - Recommended)**
1. Set up a custom domain in Vercel (e.g., `dashboard.yourdomain.com`)
2. Update `NEXTAUTH_URL` to use the custom domain
3. Update Azure AD redirect URI to use the custom domain
4. This way, the URL never changes

### Step 3: Redeploy

After updating:
```bash
git add .
git commit -m "Fix NextAuth configuration"
git push
vercel --prod
```

### Step 4: Check Vercel Logs

After redeploying, check the logs to see what's happening:
```bash
vercel logs --follow
```

Then try signing in and watch for the console logs I added.

## Better Long-Term Solution

**Set up a custom domain** in Vercel so your production URL never changes:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add a custom domain (e.g., `dashboard.fiscorponline.com`)
3. Update `NEXTAUTH_URL` to use the custom domain
4. Update Azure AD redirect URI to use the custom domain
5. This eliminates the URL mismatch problem permanently

## Current Status

- ✅ NextAuth file recreated with logging
- ⚠️ Need to update Azure AD redirect URI (use wildcard)
- ⚠️ Need to update NEXTAUTH_URL in Vercel (match current production URL)
- ⚠️ Consider setting up custom domain for stability
