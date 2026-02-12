# Add Resend DNS Records on GoDaddy - Step-by-Step Guide

This guide shows you exactly how to add the Resend DNS records to your domain on GoDaddy.

## Step 1: Log In to GoDaddy

1. Go to **https://www.godaddy.com**
2. Click **"Sign In"** (top right)
3. Enter your email and password
4. Click **"Sign In"**

## Step 2: Navigate to DNS Management

1. After logging in, you'll see **"My Products"** section
2. Find your domain name in the list
3. Click the **three dots (⋯)** next to your domain
4. Click **"DNS"** from the dropdown menu

**OR**

1. Click directly on your domain name
2. Scroll down to the **"DNS"** section
3. Click **"Manage DNS"** or **"DNS"**

## Step 3: Add DKIM Record (Domain Verification)

This is the first record you need to add:

1. Scroll down to the **"Records"** section
2. Click the **"Add"** button
3. Fill in the form:
   - **Type:** Select `TXT` from the dropdown
   - **Name:** Enter `resend._domainkey`
   - **Value:** Paste the FULL DKIM value from Resend
     - ⚠️ Make sure to copy the complete value (not truncated)
     - It should start with `p=MIGfMAOGCSqG...`
   - **TTL:** Select `600 seconds` (or leave default)
4. Click **"Save"**

**What it looks like:**
```
Type: TXT
Name: resend._domainkey
Value: p=MIGfMAOGCSqG... [full long string]
TTL: 600 seconds
```

## Step 4: Add MX Record (Enable Sending)

1. Still in the **"Records"** section
2. Click **"Add"** again
3. Fill in the form:
   - **Type:** Select `MX` from the dropdown
   - **Name:** Enter `send`
   - **Value:** Paste ONLY the hostname from Resend (no priority number)
     - Should look like: `feedback-smtp.us-east-1.amazonses.com`
     - ⚠️ **Important:** Do NOT include the priority number in the Value field
     - ⚠️ **Important:** Remove any placeholder text like "[Full MX value from Resend]"
   - **Priority:** Enter `10` (this goes in the separate Priority field)
   - **TTL:** Select `1/2 Hour` (or `600 seconds`)
4. Click **"Save"**

**What it looks like:**
```
Type: MX
Name: send
Value: feedback-smtp.us-east-1.amazonses.com [ONLY the hostname, no numbers]
Priority: 10 [separate field]
TTL: 1/2 Hour
```

**Common Mistake:**
❌ Value: `10 feedback-smtp.us-east-1.amazonses.com` (includes priority)  
✅ Value: `feedback-smtp.us-east-1.amazonses.com` (hostname only)

## Step 5: Add SPF Record (Enable Sending)

1. Still in the **"Records"** section
2. Click **"Add"** again
3. Fill in the form:
   - **Type:** Select `TXT` from the dropdown
   - **Name:** Enter `send`
   - **Value:** Paste the FULL SPF value from Resend
     - Should look like: `v=spf1 include:amazonses.com ~all`
   - **TTL:** Select `600 seconds` (or leave default)
4. Click **"Save"**

**What it looks like:**
```
Type: TXT
Name: send
Value: v=spf1 include:amazonses.com ~all [full value]
TTL: 600 seconds
```

## Step 6: Verify Records Were Added

After adding all 3 records, you should see them in your DNS records list:

✅ **TXT** record: `resend._domainkey`  
✅ **MX** record: `send` (Priority: 10)  
✅ **TXT** record: `send`

## Step 7: Wait for DNS Propagation

- GoDaddy DNS changes usually take **15-60 minutes** to propagate
- Sometimes up to 24 hours, but usually much faster

## Step 8: Verify in Resend

1. Go back to **Resend Dashboard** → **Domains**
2. Find your domain
3. Click **"Verify"** or wait for automatic verification
4. The status should change from **"Not Started"** to **"Verified"** ✅

## Troubleshooting

### Can't Find "DNS" Option

- Make sure you're logged in to the correct GoDaddy account
- The domain must be in your account
- Try clicking directly on the domain name first

### Records Not Showing Up

- Refresh the page
- Wait a few minutes and check again
- Make sure you clicked "Save" after adding each record

### "Invalid Value" Error

- Make sure you copied the **complete** value from Resend
- No extra spaces before or after
- For MX record, make sure Priority is set to `10`

### Records Added But Not Verifying

1. **Wait longer** - DNS can take up to 48 hours (usually 15-30 minutes)
2. **Check DNS propagation:**
   - Go to https://dnschecker.org
   - Enter your domain
   - Select `TXT` record type
   - Search for `resend._domainkey`
   - Check if it's visible globally
3. **Double-check values:**
   - Make sure they match exactly what Resend shows
   - No typos or missing characters

### GoDaddy Shows "Invalid Format"

- For TXT records, GoDaddy sometimes requires quotes around the value
- Try adding quotes: `"p=MIGfMAOGCSqG..."`
- If that doesn't work, remove quotes and try again

## Quick Checklist

- [ ] Logged in to GoDaddy
- [ ] Navigated to DNS management for your domain
- [ ] Added TXT record: `resend._domainkey` with full DKIM value
- [ ] Added MX record: `send` with priority `10` and full MX value
- [ ] Added TXT record: `send` with full SPF value
- [ ] All 3 records saved successfully
- [ ] Waited 15-30 minutes
- [ ] Verified records at dnschecker.org
- [ ] Clicked "Verify" in Resend
- [ ] All records show "Verified" ✅

## After Verification

Once all records are verified in Resend:

1. **Update Vercel Environment Variables:**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Update `RESEND_FROM_EMAIL` to: `noreply@yourdomain.com`
   - Make sure **Production** is selected
   - Save

2. **Redeploy:**
   - Vercel will auto-redeploy, or manually redeploy

3. **Test:**
   - Send a test email
   - Verify it comes from your domain

## Need Help?

If you're stuck:
- Check GoDaddy's DNS help: https://www.godaddy.com/help
- Verify your records at: https://dnschecker.org
- Contact GoDaddy support if DNS records aren't saving

Your emails will send from your custom domain once verified! 🎉
