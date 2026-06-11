# 🔍 Troubleshoot Redirect URI Error

## Current Configuration
- **Client ID:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- **NEXTAUTH_URL:** `http://localhost:3000`
- **Expected Callback:** `http://localhost:3000/api/auth/callback/azure-ad`

## Why You're Still Getting the Error

Even though the redirect URI exists in Azure AD, you're getting the error because:

### Most Likely Cause: The Checkbox is NOT Checked

The redirect URI must be **checked/enabled** in Azure AD. Just having it in the list isn't enough.

## Step-by-Step Fix

### Step 1: Verify in Azure Portal

1. **Go to Azure Portal:** https://portal.azure.com
2. **Find your app:**
   - Azure Active Directory → App registrations
   - Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Click on "FIS Recruitment"
3. **Go to Authentication:**
   - Click "Authentication" (left menu)
   - Go to "Redirect URI configuration" tab
4. **Check the checkbox:**
   - Find: `http://localhost:3000/api/auth/callback/azure-ad`
   - **The checkbox MUST be checked** ✅
   - If it's unchecked, click it to check it
5. **Save:**
   - Click "Save" at the top
   - Wait for success message

### Step 2: Verify Exact Format

The redirect URI must be **EXACTLY**:
```
http://localhost:3000/api/auth/callback/azure-ad
```

**Check for:**
- ✅ Starts with `http://` (not `https://`)
- ✅ No trailing slash
- ✅ All lowercase
- ✅ Exact path: `/api/auth/callback/azure-ad`
- ✅ Port is `3000`

### Step 3: Wait for Propagation

After saving in Azure AD:
- **Wait 2-3 minutes** for changes to propagate
- Azure AD changes don't take effect immediately

### Step 4: Restart Your Dev Server

After making changes:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Clear Browser Data

1. Open DevTools (F12)
2. Go to Application tab
3. Clear Storage → Clear site data
4. Or manually delete cookies for `localhost:3000`

### Step 6: Test Again

1. Go to: http://localhost:3000/login
2. Click "Continue with Microsoft"
3. Sign in
4. Should redirect back successfully

## Common Issues

### Issue 1: Checkbox Not Saved
- Make sure you click "Save" after checking the checkbox
- Look for the success message: "Update application Authentication Successfully updated"

### Issue 2: Wrong App
- Make sure you're editing the app with Client ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- NOT the production app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

### Issue 3: Duplicate URIs
- If you have duplicate localhost URIs, check ONE and delete the other
- Having duplicates can cause confusion

### Issue 4: Timing
- Azure AD changes can take 1-3 minutes to propagate
- Don't test immediately after saving

## Verify It's Working

After following all steps, check your server logs when signing in. You should see:
- `✅ Azure AD configured with Client ID: 1e9c9b96...`
- `🔐 SignIn callback triggered`
- No error messages

## Still Not Working?

If it still doesn't work after all these steps:

1. **Double-check the checkbox is checked** in Azure Portal
2. **Verify the exact URL** matches exactly (no extra spaces, correct case)
3. **Check server logs** for specific error messages
4. **Try deleting and re-adding** the redirect URI in Azure AD
5. **Verify NEXTAUTH_URL** in `.env.local` is exactly `http://localhost:3000` (no trailing slash)
