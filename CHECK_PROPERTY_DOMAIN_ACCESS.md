# Troubleshooting Property Portal Access at job.floorinteriorservices.com/property

If you can't access `https://job.floorinteriorservices.com/property`, follow these steps:

## Step 1: Verify Domain is Configured in Vercel

1. Go to: https://vercel.com/dashboard
2. Select project: **floor-interior-service**
3. Go to **Settings** → **Domains**
4. Check if `job.floorinteriorservices.com` is listed
5. Check the status:
   - ✅ **Valid** = Domain is configured correctly
   - ⏳ **Pending** = DNS still propagating (wait 15-60 minutes)
   - ❌ **Invalid** = DNS needs to be fixed (see Step 2)

## Step 2: Verify DNS Configuration

The DNS record should be:

```
Type: CNAME
Name: job
Value: (check Vercel dashboard for exact value)
```

**To check your DNS:**
1. Visit: https://dnschecker.org
2. Enter: `job.floorinteriorservices.com`
3. Select: `CNAME` record type
4. Click **Search**
5. Verify the record points to Vercel (should show `*.vercel-dns.com` or similar)

## Step 3: Verify Environment Variables in Vercel

**Critical:** The `NEXTAUTH_URL` must match your custom domain!

1. Go to Vercel: **Settings** → **Environment Variables**
2. Find `NEXTAUTH_URL`
3. **Production value should be:** `https://job.floorinteriorservices.com`
4. If it's different, update it:
   - Click **Edit**
   - Set value to: `https://job.floorinteriorservices.com`
   - Make sure **Production** environment is selected ✅
   - Click **Save**
5. **Redeploy** after updating environment variables:
   - Go to **Deployments** tab
   - Click **⋯** (three dots) on latest deployment
   - Click **Redeploy**

## Step 4: Verify Azure AD Redirect URI

The redirect URI in Azure AD must match your custom domain:

1. Go to: https://portal.azure.com
2. Navigate to: **Azure Active Directory** → **App registrations** → Your app
3. Go to **Authentication**
4. Under **Redirect URIs**, verify you have:
   - `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
5. If missing, add it:
   - Click **Add URI**
   - Select **Web**
   - Enter: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
   - Click **Save**

## Step 5: Test Access

1. **Clear browser cache** (important!)
2. Try accessing: `https://job.floorinteriorservices.com/property`
3. If you see a login page, it's working! ✅
4. If you see an error, check:
   - Browser console (F12) for errors
   - Network tab for failed requests

## Common Issues & Solutions

### Issue: "This site can't be reached"
**Solution:** DNS not configured or still propagating
- Wait 15-60 minutes after adding DNS record
- Verify DNS at dnschecker.org

### Issue: "Invalid redirect URI" error
**Solution:** Azure AD redirect URI doesn't match
- Add `https://job.floorinteriorservices.com/api/auth/callback/azure-ad` to Azure AD

### Issue: Page loads but shows wrong domain
**Solution:** `NEXTAUTH_URL` environment variable is wrong
- Update `NEXTAUTH_URL` to `https://job.floorinteriorservices.com` in Vercel
- Redeploy the application

### Issue: "404 Not Found" or blank page
**Solution:** Route might not be deployed
- Check Vercel deployment logs
- Verify the route `/property` exists in your codebase
- Redeploy if needed

## Quick Checklist

- [ ] Domain `job.floorinteriorservices.com` added in Vercel (Settings → Domains)
- [ ] DNS CNAME record configured correctly
- [ ] DNS propagated (check at dnschecker.org)
- [ ] `NEXTAUTH_URL` = `https://job.floorinteriorservices.com` (Production)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://job.floorinteriorservices.com` (Production)
- [ ] Azure AD redirect URI includes: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
- [ ] Application redeployed after environment variable changes
- [ ] Browser cache cleared

## Still Not Working?

If after checking all the above it still doesn't work:

1. **Check Vercel deployment logs:**
   - Go to **Deployments** → Latest deployment → **Logs**
   - Look for any errors

2. **Test the Vercel URL directly:**
   - Try: `https://floor-interior-service-six.vercel.app/property`
   - If this works, the issue is with the custom domain configuration
   - If this doesn't work, the issue is with the code/deployment

3. **Contact Support:**
   - Share the exact error message you see
   - Share screenshots of Vercel domain settings
   - Share DNS configuration
