# Fix OAuthCallback Error

## Current Issue
- ✅ OAuthSignin is fixed (authentication works)
- ❌ OAuthCallback error (callback processing fails)

## What OAuthCallback Error Means
The user successfully authenticated with Microsoft, but NextAuth failed to process the callback and create a session.

## Common Causes

### 1. Callback URL Mismatch (Most Common)
Even though authentication works, the callback URL must match EXACTLY:
- Azure AD redirect URI: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- NextAuth expects: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
- Must match EXACTLY (no trailing slash, exact case, exact domain)

### 2. NEXTAUTH_URL Mismatch
- Vercel `NEXTAUTH_URL` must be: `https://floor-interior-service.vercel.app`
- No trailing slash
- Must match the actual production URL

### 3. Cookie/Session Domain Issues
NextAuth uses cookies for sessions. If the domain doesn't match, cookies won't work.

### 4. HTTPS vs HTTP
Make sure everything uses `https://` (not `http://`)

## How to Fix

### Step 1: Verify Redirect URI in Azure AD (Again)
1. Azure Portal → App "FIS" → Authentication
2. Check redirect URI is EXACTLY:
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```
3. Delete and re-add if needed
4. Make sure NO other redirect URIs are conflicting

### Step 2: Verify NEXTAUTH_URL in Vercel
1. Vercel → Settings → Environment Variables
2. `NEXTAUTH_URL` must be EXACTLY:
   ```
   https://floor-interior-service.vercel.app
   ```
   - NO trailing slash
   - Exact match

### Step 3: Check Vercel Logs
1. Vercel Dashboard → Your Project → Logs
2. Try signing in
3. Look for specific error messages
4. Share the error details

### Step 4: Try Adding Explicit Callback URL
Sometimes NextAuth needs the callback URL to be explicitly configured.

## Alternative: Check if It's a Session Issue

The OAuthCallback error might also be caused by:
- Session callback failing
- JWT callback failing
- Database/session store issues

Check Vercel logs for the exact error to see what's failing.

