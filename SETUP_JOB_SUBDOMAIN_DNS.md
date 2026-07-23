# Setup DNS for job.floorinteriorservices.com

This guide will help you set up the subdomain `job.floorinteriorservices.com` to point to your Vercel deployment.

## Prerequisites

- ✅ Your app is deployed on Vercel
- ✅ You own the domain `floorinteriorservices.com`
- ✅ Access to your domain's DNS settings (GoDaddy, Cloudflare, Namecheap, etc.)

## Step-by-Step Instructions

### Step 1: Add Domain in Vercel

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: **floor-interior-service**

2. **Navigate to Domain Settings:**
   - Click **Settings** (top menu)
   - Click **Domains** (left sidebar)

3. **Add Your Subdomain:**
   - Click **"Add Domain"** button
   - Enter: `job.floorinteriorservices.com`
   - ⚠️ **Important:** Don't include `http://` or `https://` - just the domain name
   - Click **"Add"**

4. **Copy the CNAME Value:**
   - Vercel will show you a CNAME record to add
   - It will look something like: `cname.vercel-dns.com` or `76.76.21.21`
   - **Copy this exact value** - you'll need it in the next step
   - ⚠️ **Note:** The value might be different - use exactly what Vercel shows you

### Step 2: Add CNAME Record in Your DNS Provider

Now you need to add a CNAME record in your domain's DNS settings. The exact steps depend on your DNS provider.

---

## Instructions by DNS Provider

### Option A: GoDaddy

1. **Log in to GoDaddy:**
   - Go to: https://www.godaddy.com
   - Sign in to your account

2. **Navigate to DNS Management:**
   - Click **"My Products"** (top menu)
   - Find `floorinteriorservices.com` in the list
   - Click the **three dots (⋯)** next to your domain
   - Click **"DNS"** from the dropdown

   **OR**

   - Click directly on your domain name
   - Scroll to the **"DNS"** section
   - Click **"Manage DNS"**

3. **Add CNAME Record:**
   - Scroll down to the **"Records"** section
   - Click the **"Add"** button
   - Fill in the form:
     - **Type:** Select `CNAME` from the dropdown
     - **Name:** Enter `job`
       - ⚠️ **Important:** Only enter `job`, NOT `job.floorinteriorservices.com`
     - **Value:** Paste the CNAME value from Vercel
       - Example: `cname.vercel-dns.com` (use the exact value Vercel shows)
     - **TTL:** Select `600 seconds` (or leave default)
   - Click **"Save"**

**What it should look like:**
```
Type: CNAME
Name: job
Value: cname.vercel-dns.com (or whatever Vercel shows)
TTL: 600 seconds
```

---

### Option B: Cloudflare

1. **Log in to Cloudflare:**
   - Go to: https://dash.cloudflare.com
   - Sign in to your account

2. **Select Your Domain:**
   - Click on `floorinteriorservices.com` from your domain list

3. **Go to DNS Settings:**
   - Click **"DNS"** in the left sidebar
   - Click **"Records"** tab

4. **Add CNAME Record:**
   - Click **"Add record"** button
   - Fill in the form:
     - **Type:** Select `CNAME`
     - **Name:** Enter `job`
       - ⚠️ **Important:** Only enter `job`, NOT `job.floorinteriorservices.com`
     - **Target:** Paste the CNAME value from Vercel
       - Example: `cname.vercel-dns.com` (use the exact value Vercel shows)
     - **Proxy status:** Click the cloud icon to set it to **DNS only** (gray cloud)
       - ⚠️ **Important:** Must be gray (DNS only), NOT orange (proxied)
     - **TTL:** Auto
   - Click **"Save"**

**What it should look like:**
```
Type: CNAME
Name: job
Target: cname.vercel-dns.com (or whatever Vercel shows)
Proxy: DNS only (gray cloud)
TTL: Auto
```

---

### Option C: Namecheap

1. **Log in to Namecheap:**
   - Go to: https://www.namecheap.com
   - Sign in to your account

2. **Navigate to DNS Management:**
   - Click **"Domain List"** (top menu)
   - Find `floorinteriorservices.com`
   - Click **"Manage"** button

3. **Go to Advanced DNS:**
   - Click **"Advanced DNS"** tab

4. **Add CNAME Record:**
   - Scroll to **"Host Records"** section
   - Click **"Add New Record"** button
   - Fill in the form:
     - **Type:** Select `CNAME Record`
     - **Host:** Enter `job`
       - ⚠️ **Important:** Only enter `job`, NOT `job.floorinteriorservices.com`
     - **Value:** Paste the CNAME value from Vercel
       - Example: `cname.vercel-dns.com` (use the exact value Vercel shows)
     - **TTL:** Select `Automatic` (or `30 min`)
   - Click **"Save All Changes"** (green checkmark icon)

**What it should look like:**
```
Type: CNAME Record
Host: job
Value: cname.vercel-dns.com (or whatever Vercel shows)
TTL: Automatic
```

---

### Option D: Google Domains / Google Workspace

