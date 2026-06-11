# Verify Production URL and Configuration

## Critical Check: What is Your ACTUAL Production URL?

Vercel can assign different URLs. We need to verify the **exact** production URL.

### Step 1: Find Your Actual Production URL

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Check the Production Domain:**
   - Go to: **Settings** → **Domains**
   - Look for the **Production** domain
   - It might be:
     - `floor-interior-service.vercel.app` (main)
     - `floor-interior-service-xxxxx.vercel.app` (preview)
     - A custom domain if configured

3. **Or Check Deployments:**
   - Go to: **Deployments** tab
   - Find the latest **Production** deployment
   - Click on it
   - The URL shown is your production URL

### Step 2: Verify NEXTAUTH_URL Matches

1. **In Vercel:**
   - Settings → Environment Variables
   - Find `NEXTAUTH_URL` (Production)
   - **It MUST match your actual production URL exactly**
   - Example: If your production URL is `https://floor-interior-service.vercel.app`
   - Then `NEXTAUTH_URL` must be: `https://floor-interior-service.vercel.app`
   - **NO trailing slash!**

### Step 3: Verify Azure AD Redirect URI

1. **In Azure Portal:**
   - Your app "FIS" → **Authentication** → **Redirect URIs**
   - **The redirect URI MUST be:**
     ```
     https://YOUR-ACTUAL-PRODUCTION-URL/api/auth/callback/azure-ad
     ```
   - Replace `YOUR-ACTUAL-PRODUCTION-URL` with your actual Vercel production URL
   - Example: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

### Step 4: Check for Multiple Redirect URIs

Azure AD might have multiple redirect URIs. Make sure:
- ✅ The production URL redirect URI is present
- ✅ No conflicting redirect URIs
- ✅ The exact URL matches (case-sensitive, no trailing slash)

### Step 5: Common Issues

**Issue 1: Vercel Preview URLs**
- Vercel creates preview URLs for each deployment
- These are different from production
- Make sure you're using the **production** URL, not a preview URL

**Issue 2: Custom Domain**
- If you have a custom domain, use that instead
- Update both `NEXTAUTH_URL` and Azure AD redirect URI

**Issue 3: Trailing Slash**
- `https://floor-interior-service.vercel.app/` ❌ (has trailing slash)
- `https://floor-interior-service.vercel.app` ✅ (no trailing slash)

### Step 6: Test After Fixing

1. Update `NEXTAUTH_URL` in Vercel (if needed)
2. Update redirect URI in Azure AD (if needed)
3. Wait for Vercel to redeploy (automatic)
4. Try signing in again
5. Check Vercel logs for detailed error messages

## Quick Checklist

- [ ] Found actual production URL in Vercel
- [ ] `NEXTAUTH_URL` in Vercel matches production URL exactly
- [ ] Redirect URI in Azure AD matches: `https://PRODUCTION-URL/api/auth/callback/azure-ad`
- [ ] No trailing slashes anywhere
- [ ] Both use `https://` (not `http://`)
- [ ] Case matches exactly

