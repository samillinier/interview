# 🚨 Add Production Redirect URI to Azure AD - URGENT

## ✅ Exact URL to Add

Based on the error message, you need to add this **EXACT** URL to Azure AD:

```
https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
```

## 📋 Step-by-Step Instructions

### Step 1: Go to Azure Portal

1. Visit: **https://portal.azure.com**
2. Sign in with your admin account

### Step 2: Find the Correct App Registration

**IMPORTANT:** The error shows Application ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

1. In Azure Portal, click **Azure Active Directory** (left sidebar)
2. Click **App registrations** (under "Manage")
3. **Search for:** `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. Click on the app that matches this ID

### Step 3: Add the Redirect URI

1. In the left menu of your app, click **Authentication**
2. Scroll down to **Redirect URIs** section
3. Click **Add URI** or **Add a platform** → **Web**
4. In the text field, paste this **EXACT** URL:
   ```
   https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad
   ```
5. **Double-check:**
   - ✅ Starts with `https://`
   - ✅ No trailing slash
   - ✅ Exact path: `/api/auth/callback/azure-ad`
   - ✅ Matches exactly: `floor-interior-service-ntrl6mdel.vercel.app`

### Step 4: Keep Local Development URI

Make sure this is still in the list (for local development):
```
http://localhost:3000/api/auth/callback/azure-ad
```

### Step 5: Save

1. Click **Save** at the top of the page
2. Wait for the confirmation message (usually 5-10 seconds)

### Step 6: Wait and Test

1. **Wait 1-2 minutes** for Azure AD to propagate the changes
2. Go back to your production app
3. Try signing in again
4. It should work now! ✅

## ⚠️ Important Notes

### Application ID Mismatch

The error shows Application ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

But your `.env.local` might have: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`

**Check Vercel Environment Variables:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Check `AZURE_AD_CLIENT_ID`
3. It should be: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. If it's different, update it to match

### Vercel URL Changes

**Note:** Vercel URLs can change with each deployment. If you deploy again, you might get a new URL like:
- `https://floor-interior-service-xyz123.vercel.app`

**Solution:** 
- Option 1: Add the new URL to Azure AD each time (temporary)
- Option 2: Set up a custom domain in Vercel (permanent fix)

## ✅ Quick Checklist

- [ ] Found app with ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- [ ] Added redirect URI: `https://floor-interior-service-ntrl6mdel.vercel.app/api/auth/callback/azure-ad`
- [ ] Kept localhost URI: `http://localhost:3000/api/auth/callback/azure-ad`
- [ ] Clicked Save
- [ ] Waited 1-2 minutes
- [ ] Verified `AZURE_AD_CLIENT_ID` in Vercel matches: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- [ ] Tested sign-in again

## 🎯 After Adding

Once you've added the redirect URI and waited 1-2 minutes:
1. Go to your production app
2. Try signing in
3. Should work! ✅

If it still doesn't work:
- Check that you added the URL to the **correct app** (ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`)
- Verify the URL matches **exactly** (no typos, no trailing slash)
- Make sure you clicked **Save**
- Wait a bit longer (up to 5 minutes for propagation)

