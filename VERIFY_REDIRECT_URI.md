# Critical: Verify Redirect URI is EXACTLY Correct

## The redirect URI MUST be EXACTLY:

```
https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
```

## Common Mistakes People Make:

1. **Extra space at the end:**
   - ❌ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad ` (has space)
   - ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (no space)

2. **Trailing slash:**
   - ❌ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad/` (has slash)
   - ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (no slash)

3. **Wrong protocol:**
   - ❌ `http://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (http)
   - ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (https)

4. **Different domain:**
   - ❌ `https://floor-interior-service-xxxxx.vercel.app/api/auth/callback/azure-ad` (different subdomain)
   - ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (correct)

5. **Wrong path:**
   - ❌ `https://floor-interior-service.vercel.app/auth/callback/azure-ad` (missing /api)
   - ✅ `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (correct)

6. **Copy-paste issues:**
   - Sometimes copy-paste adds invisible characters
   - **Solution:** Delete the entire field and TYPE it fresh

## How to Verify in Azure AD:

1. Go to Azure Portal → Your app "FIS" → Authentication
2. Click on the redirect URI to **EDIT** it
3. **Select all** the text in the field (Ctrl+A / Cmd+A)
4. **Delete** it completely
5. **TYPE** the URL fresh: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
6. **DO NOT** copy-paste - type it character by character
7. Click Save
8. Wait 2-3 minutes for changes to propagate
9. Try signing in again

