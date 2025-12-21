# Fix OAuthCallback Error on Local Server

## The Problem
You're getting `OAuthCallback` error when signing in locally. This means:
- ✅ Microsoft authentication succeeded
- ✅ Microsoft redirected back to your app
- ❌ NextAuth failed to process the callback

## Common Causes

### 1. NEXTAUTH_URL Not Set Correctly for Local
Your `.env.local` must have:
```bash
NEXTAUTH_URL=http://localhost:3000
```
**Important:** 
- Use `http://` (not `https://`) for local
- Use port `3000` (or whatever port your dev server uses)
- **NO trailing slash**

### 2. Azure AD Redirect URI Missing Localhost
Your Azure AD app must have this redirect URI:
```
http://localhost:3000/api/auth/callback/azure-ad
```

**How to add it:**
1. Go to https://portal.azure.com
2. Azure Active Directory → App registrations
3. Find your app: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
4. Go to **Authentication** → **Redirect URIs**
5. Click **Add URI**
6. Add: `http://localhost:3000/api/auth/callback/azure-ad`
7. Click **Save**

### 3. NEXTAUTH_SECRET Missing or Invalid
Your `.env.local` must have:
```bash
NEXTAUTH_SECRET=your-secret-here
```

**Generate a secret:**
```bash
openssl rand -base64 32
```

Then add it to `.env.local`:
```bash
NEXTAUTH_SECRET=<generated-secret>
```

### 4. Check Server Logs
Look at your terminal where `npm run dev` is running. You should see:
- `🔐 SignIn callback triggered` - if this appears, the callback is being processed
- Any error messages from NextAuth logger

## Quick Fix Steps

1. **Check `.env.local`:**
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<your-secret>
   AZURE_AD_CLIENT_ID=dd3245ef-30b6-4929-8373-dc5bbcd06268
   AZURE_AD_CLIENT_SECRET=<your-secret>
   AZURE_AD_TENANT_ID=common
   ```

2. **Verify Azure AD Redirect URI:**
   - Must include: `http://localhost:3000/api/auth/callback/azure-ad`

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

4. **Clear browser cookies:**
   - Open browser DevTools
   - Application → Cookies
   - Delete all cookies for `localhost:3000`
   - Try signing in again

## Still Not Working?

Check the server terminal logs for detailed error messages. The NextAuth logger should show what's failing.

