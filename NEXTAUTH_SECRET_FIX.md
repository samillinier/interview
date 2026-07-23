# Fix Missing NEXTAUTH_SECRET

## 🔴 The Problem

The `OAuthSignin` error is most likely caused by **missing `NEXTAUTH_SECRET`** in Vercel.

NextAuth.js requires a `NEXTAUTH_SECRET` environment variable to encrypt session tokens and handle OAuth callbacks securely. Without it, OAuth sign-in will fail with `OAuthSignin` error.

## ✅ What We've Verified

- ✅ Redirect URI is correct in Azure AD
- ✅ API permissions are correct (User.Read includes openid, profile, email)
- ✅ Client ID and Secret are configured
- ❓ **NEXTAUTH_SECRET: Need to check**

## 🔧 How to Fix

### Step 1: Generate NEXTAUTH_SECRET

Run this command in your terminal:

```bash
openssl rand -base64 32
```

This will generate a random 32-character base64 string. **Copy this value** - you'll need it in Step 2.

**Example output:**
```
Xk8pL9mN2qR5tW7vY0zA3bC6dE9fG1hI4jK7lM0nO2pQ5rS8tU1vW4xY7zA=
```

### Step 2: Add to Vercel

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Navigate to Environment Variables:**
   - Go to: **Settings** → **Environment Variables**

3. **Add NEXTAUTH_SECRET:**
   - Click **"Add New"**
   - **Key:** `NEXTAUTH_SECRET`
   - **Value:** Paste the value from Step 1
   - **Environment:** Select **Production** (and Preview/Development if needed)
   - Click **Save**

### Step 3: Redeploy

After adding the environment variable:

1. **Option A: Automatic Redeploy**
   - Vercel will automatically redeploy when you add environment variables
   - Wait for the deployment to complete

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click the **"..."** menu on the latest deployment
   - Select **"Redeploy"**

### Step 4: Test Sign-In

1. Visit: `https://floor-interior-service.vercel.app/auth/signin`
2. Click **"Sign in with Microsoft"**
3. It should now work! ✅

## 🔍 Verify It's Set

After adding `NEXTAUTH_SECRET`, check the debug endpoint:

Visit: `https://floor-interior-service.vercel.app/api/debug-auth`

Look for:
```json
{
  "hasNextAuthSecret": true,  // Should be true now!
  ...
}
```

## 📝 Important Notes

- **Never commit `NEXTAUTH_SECRET` to Git** - it's a secret!
- **Use different secrets for different environments** (Production, Preview, Development)
- **If you regenerate the secret**, all existing sessions will be invalidated (users will need to sign in again)

## 🎯 Why This Fixes It

NextAuth.js uses `NEXTAUTH_SECRET` to:
- Encrypt session tokens
- Sign OAuth callback requests
- Verify the integrity of authentication flows

Without it, NextAuth cannot securely handle the OAuth callback from Azure AD, resulting in the `OAuthSignin` error.

## ✅ Summary

1. Generate secret: `openssl rand -base64 32`
2. Add to Vercel: Settings → Environment Variables → Add `NEXTAUTH_SECRET`
3. Redeploy (automatic or manual)
4. Test sign-in
5. Verify: Check `/api/debug-auth` for `hasNextAuthSecret: true`

This should fix your sign-in issue! 🎉

