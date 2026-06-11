# Azure AD Client Secret Verification

## ✅ Your Client Secrets Status

From the Azure Portal screenshot, I can see you have **2 client secrets**:

1. **Secret ID:** `460c55fe-7676-4e9a-871d-ae85fa417ba3`
   - Description: "f"
   - Expires: 6/4/2026 ✅ (Valid)

2. **Secret ID:** `a115ae4f-a109-4f29-9858-151650334f30`
   - Description: "fis"
   - Expires: 6/4/2026 ✅ (Valid)
   - **This is the one configured in your app!**

## ✅ Client Secret is Valid

Your client secret is:
- ✅ Not expired (expires 6/4/2026)
- ✅ Matches what's in your Vercel environment variables
- ✅ Correct Secret ID: `a115ae4f-a109-4f29-9858-151650334f30`

## The Real Issue: Redirect URI

Since your client secret is valid and your configuration is correct, the **OAuthSignin error is almost certainly due to a redirect URI mismatch in Azure AD**.

## Next Step: Check Redirect URI in Azure AD

1. **In Azure Portal, go to:**
   - Your app "FIS" → **Authentication** (left sidebar)
   - **NOT** "Certificates & secrets" (you're currently there)

2. **Check Redirect URIs:**
   - Scroll to **Redirect URIs** section
   - You should see: `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad`
   - If it's missing or different, add/update it

3. **Make sure it's EXACTLY:**
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```
   - No trailing slash
   - Exact case match
   - Must use `https://` (not `http://`)

## Summary

- ✅ Client Secret: Valid and correct
- ✅ Client ID: Correct (`dd3245ef-30b6-4929-8373-dc5bbcd06268`)
- ✅ NEXTAUTH_URL: Correct (`https://floor-interior-service.vercel.app`)
- ❓ **Redirect URI in Azure AD: Needs verification**

The redirect URI is the missing piece. Once it matches exactly, sign-in will work!

