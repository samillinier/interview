# Fix 404 Error for job.floorinteriorservices.com/property

## ✅ Good News
- Domain `job.floorinteriorservices.com` is configured in Vercel ✅
- Route `/property` exists and builds correctly ✅
- Latest deployment completed successfully ✅

## 🔍 The Issue
Getting 404 when accessing `https://job.floorinteriorservices.com/property`

## 🛠️ Solution Steps

### Step 1: Verify Environment Variables

The `NEXTAUTH_URL` must match your custom domain:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select project: **floor-interior-service**
   - Go to **Settings** → **Environment Variables**

2. **Check `NEXTAUTH_URL`:**
   - **Production** value should be: `https://job.floorinteriorservices.com`
   - If it's different (like `https://floor-interior-service-six.vercel.app`), update it:
     - Click **Edit**
     - Set to: `https://job.floorinteriorservices.com`
     - Make sure **Production** is selected ✅
     - Click **Save**

3. **Check `NEXT_PUBLIC_APP_URL`:**
   - **Production** value should be: `https://job.floorinteriorservices.com`
   - Update if different

### Step 2: Redeploy After Environment Variable Changes

After updating environment variables, you MUST redeploy:

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click **⋯** (three dots) on latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

**Option B: Via CLI**
```bash
vercel --prod --yes --scope samilliniers-projects
```

### Step 3: Clear Browser Cache

1. **Hard refresh:** `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. **Or clear cache:**
   - Open DevTools (F12)
   - Right-click refresh button
   - Select "Empty Cache and Hard Reload"

### Step 4: Verify DNS Propagation

1. Visit: https://dnschecker.org
2. Enter: `job.floorinteriorservices.com`
3. Select: `CNAME` record type
4. Click **Search**
5. Verify it points to Vercel (should show `*.vercel-dns.com` or similar)

### Step 5: Test Direct Vercel URL

Try accessing the route on the Vercel URL directly:
- `https://floor-interior-service-six.vercel.app/property`

If this works but the custom domain doesn't, it's a DNS/environment variable issue.

## 🔧 Quick Fix Checklist

- [ ] `NEXTAUTH_URL` = `https://job.floorinteriorservices.com` (Production)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://job.floorinteriorservices.com` (Production)
- [ ] Redeployed after updating environment variables
- [ ] Cleared browser cache
- [ ] Verified DNS propagation
- [ ] Tested direct Vercel URL

## 🎯 Expected Result

After completing these steps:
- `https://job.floorinteriorservices.com/property` should show the Property Portal login page
- No more 404 errors

## ⚠️ Common Mistakes

1. **Forgot to redeploy** after updating environment variables
2. **Wrong environment** - Updated Preview/Development instead of Production
3. **Browser cache** - Old cached version showing 404
4. **DNS not propagated** - Wait 15-60 minutes after DNS changes
