# Fix "Configuration" Error in Production

## 🔴 The Problem

You're seeing: **"Access Not Authorized" with `error=Configuration`**

This means NextAuth is not properly configured in production. The `providers` array is empty because Azure AD credentials are missing.

## ✅ Solution: Verify Environment Variables in Vercel

### Required Environment Variables

The following environment variables **MUST** be set in Vercel for production:

1. **`NEXTAUTH_SECRET`** - Secret key for NextAuth (required)
2. **`NEXTAUTH_URL`** - Your production URL (required)
3. **`AZURE_AD_CLIENT_ID`** - Azure AD Application Client ID (required)
4. **`AZURE_AD_CLIENT_SECRET`** - Azure AD Application Client Secret (required)
5. **`AZURE_AD_TENANT_ID`** - Azure AD Tenant ID (optional, defaults to 'common')

### Step 1: Go to Vercel Dashboard

1. Visit: https://vercel.com/dashboard
2. Select project: **floor-interior-service**
3. Go to **Settings** → **Environment Variables**

### Step 2: Check Each Variable

Verify these variables exist and are set for **Production**:

#### 1. NEXTAUTH_SECRET
- **Name:** `NEXTAUTH_SECRET`
- **Value:** Should be a long random string (at least 32 characters)
- **Environment:** ✅ Production (must be checked)
- **If missing:** Generate one:
  ```bash
  openssl rand -base64 32
  ```

#### 2. NEXTAUTH_URL
- **Name:** `NEXTAUTH_URL`
- **Value:** Should be your production URL:
  - `https://job.floorinteriorservices.com` (if using custom domain)
  - OR `https://floor-interior-service-six.vercel.app` (Vercel URL)
- **Environment:** ✅ Production (must be checked)

#### 3. AZURE_AD_CLIENT_ID
- **Name:** `AZURE_AD_CLIENT_ID`
- **Value:** Your Azure AD Application Client ID
- **Environment:** ✅ Production (must be checked)
- **Example:** `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`

#### 4. AZURE_AD_CLIENT_SECRET
- **Name:** `AZURE_AD_CLIENT_SECRET`
- **Value:** Your Azure AD Application Client Secret
- **Environment:** ✅ Production (must be checked)
- **⚠️ Important:** Make sure the secret hasn't expired in Azure Portal

#### 5. AZURE_AD_TENANT_ID (Optional)
- **Name:** `AZURE_AD_TENANT_ID`
- **Value:** Your Azure AD Tenant ID (or `common` for multi-tenant)
- **Environment:** ✅ Production (optional but recommended)

### Step 3: Verify All Variables Are Set

Make sure **ALL** of these are checked for **Production**:
- ✅ `NEXTAUTH_SECRET`
- ✅ `NEXTAUTH_URL`
- ✅ `AZURE_AD_CLIENT_ID`
- ✅ `AZURE_AD_CLIENT_SECRET`
- ✅ `AZURE_AD_TENANT_ID` (optional)

### Step 4: Redeploy After Changes

**IMPORTANT:** After adding/updating environment variables, you **MUST** redeploy:

1. Go to **Deployments** tab
2. Click **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

OR run:
```bash
vercel --prod --yes --scope samilliniers-projects
```

### Step 5: Verify Azure AD Redirect URI

Make sure your Azure AD redirect URI matches your production URL:

1. Go to: https://portal.azure.com
2. Azure Active Directory → **App registrations**
3. Find your app (by Client ID)
4. Go to **Authentication** → **Redirect URIs**
5. Make sure you have:
   ```
   https://job.floorinteriorservices.com/api/auth/callback/azure-ad
   ```
   OR
   ```
   https://floor-interior-service-six.vercel.app/api/auth/callback/azure-ad
   ```
6. Click **Save**

## 🔍 How to Check if Variables Are Set

You can verify environment variables via CLI:

```bash
vercel env ls --scope samilliniers-projects
```

This will show all environment variables and which environments they're set for.

## ⚠️ Common Mistakes

1. **Variables set for Preview/Development but not Production**
   - Make sure to check the **Production** checkbox when adding variables

2. **NEXTAUTH_URL pointing to wrong domain**
   - Should match your actual production URL

3. **Azure AD Client Secret expired**
   - Check Azure Portal → App registrations → Certificates & secrets
   - Generate a new secret if expired

4. **Forgot to redeploy after adding variables**
   - Environment variables only take effect after redeployment

## ✅ Expected Result

After fixing:
- No more "Configuration" error
- Microsoft login should work
- Users can authenticate successfully
