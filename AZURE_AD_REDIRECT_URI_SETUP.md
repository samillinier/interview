# Azure AD Redirect URI Setup - Step by Step

## ✅ Your Current Configuration (Verified)
- **Client ID**: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- **Expected Callback URL**: `http://localhost:3000/api/auth/callback/azure-ad`
- **NEXTAUTH_URL**: `http://localhost:3000` ✅
- **NEXTAUTH_SECRET**: Set ✅

## 🔧 Step-by-Step: Configure Redirect URI in Azure AD

### Step 1: Go to Azure Portal
1. Visit: **https://portal.azure.com**
2. Sign in with your Microsoft account

### Step 2: Find Your App Registration
1. In the left sidebar, click **"Azure Active Directory"**
2. Click **"App registrations"** (under "Manage")
3. In the search box, type: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
4. Click on your app (it should appear in the results)

### Step 3: Navigate to Authentication
1. In the left menu of your app, click **"Authentication"**
2. You should see a section called **"Redirect URIs"**

### Step 4: Add the Redirect URI
1. Scroll down to **"Redirect URIs"** section
2. Click **"Add URI"** or **"Add a platform"** → **"Web"**
3. In the text field, paste this **EXACT** URL:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
4. **IMPORTANT - Check these details:**
   - ✅ Starts with `http://` (not `https://` for localhost)
   - ✅ No trailing slash at the end
   - ✅ All lowercase
   - ✅ Exact path: `/api/auth/callback/azure-ad`
   - ✅ Port is `3000` (not 3001, 8080, etc.)

### Step 5: Save
1. Click **"Save"** at the top of the page
2. Wait for the confirmation message

### Step 6: Verify It's Added
After saving, you should see in the Redirect URIs list:
```
http://localhost:3000/api/auth/callback/azure-ad
```

## 🎯 Common Mistakes to Avoid

### ❌ WRONG:
- `http://localhost:3000/api/auth/callback/azure-ad/` (trailing slash)
- `https://localhost:3000/api/auth/callback/azure-ad` (https for localhost)
- `http://localhost:3001/api/auth/callback/azure-ad` (wrong port)
- `http://localhost:3000/api/auth/callback/azure` (missing `/azure-ad`)
- `http://127.0.0.1:3000/api/auth/callback/azure-ad` (use localhost, not 127.0.0.1)

### ✅ CORRECT:
- `http://localhost:3000/api/auth/callback/azure-ad`

## 🔄 After Adding the Redirect URI

1. **Wait 1-2 minutes** for Azure AD to propagate the changes
2. **Restart your dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```
3. **Clear browser cache/cookies** (optional but recommended):
   - Open DevTools (F12)
   - Go to Application tab → Clear storage → Clear site data
4. **Try signing in again** at: http://localhost:3000/login

## 🐛 Still Not Working?

### Check 1: Verify the Redirect URI is Actually There
1. Go back to Azure Portal → Your App → Authentication
2. Scroll to Redirect URIs
3. Make sure you see: `http://localhost:3000/api/auth/callback/azure-ad`
4. If you see multiple entries, make sure this one is there

### Check 2: Check Server Logs
When you try to sign in, check your terminal where `npm run dev` is running. Look for:
- `✅ Azure AD configured with Client ID: 1e9c9b96...`
- `🔐 SignIn callback triggered`
- Any error messages

### Check 3: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Try signing in
4. Look for any error messages

### Check 4: Verify Environment Variables
Run this to check your config:
```bash
curl http://localhost:3000/api/debug-auth
```

You should see:
- `expectedCallback`: `http://localhost:3000/api/auth/callback/azure-ad`
- `hasNextAuthSecret`: `true`
- `nextAuthUrl`: `http://localhost:3000`

## 📸 Visual Guide

The Redirect URIs section should look like this:

```
┌─────────────────────────────────────────────────────────┐
│ Redirect URIs                                           │
├─────────────────────────────────────────────────────────┤
│ Platform: Web                                            │
│                                                          │
│ Redirect URIs:                                           │
│ ☑ http://localhost:3000/api/auth/callback/azure-ad      │
│                                                          │
│ [Save] [Cancel]                                          │
└─────────────────────────────────────────────────────────┘
```

## ✅ Success Indicators

After configuring correctly, you should:
1. Be redirected to Microsoft login page when clicking "Continue with Microsoft"
2. After signing in, be redirected back to your dashboard
3. See your profile picture/name in the dashboard
4. No error messages

## 🚀 Next Steps

Once local login works, for production you'll need to:
1. Add production redirect URI: `https://your-production-url.vercel.app/api/auth/callback/azure-ad`
2. Update `NEXTAUTH_URL` in Vercel to your production URL
3. Add all environment variables to Vercel

