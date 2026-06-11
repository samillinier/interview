# 🔧 Fix Localhost Redirect URI - Quick Guide

## The Error
```
Authentication callback failed. This usually means the redirect URI in Azure AD doesn't match.
```

## ✅ Quick Fix (5 Minutes)

### Step 1: Azure Portal
1. Go to: **https://portal.azure.com**
2. Sign in

### Step 2: Find Your App
1. **Azure Active Directory** → **App registrations**
2. Search: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
3. Click on your app

### Step 3: Add/Check Redirect URI
1. Click **"Authentication"** (left menu)
2. Scroll to **"Redirect URIs"**
3. **If URI exists but unchecked:**
   - ✅ **Check the checkbox** next to `http://localhost:3000/api/auth/callback/azure-ad`
4. **If URI doesn't exist:**
   - Click **"Add URI"**
   - Paste: `http://localhost:3000/api/auth/callback/azure-ad`
   - ✅ **Make sure checkbox is checked**

### Step 4: Save
1. Click **"Save"** at top
2. Wait for success message

### Step 5: Test
1. **Wait 1-2 minutes** (Azure AD needs time to update)
2. **Restart dev server:**
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```
3. **Clear browser cookies** (optional):
   - DevTools (F12) → Application → Cookies → Delete for localhost:3000
4. **Try signing in:** http://localhost:3000/login

## ⚠️ Critical: Exact Format Required

**✅ CORRECT:**
```
http://localhost:3000/api/auth/callback/azure-ad
```

**❌ WRONG (will NOT work):**
- `http://localhost:3000/api/auth/callback/azure-ad/` ← trailing slash
- `https://localhost:3000/api/auth/callback/azure-ad` ← https
- `http://127.0.0.1:3000/api/auth/callback/azure-ad` ← use localhost
- `http://localhost:3001/api/auth/callback/azure-ad` ← wrong port

## 🎯 Your Current Config
- **Client ID:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- **Required Redirect URI:** `http://localhost:3000/api/auth/callback/azure-ad`
- **NEXTAUTH_URL:** `http://localhost:3000` ✅

## Still Not Working?

1. **Verify checkbox is checked** (not just in the list)
2. **Wait longer** (up to 5 minutes for Azure AD propagation)
3. **Check server logs** for NextAuth debug messages
4. **Verify NEXTAUTH_URL** in `.env.local` is exactly `http://localhost:3000`
