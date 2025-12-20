# Azure AD Setup for Floor Interior Services Tenant

## Problem
The Azure AD app is not registered in the "Floor Interior Services" tenant, causing sign-in failures.

## Solution Options

### Option 1: Register New App in Floor Interior Services Tenant (Recommended)

1. **Sign in to Azure Portal with a Floor Interior Services account:**
   - Go to https://portal.azure.com
   - Sign in with an account from `@fiscorponline.com` or the Floor Interior Services organization

2. **Create New App Registration:**
   - Navigate to: **Azure Active Directory** → **App registrations**
   - Click **"New registration"**
   - Fill in:
     - **Name:** `Floor Interior Service Dashboard`
     - **Supported account types:** Select **"Accounts in this organizational directory only (Floor Interior Services only - Single tenant)"**
     - **Redirect URI:** 
       - Platform: **Web**
       - URI: `https://floor-interior-service-45ps0nd6n.vercel.app/api/auth/callback/azure-ad`
   - Click **"Register"**

3. **Get the Credentials:**
   - **Application (client) ID** → This is your `AZURE_AD_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `AZURE_AD_TENANT_ID`
   - Go to **Certificates & secrets** → **New client secret**
   - Copy the **Value** → This is your `AZURE_AD_CLIENT_SECRET`

4. **Update Environment Variables in Vercel:**
   - Replace the old `AZURE_AD_CLIENT_ID` with the new one
   - Replace the old `AZURE_AD_CLIENT_SECRET` with the new one
   - Replace `AZURE_AD_TENANT_ID` with the Directory (tenant) ID from step 3

### Option 2: Find Existing Tenant ID

If you want to use the existing app registration, you need to find which tenant it's registered in:

1. **Check the app registration:**
   - Go to https://portal.azure.com
   - Navigate to: **Azure Active Directory** → **App registrations**
   - Find the app with Client ID: `51905564-c059-411b-bdc8-17a6f4668fb9`
   - Check the **Overview** page for the **Directory (tenant) ID**
   - This is the tenant where the app is registered

2. **Update Tenant ID:**
   - Use that tenant ID instead of "common"
   - But note: Users from "Floor Interior Services" tenant still won't be able to sign in unless the app is also registered there

### Option 3: Make App Multi-Tenant (If App Supports It)

1. **Update App Registration:**
   - Go to the app registration
   - Navigate to **Authentication**
   - Under **Supported account types**, change to:
     - **"Accounts in any organizational directory and personal Microsoft accounts"**
   - Add redirect URI: `https://floor-interior-service-45ps0nd6n.vercel.app/api/auth/callback/azure-ad`
   - Click **Save**

2. **Admin Consent (May Be Required):**
   - An admin from Floor Interior Services may need to grant consent
   - Or users will see a consent screen on first sign-in

## Recommended: Option 1

**Register a new app in the Floor Interior Services tenant** - This is the cleanest solution and ensures the app works for all users in your organization.

## After Setup

Once you have the new credentials:
1. Update environment variables in Vercel
2. Redeploy the application
3. Test sign-in with a `@fiscorponline.com` account

