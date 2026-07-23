# Verify DNS and Next Steps for job.floorinteriorservices.com

You've added the DNS record! Now let's verify it's working and complete the setup.

## ✅ Step 1: Verify DNS Record Was Added Correctly

### Check in Your DNS Provider

Go back to your DNS provider (GoDaddy, Cloudflare, etc.) and verify:

- [ ] **Type:** `CNAME` (not A record)
- [ ] **Name:** `job` (only "job", not the full domain)
- [ ] **Value:** Matches exactly what Vercel showed you
- [ ] **Record is saved** and visible in your DNS records list

### Common Issues to Check:

❌ **If Name is wrong:**
- Should be: `job`
- NOT: `job.floorinteriorservices.com`
- NOT: `job.floorinteriorservices.com.`

❌ **If Type is wrong:**
- Should be: `CNAME`
- NOT: `A` record

---

## ⏳ Step 2: Wait for DNS Propagation

DNS changes take time to propagate across the internet:

- **Cloudflare:** 1-5 minutes
- **GoDaddy:** 15-60 minutes  
- **Namecheap:** 15-60 minutes
- **Other providers:** 15-60 minutes

### Check DNS Propagation Status:

1. Visit: **https://dnschecker.org**
2. Enter: `job.floorinteriorservices.com`
3. Select: `CNAME` record type
4. Click **"Search"**
5. Look for **green checkmarks** across different locations

**What you're looking for:**
- ✅ Green checkmarks = DNS is propagating correctly
- ⏳ Red X's = Still propagating (wait longer)
- If you see mostly green checkmarks, DNS is ready!

---

## ✅ Step 3: Verify Domain in Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select your project: **floor-interior-service**

2. **Check Domain Status:**
   - Go to: **Settings** → **Domains**
   - Find `job.floorinteriorservices.com` in the list

3. **Check the Status:**
   - ⏳ **Pending** = DNS still propagating (wait 15-60 minutes, then check again)
   - ✅ **Valid** = Domain is ready! (green checkmark) → **Proceed to Step 4**
   - ❌ **Invalid** = DNS record issue (see troubleshooting below)

4. **Wait for SSL Certificate:**
   - After status shows "Valid", wait 1-5 minutes
   - You'll see a green lock icon (🔒) when SSL is ready
   - This means HTTPS is working

---

## 🔧 Step 4: Update Environment Variables (After Domain is Valid)

**⚠️ Only do this AFTER the domain shows "Valid" ✅ in Vercel!**

1. **Go to Vercel:**
   - Settings → **Environment Variables**

