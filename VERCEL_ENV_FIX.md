# Fix Missing Production Environment Variables

## Issue Found
Your Vercel environment variables are missing for **Production** environment:
- ❌ `NEXTAUTH_URL` - Missing for Production
- ❌ `NEXT_PUBLIC_APP_URL` - Missing for Production
- ❓ `AZURE_AD_CLIENT_ID` - Not visible (may be missing)
- ❓ `AZURE_AD_CLIENT_SECRET` - Not visible (may be missing)
- ❓ `AZURE_AD_TENANT_ID` - Not visible (may be missing)

## Fix Steps

### Step 1: Add Missing Production Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

1. **Add `NEXTAUTH_URL` for Production:**
   - Click "Add New"
   - Name: `NEXTAUTH_URL`
   - Value: `https://floor-interior-service-gg2yzwpmp.vercel.app`
   - Environment: Select **Production** ✅
   - Click "Save"

2. **Add `NEXT_PUBLIC_APP_URL` for Production:**
   - Click "Add New"
   - Name: `NEXT_PUBLIC_APP_URL`
   - Value: `https://floor-interior-service-gg2yzwpmp.vercel.app`
   - Environment: Select **Production** ✅
   - Click "Save"

3. **Add Azure AD Variables for Production (if missing):**
   - Click "Add New"
   - Name: `AZURE_AD_CLIENT_ID`
   - Value: `dd3245ef-30b6-4929-8373-dc5bbcd06268`
   - Environment: Select **Production** ✅
   - Click "Save"

   - Click "Add New"
   - Name: `AZURE_AD_CLIENT_SECRET`
   - Value: `a115ae4f-a109-4f29-9858-151650334f30`
   - Environment: Select **Production** ✅
   - Click "Save"

   - Click "Add New"
   - Name: `AZURE_AD_TENANT_ID`
   - Value: `common` (or your tenant ID)
   - Environment: Select **Production** ✅
   - Click "Save"

### Step 2: Verify All Variables

After adding, you should see:
- ✅ `NEXTAUTH_URL` (Development, Preview, **Production**)
- ✅ `NEXT_PUBLIC_APP_URL` (Development, Preview, **Production**)
- ✅ `AZURE_AD_CLIENT_ID` (All Environments or at least Production)
- ✅ `AZURE_AD_CLIENT_SECRET` (All Environments or at least Production)
- ✅ `AZURE_AD_TENANT_ID` (All Environments or at least Production)

### Step 3: Redeploy

After adding the variables, trigger a new deployment:
- Go to Deployments tab
- Click "Redeploy" on the latest deployment
- Or push a new commit

### Step 4: Test

1. Visit: `https://floor-interior-service-gg2yzwpmp.vercel.app/auth/signin`
2. Click "Sign in with Microsoft"
3. Should now work properly!

## Why This Fixes It

`NEXTAUTH_URL` is **critical** for NextAuth to work in production. Without it:
- NextAuth doesn't know the callback URL
- Sign-in redirects fail
- Session creation fails

This is why sign-in was "stopping after a few seconds" - the callback couldn't complete.

