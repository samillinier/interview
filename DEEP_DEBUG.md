# Deep Debugging OAuthSignin Error

## Steps to Find the Real Issue

### Step 1: Check What NextAuth is Actually Sending

The debug endpoint shows what's configured. But we need to see what's actually happening during the OAuth flow.

### Step 2: Check Vercel Logs

1. Go to: https://vercel.com/dashboard
2. Select: `floor-interior-service`
3. Go to: **Logs** tab
4. Try signing in
5. Watch the logs for:
   - NextAuth errors
   - The actual callback URL being used
   - Any Azure AD errors

### Step 3: Verify Redirect URI in Azure AD (Again)

Sometimes the redirect URI gets added but with extra characters. Check:

1. Azure Portal → Your app "FIS" → Authentication
2. Click on the redirect URI to **EDIT** it
3. **DELETE** the entire current value
4. **TYPE IT FRESH** (don't copy-paste):
   ```
   https://floor-interior-service.vercel.app/api/auth/callback/azure-ad
   ```
5. Make sure there are NO spaces before or after
6. Click Save

### Step 4: Check for Multiple Redirect URIs

Make sure you don't have:
- Old/incorrect redirect URIs
- Preview deployment URLs that conflict
- Only keep:
  - `https://floor-interior-service.vercel.app/api/auth/callback/azure-ad` (production)
  - `http://localhost:3000/api/auth/callback/azure-ad` (local dev, optional)

### Step 5: Verify NEXTAUTH_URL in Vercel

1. Vercel Dashboard → Settings → Environment Variables
2. Find `NEXTAUTH_URL`
3. Click **Edit**
4. Make sure it's EXACTLY:
   ```
   https://floor-interior-service.vercel.app
   ```
   - No trailing slash
   - No spaces
   - Must match your actual production URL
5. Click Save
6. **Redeploy** (Vercel should auto-redeploy, but you can manually trigger it)

### Step 6: Check if You're Using the Right Azure AD App

Make sure you're editing the correct app:
- App name: **FIS**
- Client ID: `dd3245ef-30b6-4929-8373-dc5bbcd06268`

You have 3 apps - make sure you're editing the right one!

### Step 7: Test the Callback URL Directly

Try visiting this URL in your browser:
```
https://floor-interior-service.vercel.app/api/auth/callback/azure-ad?error=test
```

It should show an error page (not redirect). If it redirects or shows 404, the route isn't working.

### Step 8: Check Tenant ID

The tenant ID might still have issues. Check:
1. Vercel → Environment Variables → `AZURE_AD_TENANT_ID`
2. Should be: `51905564-c059-411b-bdc8-17a6f4668fb9` (or `common`)
3. NO newlines or spaces

### Step 9: Try Using "common" as Tenant ID

If using a specific tenant ID isn't working, try:
1. In Vercel, set `AZURE_AD_TENANT_ID=common`
2. This allows sign-in from any Azure AD tenant
3. Redeploy
4. Try again

### Step 10: Check App Registration Status

In Azure Portal → Your app "FIS" → Overview:
- Make sure the app is **Active** (not disabled)
- Check the **Status** field
- Verify it's in the correct tenant

## What to Share for Further Help

If still not working, please share:

1. **Screenshot** of Azure AD → Authentication → Redirect URIs (showing all URIs)
2. **Screenshot** of Vercel → Environment Variables (showing NEXTAUTH_URL value)
3. **Error logs** from Vercel (when you try to sign in)
4. **Response** from: `https://floor-interior-service.vercel.app/api/debug-auth`

