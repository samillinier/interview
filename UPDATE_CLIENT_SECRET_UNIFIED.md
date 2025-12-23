# Update Azure AD Client Secret for Both Local and Production

## ⚠️ Important: Secret ID vs Secret Value

**Secret ID:** `de667428-0ccd-4d46-a6e8-4d438bc5106e` (this is just an identifier)
**Secret Value:** The actual secret string (starts with `rXh8Q~...` or similar)

You need the **Secret Value**, not the Secret ID!

## Step 1: Get the Secret Value from Azure Portal

1. **Go to Azure Portal:**
   - Visit: https://portal.azure.com
   - Sign in with your admin account

2. **Find the App:**
   - Navigate to: **Azure Active Directory** → **App registrations**
   - Search for: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
   - Click on the app

3. **Go to Certificates & Secrets:**
   - Click **Certificates & secrets** (left menu)
   - Find the secret with ID: `de667428-0ccd-4d46-a6e8-4d438bc5106e`
   - **Look at the "Value" column** (not the Secret ID column)
   - **Click the copy icon** next to the Value to copy the full secret
   - ⚠️ **If you can't see the value** (shows "Hidden"), you'll need to create a new secret

4. **If the value is hidden:**
   - Click **New client secret**
   - Description: "Unified Secret" (or any name)
   - Expires: Choose expiration (24 months recommended)
   - Click **Add**
   - **Copy the Value immediately** (shown only once!)

## Step 2: Update Local Environment (.env.local)

1. **Open `.env.local` file**
2. **Find `AZURE_AD_CLIENT_SECRET`**
3. **Update it to the secret value:**
   ```bash
   AZURE_AD_CLIENT_SECRET=your-secret-value-from-azure-portal
   ```
   (Replace with your actual secret value from Azure Portal - 40+ characters)

4. **Save the file**

5. **Restart your dev server:**
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Step 3: Update Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Update `AZURE_AD_CLIENT_SECRET`:**
   - Go to: **Settings** → **Environment Variables**
   - Find `AZURE_AD_CLIENT_SECRET`
   - Click on it to edit
   - **Update the value** to the same secret value you used in `.env.local`
   - Make sure it's set for **Production** (and Preview/Development if needed)
   - Click **Save**

3. **Verify:**
   - The value should match what's in `.env.local`
   - It should be set for all environments you use

## Step 4: Redeploy

After updating Vercel environment variables:

1. **Go to Vercel Dashboard:**
   - **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push to GitHub (auto-deploys)

2. **Wait for deployment to complete**

## Step 5: Test

1. **Test Local:**
   - Visit: http://localhost:3000/login
   - Try signing in
   - Should work ✅

2. **Test Production:**
   - Visit: https://floor-interior-service.vercel.app/login
   - Try signing in
   - Should work ✅

## Summary

After completing these steps:
- ✅ Both local and production will use the same client secret
- ✅ Secret ID: `de667428-0ccd-4d46-a6e8-4d438bc5106e`
- ✅ Secret Value: (the value you copied from Azure Portal)
- ✅ Updated in both `.env.local` and Vercel

## Checklist

- [ ] Got the Secret Value from Azure Portal (for Secret ID: `de667428-0ccd-4d46-a6e8-4d438bc5106e`)
- [ ] Updated `AZURE_AD_CLIENT_SECRET` in `.env.local`
- [ ] Restarted local dev server
- [ ] Updated `AZURE_AD_CLIENT_SECRET` in Vercel (Production)
- [ ] Verified it matches the local value
- [ ] Redeployed on Vercel
- [ ] Tested local sign-in
- [ ] Tested production sign-in

## Current Status

**Local (.env.local):**
- Should have the secret value (40+ characters)
- This should match the value for Secret ID: `de667428-0ccd-4d46-a6e8-4d438bc5106e`

**Production (Vercel):**
- Needs to be updated to match the local value

