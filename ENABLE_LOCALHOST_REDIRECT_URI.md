# ✅ Enable Localhost Redirect URI in Azure AD

## Current Status (From Your Screenshot)

**App Name:** FIS Recruitment  
**Client ID:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`

**Redirect URIs:**
- ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (CHECKED - Active)
- ❌ `http://localhost:3000/api/auth/callback/azure-ad` (UNCHECKED - Inactive)
- ❌ `http://localhost:3000/api/auth/callback/azure-ad` (UNCHECKED - Duplicate)

## 🔧 Solution: Check the Localhost URI

### Step 1: Check the Localhost Redirect URI
1. In the **Redirect URI configuration** tab (where you are now)
2. Find the row with: `http://localhost:3000/api/auth/callback/azure-ad`
3. **Check the checkbox** next to it (click the checkbox to select it)
4. You can check one of them (they're duplicates, so pick either one)

### Step 2: Remove the Duplicate (Optional but Recommended)
Since you have two identical localhost URIs, you should:
1. **Check one** of the localhost URIs (enable it)
2. **Delete the other duplicate** by:
   - Clicking the checkbox next to the duplicate
   - Clicking the **"Delete"** button
   - This keeps your list clean

### Step 3: Save
1. After checking the localhost URI (and optionally removing the duplicate)
2. Click **"Save"** at the top of the page
3. Wait for the success message: "Update application Authentication Successfully updated FIS Recruitment"

### Step 4: Verify
After saving, you should see:
- ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (CHECKED)
- ✅ `http://localhost:3000/api/auth/callback/azure-ad` (CHECKED)

## 🎯 What This Fixes

Once the localhost redirect URI is checked and saved:
- ✅ Local development sign-in will work
- ✅ The "Authentication callback failed" error will be resolved
- ✅ You can sign in at `http://localhost:3000/login`

## ⚠️ Important Notes

1. **Both URIs can be checked** - You can have both production and localhost active at the same time
2. **Wait 1-2 minutes** after saving for Azure AD to propagate the changes
3. **Clear browser cookies** (optional) before testing again
4. **Restart your dev server** if it's running

## ✅ After Enabling

1. Wait 1-2 minutes
2. Go to: http://localhost:3000/login
3. Try signing in again
4. It should work now! 🎉
