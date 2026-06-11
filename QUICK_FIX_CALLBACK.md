# Quick Fix: Authentication Callback Failed

## The Problem
You're getting: "Authentication callback failed. This usually means the redirect URI in Azure AD doesn't match."

## Quick Solution (3 Steps)

### Step 1: Go to Azure Portal
1. Visit: https://portal.azure.com
2. Sign in

### Step 2: Add Redirect URI
1. Go to: **Azure Active Directory** → **App registrations**
2. Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
3. Click on your app
4. Click **"Authentication"** (left menu)
5. Under **"Redirect URIs"**, click **"Add URI"**
6. Paste this EXACT URL:
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
7. Click **"Save"**

### Step 3: Test
1. Wait 1 minute
2. Restart your dev server: `npm run dev`
3. Try signing in again: http://localhost:3000/login

## ✅ That's It!

If it still doesn't work, check:
- The redirect URI has NO trailing slash
- You're using `http://` (not `https://`) for localhost
- Port is `3000` (not 3001, etc.)
- Server was restarted after adding the URI

## Need More Help?

See `AZURE_AD_REDIRECT_URI_SETUP.md` for detailed instructions with screenshots guidance.

