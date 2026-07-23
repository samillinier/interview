# Fix: Custom Domain Showing 404 for /property Route

## 🔍 Problem Identified

- ✅ Route `/property` works on Vercel URL: `https://floor-interior-service-six.vercel.app/property` (200 OK)
- ❌ Route `/property` returns 404 on custom domain: `https://job.floorinteriorservices.com/property`
- ⚠️ The custom domain is likely pointing to an **older deployment** that doesn't have the `/property` route

## 🛠️ Solution: Reassign Domain to Latest Deployment

### Step 1: Check Current Domain Assignment

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select project: **floor-interior-service**
   - Go to **Settings** → **Domains**

2. **Find `job.floorinteriorservices.com`:**
   - Check which deployment it's pointing to
   - Look for a "Production" badge or deployment link

### Step 2: Reassign Domain to Latest Deployment

**Option A: Via Domain Settings (Recommended)**

1. In **Settings** → **Domains**
2. Find `job.floorinteriorservices.com`
3. Click **⋯** (three dots) next to it
4. Click **Edit** or **Reassign**
5. Select the **latest Production deployment** (should be the most recent one)
6. Click **Save**

**Option B: Via Deployments Tab**

1. Go to **Deployments** tab
2. Find the **latest Production deployment** (should be from ~13 minutes ago)
3. Click **⋯** (three dots) on that deployment
4. Click **Assign Domain** or **Add Domain**
5. Enter: `job.floorinteriorservices.com`
6. Select **Production** environment
7. Click **Add**

### Step 3: Clear Vercel Edge Cache

After reassigning, clear the cache:

1. **Via Vercel Dashboard:**
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Click **⋯** (three dots)
   - Click **Redeploy** (this will clear cache)

2. **Or wait 5-10 minutes** for cache to expire naturally

### Step 4: Verify Domain Assignment

1. Go to **Settings** → **Domains**
2. Verify `job.floorinteriorservices.com` shows:
   - ✅ **Valid Configuration**
   - ✅ Points to latest deployment
   - ✅ **Production** environment

### Step 5: Test Again

After reassigning and waiting 2-3 minutes:

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Test the route:**
   - Visit: `https://job.floorinteriorservices.com/property`
   - Should now show the Property Portal login page ✅

## 🔧 Alternative: Force Cache Invalidation

If reassigning doesn't work immediately, try:

1. **Add a query parameter** to bypass cache:
   - `https://job.floorinteriorservices.com/property?v=1`
   - If this works, it confirms it's a cache issue

2. **Redeploy with a small change:**
   - Make a tiny change to any file
   - Deploy again
   - This forces Vercel to rebuild and clear cache

## ⚠️ Important Notes

- **Domain reassignment** can take 1-5 minutes to propagate
- **Edge cache** can take 5-10 minutes to clear
- **DNS cache** in your browser can persist - use hard refresh
- The route **definitely exists** - it works on the Vercel URL

## ✅ Expected Result

After completing these steps:
- `https://job.floorinteriorservices.com/property` should return **200 OK**
- You should see the Property Portal login page
- No more 404 errors
