# Try Using "common" as Tenant ID

Since the redirect URI configuration seems correct but still not working, let's try using `common` as the tenant ID. This allows sign-in from any Azure AD tenant and sometimes resolves configuration issues.

## Steps:

1. **In Vercel:**
   - Go to: Settings → Environment Variables
   - Find: `AZURE_AD_TENANT_ID`
   - Change value to: `common`
   - Save

2. **Redeploy:**
   - Vercel will auto-redeploy
   - Wait 1-2 minutes

3. **Try signing in again**

This will allow sign-in from any Microsoft account, not just your specific tenant. If this works, then the issue was with the specific tenant ID.