1. **Log in to Google Domains:**
   - Go to: https://domains.google.com
   - Sign in to your account

2. **Select Your Domain:**
   - Click on `floorinteriorservices.com`

3. **Go to DNS Settings:**
   - Click **"DNS"** in the left sidebar

4. **Add CNAME Record:**
   - Scroll to **"Custom resource records"** section
   - Click **"Add custom record"**
   - Fill in the form:
     - **Name:** Enter `job`
       - ⚠️ **Important:** Only enter `job`, NOT `job.floorinteriorservices.com`
     - **Type:** Select `CNAME`
     - **Data:** Paste the CNAME value from Vercel
       - Example: `cname.vercel-dns.com` (use the exact value Vercel shows)
     - **TTL:** `3600` (or leave default)
   - Click **"Add"**

---

### Option E: AWS Route 53

1. **Log in to AWS Console:**
   - Go to: https://console.aws.amazon.com
   - Sign in to your account

2. **Navigate to Route 53:**
   - Search for "Route 53" in the search bar
   - Click **"Route 53"**

3. **Select Hosted Zone:**
   - Click **"Hosted zones"** in the left sidebar
   - Click on `floorinteriorservices.com`

4. **Create CNAME Record:**
   - Click **"Create record"** button
   - Fill in the form:
     - **Record name:** Enter `job`
       - ⚠️ **Important:** Only enter `job`, NOT `job.floorinteriorservices.com`
     - **Record type:** Select `CNAME - Routes traffic to another domain name`
     - **Value:** Paste the CNAME value from Vercel
       - Example: `cname.vercel-dns.com` (use the exact value Vercel shows)
     - **TTL:** `300` (or leave default)
   - Click **"Create records"**

---

## Step 3: Wait for DNS Propagation

After adding the CNAME record, you need to wait for DNS propagation:

- **Cloudflare:** 1-5 minutes
- **GoDaddy:** 15-60 minutes
- **Namecheap:** 15-60 minutes
- **Google Domains:** 5-30 minutes
- **Route 53:** 1-5 minutes
- **Other providers:** 15-60 minutes

**Check DNS Propagation:**
1. Visit: https://dnschecker.org
2. Enter: `job.floorinteriorservices.com`
3. Select: `CNAME` record type
4. Click **"Search"**
5. Check if the record is visible globally (green checkmarks)

---

## Step 4: Verify Domain in Vercel

1. **Go back to Vercel:**
   - Settings → Domains
   - Find `job.floorinteriorservices.com` in the list

2. **Check Status:**
   - ⏳ **Pending** = DNS still propagating (wait longer, check dnschecker.org)
   - ✅ **Valid** = Domain is ready! (green checkmark)
   - ❌ **Invalid** = Check DNS records again (see troubleshooting below)

3. **SSL Certificate:**
   - Vercel automatically provisions SSL certificates (HTTPS)
   - This usually takes 1-5 minutes after DNS is valid
   - You'll see a green lock icon when ready

---

## Step 5: Update Environment Variables

Once your domain shows **Valid** ✅ in Vercel:

1. **Go to Vercel:**
   - Settings → **Environment Variables**

2. **Update `NEXTAUTH_URL`:**
   - **Old:** `https://floor-interior-service.vercel.app`
   - **New:** `https://job.floorinteriorservices.com`
   - Make sure **Production** environment is selected ✅
   - Click **Save**

3. **Update `NEXT_PUBLIC_APP_URL`:**
   - **Old:** `https://floor-interior-service.vercel.app`
   - **New:** `https://job.floorinteriorservices.com`
   - Make sure **Production** environment is selected ✅
   - Click **Save**

---

## Step 6: Update Azure AD Redirect URI (If Using Azure AD)

If you're using Azure AD authentication:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Azure Active Directory → App registrations
   - Find your app

2. **Update Redirect URI:**
   - Go to **Authentication** → **Redirect URIs**
   - **Add** new redirect URI:
     ```
     https://job.floorinteriorservices.com/api/auth/callback/azure-ad
     ```
   - Click **Save**

3. **Keep Local Development URI:**
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local dev)

---

## Step 7: Redeploy Your Application

After updating environment variables:

1. **Option A: Automatic Redeploy**
   - Vercel will automatically redeploy when you save environment variables
   - Wait for deployment to complete (check Deployments tab)

2. **Option B: Manual Redeploy**
   - Go to **Deployments** tab
   - Click **"Redeploy"** on the latest deployment
   - Or push a commit to GitHub (auto-deploys)

---

## Step 8: Test Your Subdomain

1. **Visit your subdomain:**
   - Go to: `https://job.floorinteriorservices.com`
   - Should load your application

2. **Test HTTPS:**
   - Make sure you see a green lock icon (SSL certificate working)
   - URL should show `https://` (not `http://`)

3. **Test Authentication:**
   - Try signing in
   - Should redirect properly with Azure AD

4. **Test All Features:**
   - Test the interview flow
   - Test email sending
   - Test dashboard access

---

