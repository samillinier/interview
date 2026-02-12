# Setup DNS for Resend Custom Domain

This guide will help you set up DNS records so you can send emails from your own domain (e.g., `noreply@yourdomain.com`) instead of `onboarding@resend.dev`.

## Prerequisites

- Access to your domain's DNS settings (wherever you bought your domain - GoDaddy, Namecheap, Cloudflare, etc.)
- A Resend account (free tier works)
- Your domain name (e.g., `floorinteriorservices.com`)

## Step-by-Step Setup

### Step 1: Add Domain in Resend

1. Go to **https://resend.com**
2. Log in to your account
3. Click **"Domains"** in the sidebar
4. Click **"Add Domain"** button
5. Enter your domain name (e.g., `floorinteriorservices.com`)
   - ⚠️ **Don't include** `www` or `http://` - just the domain name
6. Click **"Add"**

### Step 2: Get DNS Records from Resend

After adding the domain, Resend will show you the DNS records you need to add. You'll see something like:

**SPF Record:**
```
Type: TXT
Name: @ (or your domain name)
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Record:**
```
Type: TXT
Name: resend._domainkey (or similar)
Value: [A long string provided by Resend]
```

**DMARC Record (Optional but recommended):**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

### Step 3: Add DNS Records to Your Domain Provider

The exact steps depend on your DNS provider. Here are instructions for common providers:

#### **Cloudflare**

1. Log in to Cloudflare
2. Select your domain
3. Go to **DNS** → **Records**
4. Click **"Add record"**
5. For each record:
   - **Type**: Select `TXT`
   - **Name**: Enter the name from Resend (e.g., `@` or `resend._domainkey`)
   - **Content**: Paste the value from Resend
   - **TTL**: Auto (or 3600)
   - Click **"Save"**

#### **GoDaddy**

1. Log in to GoDaddy
2. Go to **My Products** → **DNS**
3. Scroll to **"Records"** section
4. Click **"Add"**
5. For each record:
   - **Type**: `TXT`
   - **Name**: Enter the name from Resend
   - **Value**: Paste the value from Resend
   - **TTL**: 600 seconds
   - Click **"Save"**

#### **Namecheap**

1. Log in to Namecheap
2. Go to **Domain List** → Click **"Manage"** next to your domain
3. Go to **Advanced DNS** tab
4. Click **"Add New Record"**
5. For each record:
   - **Type**: `TXT Record`
   - **Host**: Enter the name from Resend
   - **Value**: Paste the value from Resend
   - **TTL**: Automatic
   - Click **"Save"**

#### **Google Domains / Google Workspace**

1. Go to **Google Domains** (domains.google.com)
2. Select your domain
3. Go to **DNS** → **Custom records**
4. Click **"Create new record"**
5. For each record:
   - **Record type**: `TXT`
   - **Name**: Enter the name from Resend
   - **Data**: Paste the value from Resend
   - **TTL**: 3600
   - Click **"Save"**

#### **AWS Route 53**

1. Go to **Route 53** console
2. Select **Hosted zones** → Your domain
3. Click **"Create record"**
4. For each record:
   - **Record name**: Enter the name from Resend
   - **Record type**: `TXT`
   - **Value**: Paste the value from Resend
   - **TTL**: 300
   - Click **"Create records"**

### Step 4: Wait for DNS Propagation

DNS changes can take anywhere from a few minutes to 48 hours to propagate, but usually:
- **Cloudflare**: 1-5 minutes
- **GoDaddy**: 15-60 minutes
- **Namecheap**: 15-60 minutes
- **Google Domains**: 5-30 minutes
- **Route 53**: 1-5 minutes

### Step 5: Verify Domain in Resend

1. Go back to **Resend Dashboard** → **Domains**
2. Find your domain in the list
3. Click **"Verify"** or wait for automatic verification
4. You'll see a status indicator:
   - ⏳ **Pending** - DNS records are being checked
   - ✅ **Verified** - Domain is ready to use!
   - ❌ **Failed** - Check DNS records again

### Step 6: Update Environment Variables

Once your domain is verified, update your Vercel environment variables:

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Update `RESEND_FROM_EMAIL`:
   - **Old**: `onboarding@resend.dev`
   - **New**: `noreply@yourdomain.com` (or `verify@yourdomain.com`, `no-reply@yourdomain.com`, etc.)
3. Make sure to select **Production** environment
4. Click **Save**

### Step 7: Redeploy

After updating environment variables:
1. Vercel will automatically redeploy, OR
2. Go to **Deployments** → Click **"Redeploy"** on latest deployment

### Step 8: Test

1. Go to your production site
2. Navigate to `/create-account`
3. Enter an email address
4. Click "Send Verification Email"
5. Check the email - it should now come from `noreply@yourdomain.com` (or whatever you set)

## Common Email Addresses to Use

You can use any email address with your verified domain:
- `noreply@yourdomain.com` (most common)
- `no-reply@yourdomain.com`
- `verify@yourdomain.com`
- `notifications@yourdomain.com`
- `support@yourdomain.com`

**Note:** You don't need to create actual email accounts - Resend handles the sending. The address is just for the "From" field.

## Troubleshooting

### DNS Records Not Verifying

1. **Check DNS Propagation:**
   - Use https://dnschecker.org
   - Enter your domain and check TXT records
   - Make sure all records are visible

2. **Common Mistakes:**
   - ❌ Including `www` in domain name
   - ❌ Wrong record type (should be `TXT`, not `A` or `CNAME`)
   - ❌ Typos in the DNS record value
   - ❌ Missing quotes around the value (some providers need them, some don't)

3. **Wait Longer:**
   - Some DNS providers take up to 48 hours
   - Try again after a few hours

### Domain Still Not Verified After 24 Hours

1. Double-check all DNS records match exactly what Resend shows
2. Make sure there are no extra spaces or characters
3. Try removing and re-adding the domain in Resend
4. Contact Resend support if still having issues

### Emails Still Coming From onboarding@resend.dev

1. Check that `RESEND_FROM_EMAIL` is updated in Vercel
2. Make sure you updated it for **Production** environment
3. Redeploy your application
4. Check Vercel logs to see what email address is being used

## Benefits of Using Your Own Domain

✅ **Professional appearance** - Emails come from your domain  
✅ **Better deliverability** - Custom domains have better reputation  
✅ **Brand consistency** - Matches your website domain  
✅ **No free tier limitations** - Can send to any email address  
✅ **Better open rates** - Users trust emails from your domain  

## Next Steps

Once DNS is set up and domain is verified:
1. ✅ Update `RESEND_FROM_EMAIL` in Vercel
2. ✅ Redeploy application
3. ✅ Test email sending
4. ✅ Monitor email delivery in Resend dashboard

Your emails will now come from your professional domain! 🎉
