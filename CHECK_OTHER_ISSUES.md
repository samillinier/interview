# Check Other Issues - Redirect URI is Correct!

## ✅ Good News
Your redirect URI in Azure AD is **correct**:
- `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` ✅

## So Why OAuthSignin Error?

Since the redirect URI is correct, the issue might be:

### 1. App Permissions/API Permissions ✅ **YOU HAVE THIS!**

Your API permissions are **correct**:
- ✅ `Microsoft Graph` → `User.Read` (delegated)

**Note:** `openid`, `profile`, and `email` are automatically included with `User.Read` - they don't need to be added separately. These are standard OpenID Connect scopes that Microsoft Graph provides automatically.

**No action needed here!** ✅

### 2. Tenant ID Issue

Your tenant ID shows: `51905564-c059-411b-bdc8-17a6f4668fb9`

Check if this matches:
- Azure Portal → Your app → **Overview** → **Directory (tenant) ID**
- Should match exactly (no newlines/spaces)

### 3. App Registration Status

Verify the app is:
- ✅ **Active** (not disabled)
- ✅ In the correct tenant
- ✅ Not expired

### 4. Check Vercel Logs

The most helpful next step is to check Vercel logs:

```bash
vercel logs --follow
```

Then try signing in and watch for:
- NextAuth errors
- Azure AD callback errors
- Any 400/401/403 errors

### 5. Test the Callback URL Directly

Try visiting this URL directly (it should show an error page, not redirect):
```
https://floor-interior-service.vercel.app/api/auth/callback/azure-ad?error=test
```

This will help see if the route is working.

## Most Likely Issues (in order of probability)

Since redirect URI is correct, the issue is probably:

### 1. Missing NEXTAUTH_SECRET ⚠️ **MOST COMMON**
NextAuth requires a `NEXTAUTH_SECRET` environment variable. If it's missing, OAuth will fail.

**Check in Vercel:**
- Settings → Environment Variables
- Look for `NEXTAUTH_SECRET`
- If missing, generate one:
  ```bash
  openssl rand -base64 32
  ```
- Add it to Vercel (Production environment)

### 2. API Permissions ✅ **ALREADY CONFIGURED**
Your API permissions are correct:
- ✅ `Microsoft Graph` → `User.Read` (delegated)
- ✅ `openid`, `profile`, `email` are automatically included

**No action needed!** ✅

### 3. Tenant ID Issue
Your tenant ID might have a newline or mismatch:
- Check Azure Portal → Your app → **Overview** → **Directory (tenant) ID**
- Should match exactly: `51905564-c059-411b-bdc8-17a6f4668fb9` (no newlines/spaces)
- In Vercel, make sure `AZURE_AD_TENANT_ID` has no trailing newlines

### 4. App Registration Status
Verify the app is:
- ✅ **Active** (not disabled)
- ✅ In the correct tenant
- ✅ Not expired

## Next Steps (Priority Order)

1. **FIRST:** Check if `NEXTAUTH_SECRET` exists in Vercel
   - Go to Vercel → Settings → Environment Variables
   - If missing, add it (generate with `openssl rand -base64 32`)

2. **SECOND:** Check API permissions in Azure AD
   - Azure Portal → Your app → API permissions
   - Ensure User.Read, openid, profile, email are present
   - Grant admin consent if needed

3. **THIRD:** Verify tenant ID matches exactly
   - Check Azure Portal → Overview → Directory (tenant) ID
   - Compare with Vercel environment variable (no newlines)

4. **FOURTH:** Check Vercel logs when signing in
   - Use `vercel logs --follow` or check Vercel dashboard
   - Look for NextAuth errors or Azure AD callback errors

5. **FIFTH:** Test the callback URL directly
   - Visit: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad?error=test`
   - Should show an error page, not redirect

