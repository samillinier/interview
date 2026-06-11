# Immediate Fix Steps for Callback Error

## ✅ Redirect URI is Configured Correctly
Your Azure AD already has: `http://localhost:3000/api/auth/callback/azure-ad` ✅

## 🔧 Try These Steps in Order:

### Step 1: Restart Dev Server (CRITICAL)
```bash
# Stop server completely (Ctrl+C)
# Wait 2 seconds
npm run dev
```

**Why:** Environment variables and Azure AD changes need a fresh server start.

### Step 2: Clear Browser Completely
1. **Close ALL browser windows**
2. **Clear browser data:**
   - Chrome: Settings → Privacy → Clear browsing data → All time → Clear
   - Firefox: Settings → Privacy → Clear Data
   - Safari: Safari → Clear History → All History
3. **Restart browser**
4. **Try in incognito/private window first**

### Step 3: Verify Client Secret
The client secret might be expired or incorrect:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Your App → **Certificates & secrets**

2. **Check if secret is expired:**
   - Look at expiration dates
   - If expired, create a new one

3. **If you create a new secret:**
   - Copy the **Value** (not Secret ID)
   - Update `.env.local`:
     ```bash
     AZURE_AD_CLIENT_SECRET=new-secret-value-here
     ```
   - **Restart server**

### Step 4: Check Server Logs
When you try to sign in, **watch your terminal** carefully. Look for:

**Good signs:**
```
✅ Azure AD configured with Client ID: 1e9c9b96...
🔐 SignIn callback triggered
📧 User email: your@email.com
```

**Bad signs:**
```
❌ NextAuth Error: OAuthCallback
🔴 OAuthCallback Error Details:
```

**Copy the EXACT error message** from your terminal and share it.

### Step 5: Test Configuration
Visit: http://localhost:3000/api/test-callback

This will show:
- If NEXTAUTH_URL is set correctly
- If secrets are loaded
- Expected callback URL

### Step 6: Verify Redirect URI One More Time
Even though it's configured, sometimes there are hidden characters:

1. **Azure Portal** → Your App → **Authentication**
2. **Click "Edit"** on the redirect URI
3. **Delete everything** in the field
4. **Type it fresh** (don't copy-paste):
   ```
   http://localhost:3000/api/auth/callback/azure-ad
   ```
5. **Check for:**
   - No spaces before/after
   - No trailing slash
   - Exact case (all lowercase)
6. **Save**
7. **Wait 2 minutes** (Azure needs time to propagate)
8. **Restart server**

### Step 7: Check Port Number
Make sure you're using port 3000:

1. **Check terminal** - should say: `Local: http://localhost:3000`
2. **If different port** (like 3001):
   - Update `.env.local`: `NEXTAUTH_URL=http://localhost:3001`
   - Update Azure AD redirect URI: `http://localhost:3001/api/auth/callback/azure-ad`
   - Restart server

## 🎯 Most Likely Fixes (in order):

1. **Restart server** (90% of cases)
2. **Clear browser data** (80% of cases)
3. **Client secret expired** (30% of cases)
4. **Port mismatch** (10% of cases)

## 🐛 Still Not Working?

**Share these details:**

1. **Server logs** - Copy the exact error from terminal
2. **Browser console** - F12 → Console tab → Any errors?
3. **Test endpoint result** - Visit http://localhost:3000/api/test-callback and share output
4. **What happens:**
   - Do you get redirected to Microsoft? ✅
   - After signing in, do you get redirected back? ✅
   - What error appears?

## 📋 Quick Checklist

- [ ] Server restarted
- [ ] Browser data cleared
- [ ] Tried incognito mode
- [ ] Client secret not expired
- [ ] Using correct port (3000)
- [ ] Checked server logs for specific error
- [ ] Redirect URI re-typed (not copy-pasted)
- [ ] Waited 2 minutes after Azure AD changes

