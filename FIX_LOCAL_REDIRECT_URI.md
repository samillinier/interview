# 🔧 Fix Local Development Redirect URI Error

## The Error
```
Authentication callback failed. This usually means the redirect URI in Azure AD doesn't match. 
Please check that http://localhost:3000/api/auth/callback/azure-ad is configured in Azure Portal.
```

## ✅ Solution: Add Redirect URI to Azure AD

### Step 1: Go to Azure Portal
1. Visit: **https://portal.azure.com**
2. Sign in with your Microsoft account

### Step 2: Find Your App Registration
1. Click **"Azure Active Directory"** (left sidebar)
2. Click **"App registrations"** (under "Manage")
3. Search for your Client ID (check your `.env.local` file for `AZURE_AD_CLIENT_ID`)
   - Common IDs found in your project: 
     - `1e9c9b96-10e8-43b2-a75c-8995c45d7c26`
     - `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. Click on your app

### Step 3: Add the Redirect URI
1. In the left menu, click **"Authentication"**
2. Scroll to **"Redirect URIs"** section
3. Click **"Add URI"** or **"Add a platform"** → **"Web"**
4. Paste this **EXACT** URL (copy it exactly):
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
5. **Critical checks:**
   - ✅ Must start with `http://` (NOT `https://` for localhost)
   - ✅ No trailing slash at the end
   - ✅ Port is `3000` (not 3001 or any other port)
   - ✅ Exact path: `/api/auth/callback/azure-ad`
   - ✅ All lowercase

### Step 4: Save
1. Click **"Save"** at the top of the page
2. Wait for the confirmation message (usually shows "Successfully updated")

### Step 5: Wait and Test
1. **Wait 1-2 minutes** for Azure AD to propagate the changes
2. **Restart your dev server** (if it's running):
   ```bash
   # Stop with Ctrl+C, then:
   npm run dev
   ```
3. **Clear browser cookies** (optional but recommended):
   - Open DevTools (F12)
   - Application tab → Cookies → Delete all for localhost:3000
4. **Try signing in again** at: http://localhost:3000/login

## 🎯 Common Mistakes

### ❌ WRONG (will NOT work):
- `http://localhost:3000/api/auth/callback/azure-ad/` ← trailing slash
- `https://localhost:3000/api/auth/callback/azure-ad` ← https for localhost
- `http://localhost:3001/api/auth/callback/azure-ad` ← wrong port
- `http://127.0.0.1:3000/api/auth/callback/azure-ad` ← use localhost, not 127.0.0.1
- `http://localhost:3000/api/auth/callback/azure` ← missing `/azure-ad`

### ✅ CORRECT:
- `http://localhost:3000/api/auth/callback/azure-ad`

## 🔍 Verify It's Added

After saving, go back to **Authentication** → **Redirect URIs** and verify you see:
```
http://localhost:3000/api/auth/callback/azure-ad
```

## 🐛 Still Not Working?

### Check 1: Verify NEXTAUTH_URL
Make sure your `.env.local` has:
```bash
NEXTAUTH_URL=http://localhost:3000
```

### Check 2: Check Server Logs
When you try to sign in, look at your terminal where `npm run dev` is running. You should see:
- `✅ Azure AD configured with Client ID: ...`
- `🔐 SignIn callback triggered`

### Check 3: Multiple Redirect URIs
You can have multiple redirect URIs. Make sure `http://localhost:3000/api/auth/callback/azure-ad` is in the list along with any production URLs.

### Check 4: Client ID Match
Make sure the Client ID in Azure Portal matches the `AZURE_AD_CLIENT_ID` in your `.env.local` file.

## ✅ Success!

Once configured correctly:
1. You'll be redirected to Microsoft login page
2. After signing in, you'll be redirected back to your app
3. You'll see your profile in the dashboard
4. No more redirect URI errors!
