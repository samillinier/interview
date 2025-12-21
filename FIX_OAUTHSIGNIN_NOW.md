# Fix OAuthSignin Error - Step by Step

## 🔴 Current Error
**OAuthSignin** - This means the redirect to Microsoft is failing before authentication starts.

## ✅ What We Know
- Expected callback URL: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- Email restriction is disabled

## 🔧 The Fix: Verify Redirect URI in Azure AD

### Step 1: Go to Azure Portal
1. Visit: https://portal.azure.com
2. Sign in with your admin account

### Step 2: Navigate to Your App
1. Click: **Azure Active Directory** (left sidebar)
2. Click: **App registrations**
3. Find and click: **FIS** (Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`)

### Step 3: Check Redirect URIs
1. Click: **Authentication** (left sidebar)
2. Scroll to: **Redirect URIs** section
3. Look for: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

### Step 4: If It's Missing or Different
1. Click **"Edit"** button (or "Add a platform" → "Web" if empty)
2. **Delete** any incorrect URLs
3. **Add** this EXACT URL:
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```
4. **Make sure:**
   - Starts with `https://` (NOT `http://`)
   - No trailing slash at the end
   - Exact case (all lowercase)
   - Ends with `/api/auth/callback/azure-ad`
5. Click **"Save"** or **"Configure"**

### Step 5: Also Keep Local Dev URL (Optional)
If you want to test locally, also add:
```
http://localhost:3000/api/auth/callback/azure-ad
```

### Step 6: Verify in Vercel
1. Go to: https://vercel.com/dashboard
2. Select: `floor-interior-service`
3. Go to: **Settings** → **Environment Variables**
4. Check: `NEXTAUTH_URL` should be:
   ```
   https://floor-interior-service.vercel.app
   ```
   - NO trailing slash!
   - Exact match to your production URL

### Step 7: Test Again
1. Wait 1-2 minutes after saving in Azure AD (takes time to propagate)
2. Try signing in again
3. It should work! ✅

## 🎯 Common Mistakes to Avoid

❌ **WRONG:**
- `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad/` (trailing slash)
- `http://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (http instead of https)
- Different domain/URL

✅ **CORRECT:**
- `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (exact)

## 📝 Quick Checklist

- [ ] Azure AD redirect URI: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- [ ] Vercel `NEXTAUTH_URL`: `https://floor-interior-service.vercel.app`
- [ ] No trailing slashes anywhere
- [ ] Using `https://` (not `http://`)
- [ ] Saved changes in Azure AD
- [ ] Waited 1-2 minutes for changes to propagate

## 🚨 Still Not Working?

If it still doesn't work after following these steps:
1. Check Vercel logs for detailed error messages
2. Verify you're using the correct Azure AD tenant
3. Make sure the app is active (not disabled) in Azure AD