## Common Mistakes to Avoid

### ❌ Wrong Record Name

**Wrong:**
- Name: `job.floorinteriorservices.com` ❌
- Name: `job.floorinteriorservices.com.` ❌

**Correct:**
- Name: `job` ✅

### ❌ Wrong Record Type

**Wrong:**
- Type: `A` (for subdomain) ❌
- Type: `TXT` ❌

**Correct:**
- Type: `CNAME` ✅

### ❌ Wrong Value

**Wrong:**
- Value: `https://cname.vercel-dns.com` ❌
- Value: `floor-interior-service.vercel.app` ❌

**Correct:**
- Value: `cname.vercel-dns.com` (exact value from Vercel) ✅

### ❌ Cloudflare Proxy Enabled

**Wrong:**
- Proxy status: Proxied (orange cloud) ❌

**Correct:**
- Proxy status: DNS only (gray cloud) ✅

---

## Troubleshooting

### Domain Shows "Invalid" in Vercel

1. **Check DNS Record:**
   - Verify you added a **CNAME** record (not A record)
   - Verify the **Name** is just `job` (not `job.floorinteriorservices.com`)
   - Verify the **Value** matches exactly what Vercel shows

2. **Check DNS Propagation:**
   - Visit https://dnschecker.org
   - Enter `job.floorinteriorservices.com`
   - Select `CNAME` record type
   - Check if it's visible globally
   - If not visible, wait longer (can take up to 48 hours)

3. **Double-Check in DNS Provider:**
   - Log back into your DNS provider
   - Verify the record is saved correctly
   - Check for typos

### SSL Certificate Not Working

1. **Wait 5-10 minutes** after DNS is valid
2. **Check Vercel Domains page** - should show green lock icon
3. **Clear browser cache** and try again
4. **Check browser console** for SSL errors

### App Not Loading on Subdomain

1. **Check Environment Variables:**
   - Make sure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` are updated to `https://job.floorinteriorservices.com`
   - Redeploy after updating

2. **Check Vercel Deployment:**
   - Make sure latest deployment is successful
   - Check deployment logs for errors

3. **Test Old Domain:**
   - Old Vercel domain (`floor-interior-service.vercel.app`) should still work
   - If it works, issue is with DNS/domain config
   - If it doesn't, issue is with the app

### DNS Propagation Taking Too Long

1. **Check DNS Provider:**
   - Some providers have longer propagation times
   - Cloudflare is usually fastest (1-5 minutes)
   - GoDaddy/Namecheap can take 15-60 minutes

2. **Flush DNS Cache (Local):**
   - **Windows:** Open Command Prompt, run: `ipconfig /flushdns`
   - **Mac:** Open Terminal, run: `sudo dscacheutil -flushcache`
   - **Linux:** Run: `sudo systemd-resolve --flush-caches`

3. **Use Different DNS Server:**
   - Try using Google DNS (8.8.8.8) or Cloudflare DNS (1.1.1.1)
   - Or use a VPN to test from different location

---

## Quick Checklist

- [ ] Added `job.floorinteriorservices.com` in Vercel (Settings → Domains)
- [ ] Copied CNAME value from Vercel
- [ ] Added CNAME record in DNS provider:
  - [ ] Type: `CNAME`
  - [ ] Name: `job` (NOT `job.floorinteriorservices.com`)
  - [ ] Value: Exact value from Vercel
  - [ ] Saved the record
- [ ] Waited for DNS propagation (15-60 minutes)
- [ ] Checked DNS propagation at https://dnschecker.org
- [ ] Domain shows "Valid" ✅ in Vercel
- [ ] SSL certificate is active (green lock icon)
- [ ] Updated `NEXTAUTH_URL` to `https://job.floorinteriorservices.com`
- [ ] Updated `NEXT_PUBLIC_APP_URL` to `https://job.floorinteriorservices.com`
- [ ] Updated Azure AD redirect URI (if using Azure AD)
- [ ] Redeployed application
- [ ] Tested subdomain in browser: `https://job.floorinteriorservices.com`
- [ ] Tested authentication flow
- [ ] Verified HTTPS is working

---

## Example Configuration Summary

**Subdomain:** `job.floorinteriorservices.com`

**DNS Record:**
```
Type: CNAME
Name: job
Value: cname.vercel-dns.com (or whatever Vercel shows)
TTL: 600 seconds (or Auto)
```

**Vercel Environment Variables:**
```
NEXTAUTH_URL=https://job.floorinteriorservices.com
NEXT_PUBLIC_APP_URL=https://job.floorinteriorservices.com
```

**Azure AD Redirect URI:**
```
https://job.floorinteriorservices.com/api/auth/callback/azure-ad
```

---

## After Setup

Once your subdomain is working:

1. **Update any external links** that point to the old Vercel domain
2. **Update documentation** with the new subdomain
3. **Test all features** to ensure everything works
4. **Keep the old Vercel domain** - it will continue to work as a backup

Your app is now accessible at `https://job.floorinteriorservices.com`! 🎉
