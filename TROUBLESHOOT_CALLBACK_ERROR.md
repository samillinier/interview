# Troubleshoot: Callback Error (Redirect URI Already Configured)

## ✅ Good News
Your redirect URI is correctly configured in Azure AD:
- `http://localhost:3000/api/auth/callback/azure-ad` ✅

## 🔍 Since Redirect URI is Correct, Check These:

### Step 1: Restart Your Dev Server
The redirect URI might have been added recently. Restart your server:

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 2: Clear Browser Data
1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **"Clear site data"** or **"Clear storage"**
4. Close and reopen your browser
5. Try signing in again

### Step 3: Check Server Logs
When you try to sign in, watch your terminal (where `npm run dev` is running). Look for:

**Good signs:**
- `✅ Azure AD configured with Client ID: 1e9c9b96...`
- `🔐 SignIn callback triggered`
- `📧 User email: ...`

**Bad signs:**
- `❌ NextAuth Error: OAuthCallback`
- Any error messages with details

### Step 4: Verify Client Secret
The client secret might be expired or incorrect. Check in Azure Portal:

1. Go to: **Azure Portal** → Your App → **Certificates & secrets**
2. Check if your client secret is:
   - ✅ Not expired
   - ✅ Matches what's in `.env.local`

If expired, create a new one:
1. Click **"New client secret"**
2. Copy the **Value** (not the Secret ID)
3. Update `.env.local`:
   ```bash
   AZURE_AD_CLIENT_SECRET=new-secret-value-here
   ```
4. Restart server

### Step 5: Check Environment Variables Are Loaded
Visit: http://localhost:3000/api/debug-auth

Verify:
- `hasClientId`: `true`
- `hasClientSecret`: `true`
- `hasNextAuthSecret`: `true`
- `nextAuthUrl`: `http://localhost:3000`
- `expectedCallback`: `http://localhost:3000/api/auth/callback/azure-ad`

### Step 6: Try Incognito/Private Window
Sometimes browser extensions or cached data cause issues:
1. Open an incognito/private window
2. Visit: http://localhost:3000/login
3. Try signing in

### Step 7: Check for Port Conflicts
Make sure you're using port 3000:
1. Check your terminal - it should say: `Local: http://localhost:3000`
2. If it's a different port (like 3001), update:
   - `.env.local`: `NEXTAUTH_URL=http://localhost:3001`
   - Azure AD redirect URI: `http://localhost:3001/api/auth/callback/azure-ad`

### Step 8: Verify Callback Route Exists
Test if the callback route is accessible:
1. Visit: http://localhost:3000/api/auth/callback/azure-ad
2. You should see a NextAuth error page (not a 404)
3. If you see 404, the route isn't set up correctly

## 🐛 Common Issues

### Issue: "Invalid client secret"
- **Fix**: Generate a new client secret in Azure Portal and update `.env.local`

### Issue: "Redirect URI mismatch" (even though it's configured)
- **Fix**: 
  1. Delete the redirect URI in Azure AD
  2. Wait 1 minute
  3. Add it back exactly: `http://localhost:3000/api/auth/callback/azure-ad`
  4. Save and wait 2 minutes
  5. Restart server

### Issue: Session not being created
- **Fix**: 
  1. Check `NEXTAUTH_SECRET` is set
  2. Clear browser cookies
  3. Try incognito mode

## 📋 Quick Checklist

- [ ] Server restarted after adding redirect URI
- [ ] Browser cookies cleared
- [ ] Client secret is not expired
- [ ] `.env.local` has all variables
- [ ] Using correct port (3000)
- [ ] Tried incognito/private window
- [ ] Checked server logs for specific errors
- [ ] Verified debug endpoint shows correct config

## 🚀 Still Not Working?

If none of the above works, check:

1. **Server Logs**: Copy the exact error message from your terminal
2. **Browser Console**: Check for any JavaScript errors (F12 → Console)
3. **Network Tab**: Check the callback request in DevTools → Network tab

Share the specific error messages you see, and we can troubleshoot further!

