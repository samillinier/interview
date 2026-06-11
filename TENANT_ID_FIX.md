# Fix Tenant ID with Newline Issue

## 🔴 The Problem

Your `AZURE_AD_TENANT_ID` in Vercel has a **trailing newline character** (`\n`), which can cause OAuth sign-in to fail.

From the debug output:
```json
"tenantIdRaw": "\"51905564-c059-411b-bdc8-17a6f4668fb9\\n\""
```

Even though the code uses `.trim()`, it's better to fix the environment variable itself.

## ✅ What We've Verified

- ✅ Redirect URI is correct in Azure AD
- ✅ API permissions are correct
- ✅ Client ID and Secret are configured
- ✅ NEXTAUTH_SECRET is present
- ❌ **Tenant ID has a newline** - This is likely the issue!

## 🔧 How to Fix

### Step 1: Get the Correct Tenant ID from Azure AD

1. **Go to Azure Portal:**
   - Visit https://portal.azure.com
   - Sign in with admin account

2. **Navigate to App Registration:**
   - Azure Active Directory → **App registrations**
   - Find your app "FIS" (Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`)

3. **Copy the Tenant ID:**
   - Click on your app
   - Go to **Overview** (left sidebar)
   - Find **"Directory (tenant) ID"**
   - **Copy the value** (should be: `51905564-c059-411b-bdc8-17a6f4668fb9`)
   - **Make sure there are NO spaces or newlines when copying!**

### Step 2: Update in Vercel

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Navigate to Environment Variables:**
   - Go to: **Settings** → **Environment Variables**

3. **Find `AZURE_AD_TENANT_ID`:**
   - Look for the variable `AZURE_AD_TENANT_ID`
   - Click on it to edit

4. **Update the Value:**
   - **Delete the entire current value**
   - **Paste the tenant ID** from Step 1
   - **Make sure:**
     - No spaces before or after
     - No newlines
     - Just the UUID: `51905564-c059-411b-bdc8-17a6f4668fb9`
   - Click **Save**

5. **Verify for All Environments:**
   - Make sure it's set for **Production** (most important)
   - Also check **Preview** and **Development** if you use them

### Step 3: Redeploy

After updating the environment variable:

1. **Vercel will automatically redeploy** when you save environment variables
2. Wait for the deployment to complete (about 1-2 minutes)

### Step 4: Verify the Fix

After deployment, check the debug endpoint:

Visit: `https://floor-interior-service.vercel.app/api/debug-auth`

Look for:
```json
{
  "tenantId": "51905564-c059-411b-bdc8-17a6f4668fb9",  // No newline!
  "tenantIdRaw": "\"51905564-c059-411b-bdc8-17a6f4668fb9\"",  // No \\n!
  "tenantIdHasNewline": false,  // Should be false now!
  ...
}
```

### Step 5: Test Sign-In

1. Visit: `https://floor-interior-service.vercel.app/auth/signin`
2. Click **"Sign in with Microsoft"**
3. It should now work! ✅

## 🔍 Alternative: Use "common" Instead

If you want to allow sign-in from any Azure AD tenant, you can set:

```
AZURE_AD_TENANT_ID=common
```

This is useful if you want to allow sign-in from any Microsoft account, not just your organization.

**However**, if you want to restrict to your organization only, use the specific tenant ID (without the newline).

## 📝 Important Notes

- **The tenant ID should be exactly 36 characters** (UUID format)
- **No spaces, no newlines, no quotes**
- **Just the UUID:** `51905564-c059-411b-bdc8-17a6f4668fb9`

## 🎯 Why This Fixes It

The trailing newline in the tenant ID can cause:
- OAuth callback URL mismatches
- Token validation failures
- Authentication flow errors

By removing the newline, the tenant ID will be correctly used in all OAuth requests.

## ✅ Summary

1. Get tenant ID from Azure AD (Overview → Directory (tenant) ID)
2. Update in Vercel: Settings → Environment Variables → `AZURE_AD_TENANT_ID`
3. Remove any newlines/spaces (just the UUID)
4. Save and wait for auto-redeploy
5. Verify: Check `/api/debug-auth` for `tenantIdHasNewline: false`
6. Test sign-in

This should fix your sign-in issue! 🎉

