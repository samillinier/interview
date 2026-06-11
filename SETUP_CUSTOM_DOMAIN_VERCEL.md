# How to Use Your Own Custom Domain with Vercel

This guide will help you replace the Vercel domain (`https://floor-interior-service.vercel.app/`) with your own custom domain (e.g., `https://yourdomain.com` or `https://app.yourdomain.com`).

## Prerequisites

- ✅ Your app is already deployed on Vercel
- ✅ You own a domain name (e.g., `yourdomain.com`)
- ✅ Access to your domain's DNS settings (wherever you bought it - GoDaddy, Namecheap, Cloudflare, etc.)

## Step-by-Step Guide

### Step 1: Add Custom Domain in Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: **floor-interior-service**

2. **Navigate to Domain Settings:**
   - Click on **Settings** (top menu)
   - Click on **Domains** (left sidebar)

3. **Add Your Domain:**
   - Click **"Add Domain"** button
   - Enter your domain name:
     - **Option A:** Root domain: `yourdomain.com`
     - **Option B:** Subdomain: `app.yourdomain.com` or `recruiting.yourdomain.com` (recommended)
   - Click **"Add"**

4. **Choose Domain Type:**
   - Vercel will detect if you want to use:
     - **Root domain** (`yourdomain.com`) - requires both A and CNAME records
     - **Subdomain** (`app.yourdomain.com`) - only needs CNAME record (easier!)

### Step 2: Configure DNS Records

Vercel will show you the exact DNS records you need to add. The instructions depend on whether you're using a root domain or subdomain.

#### Option A: Using a Subdomain (Easier - Recommended)

If you're using `app.yourdomain.com` or similar:

1. **Copy the CNAME record from Vercel:**
   - It will look like: `cname.vercel-dns.com` or similar
   - Vercel will show you the exact value

2. **Add CNAME Record in Your DNS Provider:**

   **For Cloudflare:**
   - Go to DNS → Records
   - Click **"Add record"**
   - **Type:** `CNAME`
   - **Name:** `app` (or your subdomain name)
   - **Target:** `cname.vercel-dns.com` (use the value from Vercel)
   - **Proxy status:** DNS only (gray cloud) - **Important!**
   - Click **Save**

   **For GoDaddy:**
   - Go to My Products → DNS
   - Click **"Add"**
   - **Type:** `CNAME`
   - **Name:** `app` (or your subdomain name)
   - **Value:** `cname.vercel-dns.com` (use the value from Vercel)
   - **TTL:** Auto
   - Click **Save**

   **For Namecheap:**
   - Go to Domain List → Manage → Advanced DNS
   - Click **"Add New Record"**
   - **Type:** `CNAME Record`
   - **Host:** `app` (or your subdomain name)
   - **Value:** `cname.vercel-dns.com` (use the value from Vercel)
   - Click **Save**

#### Option B: Using Root Domain (More Complex)

If you're using `yourdomain.com` directly:

1. **Vercel will show you TWO records:**
   - An **A record** pointing to an IP address
   - A **CNAME record** for `www` subdomain

2. **Add Both Records:**
   - Add the A record for the root domain
   - Add the CNAME record for `www.yourdomain.com`

### Step 3: Wait for DNS Propagation

- **Cloudflare:** 1-5 minutes
- **GoDaddy:** 15-60 minutes
- **Namecheap:** 15-60 minutes
- **Other providers:** 15-60 minutes

**Check DNS propagation:**
- Visit: https://dnschecker.org
- Enter your domain
- Select `CNAME` or `A` record type
- Check if it's visible globally

### Step 4: Verify Domain in Vercel

1. **Go back to Vercel:**
   - Settings → Domains
   - Find your domain in the list

2. **Check Status:**
   - ⏳ **Pending** = DNS still propagating (wait longer)
   - ✅ **Valid** = Domain is ready! (usually shows a green checkmark)
   - ❌ **Invalid** = Check DNS records again

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates (HTTPS)
   - This usually takes 1-5 minutes after DNS is valid
   - You'll see a green lock icon when ready

### Step 5: Update Environment Variables

Once your domain is **Valid** ✅ in Vercel:

1. **Go to Vercel:**
   - Settings → **Environment Variables**

2. **Update These Variables:**

   **Update `NEXTAUTH_URL`:**
   - **Old:** `https://floor-interior-service.vercel.app`
   - **New:** `https://yourdomain.com` (or `https://app.yourdomain.com`)
   - Make sure **Production** environment is selected ✅
   - Click **Save**

   **Update `NEXT_PUBLIC_APP_URL`:**
   - **Old:** `https://floor-interior-service.vercel.app`
   - **New:** `https://yourdomain.com` (or `https://app.yourdomain.com`)
   - Make sure **Production** environment is selected ✅
   - Click **Save**

3. **Keep Other Variables:**
   - Don't change `DATABASE_URL`, `OPENAI_API_KEY`, etc.
   - Only update the URL-related variables

### Step 6: Update Azure AD Redirect URI (If Using Azure AD)

If you're using Azure AD authentication:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Azure Active Directory → App registrations
   - Find your app