2. **Update `NEXTAUTH_URL`:**
   - Find `NEXTAUTH_URL` in the list
   - Click **Edit** (or **Add** if it doesn't exist)
   - **Value:** `https://job.floorinteriorservices.com`
   - **Environment:** Select **Production** ✅
   - Click **Save**

3. **Update `NEXT_PUBLIC_APP_URL`:**
   - Find `NEXT_PUBLIC_APP_URL` in the list
   - Click **Edit** (or **Add** if it doesn't exist)
   - **Value:** `https://job.floorinteriorservices.com`
   - **Environment:** Select **Production** ✅
   - Click **Save**

**Important:** Make sure both variables are set for **Production** environment!

---

## 🔐 Step 5: Update Azure AD Redirect URI (If Using Azure AD)

If you're using Azure AD for authentication:

1. **Go to Azure Portal:**
   - https://portal.azure.com
   - Sign in

2. **Navigate to Your App:**
   - Azure Active Directory → **App registrations**
   - Find your app (search for "FIS" or your app name)

3. **Add Redirect URI:**
   - Click **Authentication** (left menu)
   - Scroll to **Redirect URIs** section
   - Click **"Add URI"** or **"Add a platform"** → **Web**
   - Enter: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`
   - Click **Save**

4. **Keep Local Development URI:**
   - Keep: `http://localhost:3000/api/auth/callback/azure-ad` (for local dev)

---

## 🚀 Step 6: Redeploy Your Application

After updating environment variables, Vercel will automatically redeploy. But you can also:

1. **Check Deployments:**
   - Go to **Deployments** tab in Vercel
   - You should see a new deployment starting automatically
   - Wait for it to complete (usually 2-5 minutes)

2. **Or Manually Redeploy:**
   - Click **"Redeploy"** on the latest deployment
   - Or push a commit to GitHub (auto-deploys)

---

## ✅ Step 7: Test Your Subdomain

1. **Visit your subdomain:**
   - Go to: `https://job.floorinteriorservices.com`
   - Should load your application

2. **Check HTTPS:**
   - URL should show `https://` (not `http://`)
   - Browser should show a green lock icon (🔒)
   - No security warnings

3. **Test Authentication:**
   - Try signing in
   - Should redirect properly with Azure AD (if using)

4. **Test All Features:**
   - Test the interview flow
   - Test email sending
   - Test dashboard access

---

## 🐛 Troubleshooting

### Domain Still Shows "Pending" in Vercel

**Wait longer:**
- DNS can take up to 48 hours (usually 15-60 minutes)
- Check DNS propagation at https://dnschecker.org
- If you see green checkmarks at dnschecker.org, DNS is working - just wait for Vercel to detect it

**Check DNS record:**
- Log back into your DNS provider
- Verify the CNAME record is saved correctly
- Verify the Name is just `job` (not the full domain)
- Verify the Value matches what Vercel showed

### Domain Shows "Invalid" in Vercel

**Check DNS record:**
1. Verify you added a **CNAME** record (not A record)
2. Verify the **Name** is just `job` (not `job.floorinteriorservices.com`)
3. Verify the **Value** matches exactly what Vercel shows
4. Check for typos

**Check DNS propagation:**
- Visit https://dnschecker.org
- Enter `job.floorinteriorservices.com`
- Select `CNAME` record type
- If you don't see green checkmarks, DNS hasn't propagated yet

**Common mistakes:**
- ❌ Wrong record type (A instead of CNAME)
- ❌ Wrong name (full domain instead of just "job")
- ❌ Wrong value (not matching Vercel's value)
- ❌ Cloudflare proxy enabled (should be DNS only - gray cloud)

### SSL Certificate Not Working

1. **Wait 5-10 minutes** after domain shows "Valid"
2. **Check Vercel Domains page** - should show green lock icon
3. **Clear browser cache** and try again
4. **Try in incognito/private window**

### App Not Loading on Subdomain

1. **Check Environment Variables:**
   - Make sure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` are updated
   - Make sure they're set for **Production** environment
   - Redeploy after updating

2. **Check Vercel Deployment:**
   - Make sure latest deployment is successful
   - Check deployment logs for errors

3. **Test Old Domain:**
   - Old Vercel domain should still work
   - If it works, issue is with DNS/domain config
   - If it doesn't, issue is with the app

---

## 📋 Quick Checklist

Use this checklist to track your progress:

- [ ] DNS record added in DNS provider (CNAME, Name: `job`, correct Value)
- [ ] Waited 15-60 minutes for DNS propagation
- [ ] Checked DNS propagation at https://dnschecker.org (green checkmarks)
- [ ] Domain shows "Valid" ✅ in Vercel (Settings → Domains)
- [ ] SSL certificate is active (green lock icon in Vercel)
- [ ] Updated `NEXTAUTH_URL` to `https://job.floorinteriorservices.com` (Production)
- [ ] Updated `NEXT_PUBLIC_APP_URL` to `https://job.floorinteriorservices.com` (Production)
- [ ] Updated Azure AD redirect URI (if using Azure AD)
- [ ] Redeployed application (automatic or manual)
- [ ] Tested subdomain: `https://job.floorinteriorservices.com`
- [ ] Verified HTTPS is working (green lock icon)
- [ ] Tested authentication flow
- [ ] Tested all app features

---

## 🎯 Current Status

**What to do right now:**

1. **Check DNS Propagation:**
   - Go to: https://dnschecker.org
   - Enter: `job.floorinteriorservices.com`
   - Select: `CNAME`
   - See if you get green checkmarks

2. **Check Vercel Domain Status:**
   - Go to: Vercel Dashboard → Settings → Domains
   - Check if `job.floorinteriorservices.com` shows "Valid" ✅

3. **If Status is "Pending":**
   - Wait 15-60 minutes
   - Check again
   - DNS propagation takes time

4. **If Status is "Valid":**
   - Proceed to update environment variables (Step 4)
   - Then update Azure AD (Step 5)
   - Then redeploy (Step 6)

---

## 💡 Pro Tips

- **Keep the old Vercel domain** - it will continue to work as a backup
- **DNS changes can take up to 48 hours** - be patient
- **Use dnschecker.org** to verify DNS propagation globally
- **Test in incognito mode** to avoid browser cache issues
- **Keep both domains** in Azure AD redirect URIs during transition

---

Once your domain shows "Valid" in Vercel and you've updated the environment variables, your app will be accessible at `https://job.floorinteriorservices.com`! 🎉
