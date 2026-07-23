# Azure AD Client App Information

## Current Azure AD App Registration

### Application Details

**Application (Client) ID:**
```
dd3245ef-30b6-4929-8373-dc5bbcd06268
```

**App Name:**
- Likely named "FIS" (Floor Interior Services) based on documentation references

**Tenant ID:**
```
51905564-c059-411b-bdc8-17a6f4668fb9
```

### Where It's Used

**Production (Vercel):**
- Configured in Vercel environment variables as `AZURE_AD_CLIENT_ID`
- Used for Microsoft authentication in production

**Local Development:**
- May use a different client ID: `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
- Configured in `.env.local` file

### Authentication Provider

**Provider:** Azure Active Directory (Azure AD)
**Library:** NextAuth.js with Azure AD Provider
**Scopes:** `openid profile email User.Read`

### Configuration

The app is configured in:
- **File:** `src/app/api/auth/[...nextauth]/route.ts`
- **Provider:** `AzureADProvider` from `next-auth/providers/azure-ad`
- **Environment Variables:**
  - `AZURE_AD_CLIENT_ID` - The application ID
  - `AZURE_AD_CLIENT_SECRET` - Client secret for authentication
  - `AZURE_AD_TENANT_ID` - Tenant ID (or 'common' for multi-tenant)

### How to Find It in Azure Portal

1. Go to: https://portal.azure.com
2. Navigate to: **Azure Active Directory** → **App registrations**
3. Search for: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. Click on the app to view details

### What It Does

This Azure AD app registration:
- Enables Microsoft account sign-in for your application
- Handles OAuth 2.0 authentication flow
- Redirects users to Microsoft login
- Receives authentication callbacks at: `/api/auth/callback/azure-ad`
- Provides user profile information (email, name, picture)

### Current Status

- ✅ Client ID configured: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
- ✅ Client Secret configured (expires 6/4/2026)
- ✅ Tenant ID configured: `51905564-c059-411b-bdc8-17a6f4668fb9`
- ⚠️ Redirect URI needs to be added: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`

