# Update Azure AD Client Secret

## ⚠️ Important: Secret ID vs Secret Value

**Secret ID:** `de667428-0ccd-4d46-a6e8-4d438bc5106e` (this is just an identifier)
**Secret Value:** This is the actual secret you need to use (starts with something like `rXh8Q~...`)

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
   - **Click on the "Value" column** to reveal the secret
   - **Copy the full secret value** (it will be a long string, 40+ characters)
   - ⚠️ **You can only see this once!** If you can't see it, you'll need to create a new secret.

## Step 2: Update Local Environment (.env.local)

1. **Open `.env.local` file**
2. **Find `AZURE_AD_CLIENT_SECRET`**
3. **Update it to the secret value:**
   ```bash
   AZURE_AD_CLIENT_SECRET=your-secret-value-from-azure-portal
   ```
   (Replace with your actual secret value)

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
   - **Update the value** to the secret value you copied from Azure Portal
   - Make sure it's set for **Production** (and Preview/Development if needed)
   - Click **Save**

3. **Verify:**
   - The value should be the secret value (not the Secret ID)
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

## ⚠️ If You Can't See the Secret Value

If the secret value is hidden and you can't see it:
1. **Create a new client secret:**
   - In Azure Portal → Your App → **Certificates & secrets**
   - Click **New client secret**
   - Add a description (e.g., "Production Secret")
   - Choose expiration (recommended: 24 months)
   - Click **Add**
   - **Copy the Value immediately** (you won't see it again!)
   - Use this new value in both local and production

2. **Update both environments** with the new secret value

## Summary

- ✅ Use the **Secret Value** (not the Secret ID)
- ✅ Update `.env.local` for local development
- ✅ Update Vercel environment variables for production
- ✅ Redeploy after updating Vercel
- ✅ Test both environments

## Checklist

- [ ] Got the Secret Value from Azure Portal (not just the Secret ID)
- [ ] Updated `AZURE_AD_CLIENT_SECRET` in `.env.local`
- [ ] Restarted local dev server
- [ ] Updated `AZURE_AD_CLIENT_SECRET` in Vercel (Production)
- [ ] Redeployed on Vercel
- [ ] Tested local sign-in
- [ ] Tested production sign-in