2. **Update Redirect URI:**
   - Go to **Authentication** → **Redirect URIs**
   - **Remove** the old Vercel domain redirect URI (optional, you can keep it)
   - **Add** new redirect URI:
     ```
     https://yourdomain.com/api/auth/callback/azure-ad
     ```
     (or `https://app.yourdomain.com/api/auth/callback/azure-ad` if using subdomain)
   - Click **Save**

3. **Keep Local Development URI:**
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local dev)

### Step 7: Redeploy Your Application

After updating environment variables:

1. **Option A: Automatic Redeploy**
   - Vercel will automatically redeploy when you save environment variables
   - Wait for deployment to complete (check Deployments tab)

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a commit to GitHub (auto-deploys)

### Step 8: Test Your Custom Domain

1. **Visit your custom domain:**
   - Go to: `https://yourdomain.com` (or your subdomain)
   - Should load your application

2. **Test Authentication:**
   - Try signing in
   - Should redirect properly with Azure AD

3. **Check HTTPS:**
   - Make sure you see a green lock icon (SSL certificate working)

4. **Test All Features:**
   - Test the interview flow
   - Test email sending
   - Test dashboard access

## Example Configuration

If your domain is `floorinteriorservices.com` and you want to use `app.floorinteriorservices.com`:

**DNS Record:**
- **Type:** `CNAME`
- **Name:** `app`
- **Value:** `cname.vercel-dns.com` (from Vercel)

**Vercel Environment Variables:**
```
NEXTAUTH_URL=https://app.floorinteriorservices.com
NEXT_PUBLIC_APP_URL=https://app.floorinteriorservices.com
```

**Azure AD Redirect URI:**
```
https://app.floorinteriorservices.com/api/auth/callback/azure-ad
```

## Important Notes

### Using Root Domain vs Subdomain

- **Subdomain (Recommended):**
  - ✅ Easier to set up (only CNAME record)
  - ✅ Can use root domain for main website
  - ✅ Example: `app.yourdomain.com`, `dashboard.yourdomain.com`

- **Root Domain:**
  - ⚠️ Requires A record (more complex)
  - ⚠️ Can't use for main website if pointing to Vercel
  - ✅ Example: `yourdomain.com`

### SSL Certificates

- Vercel automatically provides SSL certificates (HTTPS)
- No additional configuration needed
- Certificate is issued by Let's Encrypt
- Usually takes 1-5 minutes after DNS is valid

### DNS Propagation

- DNS changes can take up to 48 hours (usually 15-60 minutes)
- Use https://dnschecker.org to check propagation status
- Vercel will show "Valid" when DNS is ready

### Multiple Domains

- You can add multiple domains in Vercel
- Both will work (e.g., `app.yourdomain.com` and `www.yourdomain.com`)
- All domains get SSL certificates automatically

## Troubleshooting

### Domain Shows "Invalid" in Vercel

1. **Check DNS Records:**
   - Make sure you added the correct record type (CNAME or A)
   - Verify the value matches exactly what Vercel shows
   - Check for typos in the domain name

2. **Wait Longer:**
   - DNS can take up to 48 hours (usually 15-60 minutes)
   - Check propagation at https://dnschecker.org

3. **Verify Record Names:**
   - For subdomain: Use `app` (not `app.yourdomain.com`)
   - For root: Use `@` or leave blank (depends on provider)

### SSL Certificate Not Working

1. **Wait 5-10 minutes** after DNS is valid
2. **Check Vercel Domains page** - should show green lock icon
3. **Clear browser cache** and try again
4. **Check browser console** for SSL errors

### App Not Loading on Custom Domain

1. **Check Environment Variables:**
   - Make sure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` are updated
   - Redeploy after updating

2. **Check Vercel Deployment:**
   - Make sure latest deployment is successful
   - Check deployment logs for errors

3. **Test Old Domain:**
   - Old Vercel domain should still work
   - If it works, issue is with DNS/domain config
   - If it doesn't, issue is with the app

### Azure AD Redirect Not Working

1. **Verify Redirect URI:**
   - Must match exactly (case-sensitive, no trailing slash)
   - Format: `https://yourdomain.com/api/auth/callback/azure-ad`

2. **Check Environment Variables:**
   - `NEXTAUTH_URL` must match your custom domain
   - Redeploy after updating

3. **Wait 2-3 minutes** after updating Azure AD settings

## Quick Checklist

- [ ] Added custom domain in Vercel (Settings → Domains)
- [ ] Added DNS record (CNAME or A) in domain provider
- [ ] Waited for DNS propagation (15-60 minutes)
- [ ] Domain shows "Valid" ✅ in Vercel
- [ ] SSL certificate is active (green lock icon)
- [ ] Updated `NEXTAUTH_URL` in Vercel environment variables
- [ ] Updated `NEXT_PUBLIC_APP_URL` in Vercel environment variables
- [ ] Updated Azure AD redirect URI (if using Azure AD)
- [ ] Redeployed application
- [ ] Tested custom domain in browser
- [ ] Tested authentication flow
- [ ] Verified HTTPS is working

## After Setup

Once your custom domain is working:

1. **Update any external links** that point to the old Vercel domain
2. **Update documentation** with the new domain
3. **Test all features** to ensure everything works
4. **Keep the old Vercel domain** - it will continue to work as a backup

Your app is now accessible at your custom domain! 🎉
