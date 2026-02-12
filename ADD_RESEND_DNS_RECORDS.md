# Add Resend DNS Records - Quick Guide

Based on your Resend DNS Records page, here's exactly what you need to add to your domain's DNS settings.

## Records to Add

You need to add **3 DNS records** to verify your domain and enable email sending:

### 1. DKIM Record (Domain Verification)

**Purpose:** Verifies you own the domain

- **Type:** `TXT`
- **Name:** `resend._domainkey`
- **Value:** `p=MIGfMAOGCSqG [...] H2ghOBQIDAQAB` (use the FULL value from Resend, not truncated)
- **TTL:** `Auto` (or `3600`)

### 2. MX Record (Enable Sending)

**Purpose:** Enables email sending from your domain

- **Type:** `MX`
- **Name:** `send`
- **Value:** `feedback-smtp.[...]amazonses.com` (use the FULL value from Resend)
- **TTL:** `Auto` (or `3600`)
- **Priority:** `10`

### 3. SPF Record (Enable Sending)

**Purpose:** Authorizes Resend to send emails on your behalf

- **Type:** `TXT`
- **Name:** `send`
- **Value:** `v=spf1 include [...] nses.com ~all` (use the FULL value from Resend)
- **TTL:** `Auto` (or `3600`)

## How to Add These Records

### Step 1: Copy the Full Values

⚠️ **Important:** Make sure you copy the **COMPLETE** values from Resend, not the truncated versions shown in the image. Click on each record in Resend to see the full value.

### Step 2: Go to Your DNS Provider

Log in to wherever you manage your domain's DNS:
- **Cloudflare** → DNS → Records
- **GoDaddy** → My Products → DNS
- **Namecheap** → Domain List → Manage → Advanced DNS
- **Google Domains** → DNS → Custom records
- **AWS Route 53** → Hosted zones → Your domain

### Step 3: Add Each Record

For each of the 3 records above:

1. Click **"Add Record"** (or similar button)
2. Select **Type**: `TXT` or `MX` (as specified)
3. Enter **Name**: Exactly as shown (e.g., `resend._domainkey` or `send`)
4. Paste **Value**: The complete value from Resend
5. Set **TTL**: `Auto` or `3600`
6. For MX record, also set **Priority**: `10`
7. Click **Save**

### Step 4: Wait for Propagation

- **Cloudflare**: 1-5 minutes
- **GoDaddy**: 15-60 minutes
- **Namecheap**: 15-60 minutes
- **Google Domains**: 5-30 minutes
- **Route 53**: 1-5 minutes

### Step 5: Verify in Resend

1. Go back to Resend → **Domains**
2. Click **"Verify"** or wait for automatic verification
3. Status should change from **"Not Started"** to **"Verified"** ✅

## Important Notes

### For the "Name" Field:

- **`resend._domainkey`** - Add this exactly as shown
- **`send`** - Add this exactly as shown (for both MX and TXT records)

### For the "Value" Field:

- Make sure you copy the **ENTIRE** value from Resend
- Don't include quotes unless your DNS provider requires them
- No extra spaces before or after

### Common Mistakes to Avoid:

❌ Using `@` instead of `send` for the MX/TXT records  
❌ Truncating the DKIM value  
❌ Wrong record type (MX vs TXT)  
❌ Missing priority for MX record  
❌ Extra spaces or quotes  

## After Verification

Once all records show **"Verified"** ✅:

1. **Update Vercel Environment Variables:**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Update `RESEND_FROM_EMAIL` to: `noreply@yourdomain.com` (or your preferred address)
   - Make sure **Production** is selected
   - Save

2. **Redeploy:**
   - Vercel will auto-redeploy, or manually redeploy from Deployments tab

3. **Test:**
   - Send a test email
   - Check that it comes from your domain

## Troubleshooting

### Records Still Show "Not Started"

1. **Wait longer** - DNS can take up to 48 hours (usually 15-30 minutes)
2. **Check DNS propagation** at https://dnschecker.org
   - Enter your domain
   - Select `TXT` or `MX` record type
   - Check if records are visible globally
3. **Double-check values** - Make sure they match exactly what Resend shows
4. **Verify record names** - `resend._domainkey` and `send` (not `@`)

### One Record Verified, Others Not

- Each record is checked independently
- Wait for all to propagate
- Check each one individually at dnschecker.org

### Still Having Issues?

1. Remove and re-add the domain in Resend
2. Double-check all values are copied correctly
3. Contact your DNS provider support
4. Check Resend documentation or support

## Quick Checklist

- [ ] Copied full DKIM value (not truncated)
- [ ] Added TXT record: `resend._domainkey`
- [ ] Added MX record: `send` with priority `10`
- [ ] Added TXT record: `send` (SPF)
- [ ] All records saved in DNS provider
- [ ] Waited 15-30 minutes for propagation
- [ ] Verified records at dnschecker.org
- [ ] Clicked "Verify" in Resend
- [ ] All records show "Verified" ✅
- [ ] Updated `RESEND_FROM_EMAIL` in Vercel
- [ ] Redeployed application
- [ ] Tested email sending

Once all records are verified, your emails will send from your custom domain! 🎉
