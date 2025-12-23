# Azure AD Client ID Configuration - Local vs Production

## ⚠️ Different Client IDs Are Being Used

### Local Development
**Client ID:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- Configured in: `.env.local`
- Used for: Local development at `http://localhost:3000`
- Redirect URI needed: `http://localhost:3000/api/auth/callback/azure-ad`

### Production (Vercel)
**Client ID:** `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- Configured in: Vercel Environment Variables
- Used for: Production at `https://floor-interior-service.vercel.app`
- Redirect URI needed: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## Why This Happens

You have **two different Azure AD app registrations**:
1. One for local development (`1e9c9b96-10e8-43b2-a75c-8995c45d7c26`)
2. One for production (`dd3245ef-30b6-4929-8373-dc5bbcd06268`)

This is actually **fine** - you can use different apps for different environments.

## What This Means

### For Local Development:
- Use app: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- Make sure this app has redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`

### For Production:
- Use app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- Make sure this app has redirect URI: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## Current Status

✅ **Local:** Using `1e9c9b96-10e8-43b2-a75c-8995c45d7c26` (configured in `.env.local`)
✅ **Production:** Using `dd3245ef-30b6-4929-8373-dc5bbcd06268` (configured in Vercel)

## Recommendation

You can either:

### Option 1: Keep Separate Apps (Current Setup)
- ✅ Good for testing different configurations
- ✅ Can have different permissions/scopes
- ⚠️ Need to manage two apps

### Option 2: Use Same App for Both
- ✅ Simpler - one app to manage
- ✅ Same configuration everywhere
- Need to add both redirect URIs to the same app:
  - `http://localhost:3000/api/auth/callback/azure-ad`
  - `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

## To Verify

**Check Vercel Environment Variables:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Check `AZURE_AD_CLIENT_ID` for Production
3. Should be: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

**Check Local Environment:**
1. Check `.env.local` file
2. `AZURE_AD_CLIENT_ID` should be: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`

