# ✅ Add Main Domain Redirect URI to Azure AD

## Current Error

The error message now shows the **correct** production URL that needs to be added:

```
https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
```

## 🎯 Exact URL to Add

```
https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
```

## 📋 Step-by-Step Instructions

### Step 1: Go to Azure Portal
1. Visit: **https://portal.azure.com**
2. Sign in with your admin account

### Step 2: Find the App
1. Click **Azure Active Directory** (left sidebar)
2. Click **App registrations**
3. Search for: **`dd3245ef-30b6-4929-8373-dc5bbcd06268`**
4. Click on the app

### Step 3: Add Redirect URI
1. Click **Authentication** (left menu)
2. Scroll to **Redirect URIs** section
3. Click **Add URI** or **Add a platform** → **Web**
4. Paste **EXACTLY** this:
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```
5. **Verify:**
   - ✅ Starts with `https://`
   - ✅ No trailing slash
   - ✅ Exact domain: `floor-interior-service.vercel.app`
   - ✅ Exact path: `/api/auth/callback/azure-ad`

### Step 4: Keep Other URIs
Make sure you have these in your list:
- ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (main domain)
- ✅ `https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad` (if you added it before)
- ✅ `http://localhost:3000/api/auth/callback/azure-ad` (for local development)

### Step 5: Save
1. Click **Save** at the top
2. Wait for success message

### Step 6: Wait and Test
1. Wait 2-3 minutes for propagation
2. Try signing in again

## ✅ Why This URL?

This is your **main Vercel domain** (`floor-interior-service.vercel.app`), which is more stable than the deployment-specific URLs (like `floor-interior-service-ntrl6mdel.vercel.app`).

## 🎯 Quick Checklist

- [ ] Found app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- [ ] Added: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- [ ] Verified no trailing slash
- [ ] Clicked Save
- [ ] Waited 2-3 minutes
- [ ] Tested sign-in

## 📝 Note

You might want to keep both:
- `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (main domain - recommended)
- `https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad` (specific deployment - if still in use)

But the main domain (`floor-interior-service.vercel.app`) is the one that should work for all deployments.

