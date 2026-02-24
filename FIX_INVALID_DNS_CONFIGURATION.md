# Fix Invalid DNS Configuration for job.floorinteriorservices.com

Your Vercel dashboard shows "Invalid Configuration" for `job.floorinteriorservices.com`. Here's how to fix it.

## ✅ Exact DNS Record You Need to Add

Based on your Vercel dashboard, you need to add this **exact** CNAME record:

```
Type: CNAME
Name: job
Value: ff2e8b2cfc72d9ec.vercel-dns-017.com.
```

⚠️ **Important Notes:**
- The Value ends with a **dot (.)** - make sure to include it!
- The Name is just `job` (not `job.floorinteriorservices.com`)
- Type must be `CNAME` (not A record)

---

## 🔍 Step 1: Verify Your DNS Record

Go to your DNS provider and check if the CNAME record matches **exactly**:

### What to Check:

1. **Type:** Should be `CNAME` ✅
2. **Name:** Should be `job` (only "job", nothing else) ✅
3. **Value:** Should be `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot at the end!) ✅

### Common Mistakes:

❌ **Wrong Value:**
- `ff2e8b2cfc72d9ec.vercel-dns-017.com` (missing the dot at the end)
- `cname.vercel-dns.com` (old value, not the new one)
- `76.76.21.21` (IP address, wrong type)

✅ **Correct Value:**
- `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot!)

❌ **Wrong Name:**
- `job.floorinteriorservices.com` (too long)
- `job.floorinteriorservices.com.` (too long with dot)

✅ **Correct Name:**
- `job` (just "job")

---

## 🔧 Step 2: Fix the DNS Record (If Wrong)

If your DNS record doesn't match exactly, fix it:

### For GoDaddy:

1. Go to **My Products** → **DNS**
2. Find the CNAME record for `job`
3. Click **Edit** (or delete and recreate)
4. Update:
   - **Type:** `CNAME`
   - **Name:** `job`
   - **Value:** `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot!)
   - **TTL:** Auto or 600 seconds
5. Click **Save**

### For Cloudflare:

1. Go to **DNS** → **Records**
2. Find the CNAME record for `job`
3. Click **Edit**
4. Update:
   - **Type:** `CNAME`
   - **Name:** `job`
   - **Target:** `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot!)
   - **Proxy status:** DNS only (gray cloud)
5. Click **Save**

### For Namecheap:

1. Go to **Domain List** → **Manage** → **Advanced DNS**
2. Find the CNAME record for `job`
3. Click **Edit**
4. Update:
   - **Type:** `CNAME Record`
   - **Host:** `job`
   - **Value:** `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot!)
5. Click **Save All Changes**

---

## ⏳ Step 3: Wait for DNS Propagation

After fixing the DNS record:

1. **Wait 15-60 minutes** for DNS to propagate
   - Cloudflare: 1-5 minutes
   - GoDaddy: 15-60 minutes
   - Namecheap: 15-60 minutes

2. **Check DNS Propagation:**
   - Visit: https://dnschecker.org
   - Enter: `job.floorinteriorservices.com`
   - Select: `CNAME` record type
   - Click **"Search"**
   - Look for green checkmarks across locations

3. **Verify the Value:**
   - The CNAME should resolve to: `ff2e8b2cfc72d9ec.vercel-dns-017.com.`
   - If you see the old value (`cname.vercel-dns.com`), DNS hasn't updated yet

---

## ✅ Step 4: Check Vercel Domain Status

After waiting 15-60 minutes:

1. **Go to Vercel Dashboard:**
   - Settings → **Domains**
   - Find `job.floorinteriorservices.com`

2. **Check Status:**
   - ⏳ **Pending** = Still propagating (wait longer)
   - ✅ **Valid** = Success! Domain is ready!
   - ❌ **Invalid Configuration** = DNS record still doesn't match (check again)

3. **If Still Invalid:**
   - Double-check the DNS record value matches exactly
   - Make sure the dot (.) is at the end of the value
   - Verify the Name is just `job`
   - Check DNS propagation at dnschecker.org

---

## 📝 About the New DNS Value

Vercel is using a new DNS format as part of an IP range expansion:
- **New value:** `ff2e8b2cfc72d9ec.vercel-dns-017.com.`
- **Old values:** `cname.vercel-dns.com` or `76.76.21.21` (these won't work anymore)

Make sure you're using the **new value** shown in your Vercel dashboard!

---

## 🐛 Troubleshooting

### Still Shows "Invalid Configuration" After 1 Hour

1. **Verify DNS Record:**
   - Log into your DNS provider
   - Check the exact value matches: `ff2e8b2cfc72d9ec.vercel-dns-017.com.`
   - Make sure there's a dot (.) at the end
   - Verify Name is just `job`

2. **Check DNS Propagation:**
   - Use https://dnschecker.org
   - Enter `job.floorinteriorservices.com`
   - Select `CNAME`
   - Verify it shows the correct value globally

3. **Try Deleting and Re-adding:**
   - Delete the CNAME record
   - Wait 5 minutes
   - Add it again with the exact values
   - Wait 15-60 minutes

### DNS Shows Correct Value But Vercel Still Invalid

1. **Wait longer** - Vercel checks periodically
2. **Try refreshing** the Vercel domains page
3. **Check if there are multiple CNAME records** - you should only have ONE
4. **Verify no conflicting records** (like an A record for `job`)

### Cloudflare Proxy Issue

If using Cloudflare:
- Make sure the proxy is **OFF** (gray cloud, DNS only)
- Orange cloud (proxied) can cause issues with Vercel

---

## ✅ Quick Checklist

- [ ] DNS record Type is `CNAME`
- [ ] DNS record Name is `job` (not the full domain)
- [ ] DNS record Value is `ff2e8b2cfc72d9ec.vercel-dns-017.com.` (with the dot!)
- [ ] DNS record is saved in your DNS provider
- [ ] Waited 15-60 minutes for propagation
- [ ] Checked DNS propagation at dnschecker.org (green checkmarks)
- [ ] Vercel domain status shows "Valid" ✅

---

## 🎯 Next Steps After Domain is Valid

Once Vercel shows "Valid" ✅:

1. **Update Environment Variables:**
   - `NEXTAUTH_URL` → `https://job.floorinteriorservices.com`
   - `NEXT_PUBLIC_APP_URL` → `https://job.floorinteriorservices.com`

2. **Update Azure AD Redirect URI:**
   - Add: `https://job.floorinteriorservices.com/api/auth/callback/azure-ad`

3. **Redeploy your application**

4. **Test the subdomain:**
   - Visit: `https://job.floorinteriorservices.com`

---

The key issue is likely that the DNS record value needs to match **exactly** what Vercel shows, including the dot (.) at the end!
