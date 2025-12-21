# Login Page Setup Guide

## ✅ What's Been Done

1. **Created new login page** at `/login`
2. **Removed old signin page** completely
3. **Updated NextAuth configuration** to use the new login page
4. **Added proper error handling** and loading states

## 🔧 How to Make It Work

### Step 1: Environment Variables

Make sure you have these environment variables set up:

#### For Local Development (`env.local`):

```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Azure AD Configuration
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret
AZURE_AD_TENANT_ID=your-tenant-id
```

#### For Production (Vercel):

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all the variables above with production values:
   - `NEXTAUTH_URL` = your production URL (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET` = generate with: `openssl rand -base64 32`
   - `AZURE_AD_CLIENT_ID` = from Azure Portal
   - `AZURE_AD_CLIENT_SECRET` = from Azure Portal
   - `AZURE_AD_TENANT_ID` = from Azure Portal (or use `common` for any tenant)

### Step 2: Azure AD Configuration

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to**: Azure Active Directory → App registrations → Your App
3. **Check Redirect URIs**:
   - For local: `http://localhost:3000/api/auth/callback/azure-ad`
   - For production: `https://your-app.vercel.app/api/auth/callback/azure-ad`
4. **Verify API Permissions**:
   - Microsoft Graph → User.Read (delegated)

### Step 3: Test the Login Page

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Visit the login page**:
   - Local: http://localhost:3000/login
   - Production: https://your-app.vercel.app/login

3. **Click "Continue with Microsoft"**
   - You should be redirected to Microsoft's login page
   - After signing in, you'll be redirected back to your dashboard

## 🎯 How It Works

1. User visits `/login`
2. Clicks "Continue with Microsoft"
3. NextAuth redirects to Microsoft OAuth
4. User authenticates with Microsoft
5. Microsoft redirects back to `/api/auth/callback/azure-ad`
6. NextAuth processes the callback
7. User is redirected to `/dashboard` (or custom callbackUrl)

## 🔍 Troubleshooting

### Issue: "OAuthSignin" Error
- **Check**: Redirect URI in Azure AD matches exactly
- **Check**: `NEXTAUTH_URL` matches your actual URL
- **Check**: `NEXTAUTH_SECRET` is set

### Issue: "OAuthCallback" Error
- **Check**: `NEXTAUTH_SECRET` is set and correct
- **Check**: Azure AD client secret is correct
- **Check**: Session cookies are enabled

### Issue: Page Not Loading
- **Check**: All environment variables are set
- **Check**: Azure AD provider is configured
- **Check**: Server logs for errors

### Issue: Redirect Loop
- **Check**: `callbackUrl` is correct
- **Check**: Session is being created properly
- **Check**: No conflicting redirects

## 📝 Notes

- The login page uses `redirect: true` for proper OAuth flow
- Error messages are displayed if authentication fails
- The page is wrapped in Suspense for Next.js 13+ compatibility
- All authentication is handled securely through Microsoft OAuth

## 🚀 Next Steps

1. Set up your environment variables
2. Configure Azure AD redirect URIs
3. Test the login flow
4. Customize the login page if needed (it's at `src/app/login/page.tsx`)

