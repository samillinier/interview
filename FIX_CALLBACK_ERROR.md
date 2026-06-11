# Fix "Authentication callback failed" Error

## 🔴 The Problem
You're seeing: **"Authentication callback failed. Please try again"**

This is an `OAuthCallback` error, which means the OAuth flow started but the callback failed.

## ✅ Most Common Cause: Redirect URI Mismatch

The redirect URI in Azure AD must match **EXACTLY** with what NextAuth expects.

### Step 1: Check Your Current Setup

1. **Your Client ID**: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
2. **Expected Callback URL**: `http://localhost:3000/api/auth/callback/azure-ad`

### Step 2: Configure Azure AD Redirect URI

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**:
   - Azure Active Directory → App registrations
   - Find your app (Client ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`)
3. **Click "Authentication"** in the left menu
4. **Under "Redirect URIs"**, make sure you have:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
   - **NO trailing slash**
   - **Exact case** (all lowercase)
   - **Exact path** (`/api/auth/callback/azure-ad`)

5. **Click "Save"**

### Step 3: Verify Environment Variables

Make sure your `.env.local` has:
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=zOm6Ol0R53ab1gU0hsRIIk+mRONMWo2Ll7LJgomaG78=
AZURE_AD_CLIENT_ID=1e9c9b96-10e8-43b2-a75c-8995c45d7c26
AZURE_AD_CLIENT_SECRET=a775b2f4-a2f8-41c7-ab1c-3f19bf85bf1c
AZURE_AD_TENANT_ID=common
```

### Step 4: Restart Your Dev Server

After making changes:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 5: Test Again

1. Visit: http://localhost:3000/login
2. Click "Continue with Microsoft"
3. Sign in with your Microsoft account
4. You should be redirected back successfully

## 🔍 Other Possible Causes

### 1. NEXTAUTH_SECRET Missing
- Make sure `NEXTAUTH_SECRET` is set in `.env.local`
- Restart the server after adding it

### 2. Client Secret Expired
- Check if your Azure AD client secret has expired
- Generate a new one in Azure Portal if needed

### 3. Session/Cookie Issues
- Clear your browser cookies
- Try in an incognito/private window

### 4. Port Mismatch
- Make sure you're accessing `http://localhost:3000` (not 3001, 3002, etc.)
- The redirect URI must match the exact port

## 🐛 Debug Steps

1. **Check server logs** when you try to sign in
   - Look for NextAuth error messages
   - Check for any OAuth-related errors

2. **Visit debug endpoint**: http://localhost:3000/api/debug-auth
   - This shows your current configuration
   - Verify all values are correct

3. **Check browser console**
   - Open DevTools (F12)
   - Look for any errors in the Console tab

## ✅ Quick Checklist

- [ ] Redirect URI in Azure AD matches: `http://localhost:3000/api/auth/callback/azure-ad`
- [ ] No trailing slash in redirect URI
- [ ] `.env.local` file exists with all variables
- [ ] Dev server restarted after changes
- [ ] Using the correct port (3000)
- [ ] NEXTAUTH_SECRET is set
- [ ] Client secret is not expired

## 🚀 Still Not Working?

If it still doesn't work after checking everything above:

1. **Check Azure AD logs**:
   - Azure Portal → Your App → Monitoring → Sign-in logs
   - Look for failed authentication attempts

2. **Verify API Permissions**:
   - Azure Portal → Your App → API permissions
   - Should have: Microsoft Graph → User.Read (delegated)

3. **Try with a different Microsoft account** to rule out account-specific issues

