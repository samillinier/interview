# DNS Setup Checklist for Resend

Use this checklist to set up your custom domain for Resend email sending.

## Pre-Setup

- [ ] Have access to your domain's DNS settings
- [ ] Know your domain name (e.g., `floorinteriorservices.com`)
- [ ] Have a Resend account (sign up at https://resend.com)

## Step 1: Add Domain in Resend

- [ ] Go to https://resend.com → **Domains**
- [ ] Click **"Add Domain"**
- [ ] Enter your domain (without www or http://)
- [ ] Click **"Add"**

## Step 2: Copy DNS Records

- [ ] Copy the **SPF record** (TXT record)
- [ ] Copy the **DKIM record** (TXT record with `_domainkey`)
- [ ] Copy the **DMARC record** (optional but recommended)

## Step 3: Add DNS Records

Go to your DNS provider and add each record:

### SPF Record
- [ ] Type: `TXT`
- [ ] Name: `@` (or your domain name)
- [ ] Value: `v=spf1 include:_spf.resend.com ~all`
- [ ] TTL: Auto or 3600
- [ ] Saved

### DKIM Record
- [ ] Type: `TXT`
- [ ] Name: `resend._domainkey` (or as shown in Resend)
- [ ] Value: [Long string from Resend]
- [ ] TTL: Auto or 3600
- [ ] Saved

### DMARC Record (Optional)
- [ ] Type: `TXT`
- [ ] Name: `_dmarc`
- [ ] Value: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
- [ ] TTL: Auto or 3600
- [ ] Saved

## Step 4: Verify DNS Propagation

- [ ] Wait 5-60 minutes (depends on DNS provider)
- [ ] Check DNS propagation at https://dnschecker.org
- [ ] Verify TXT records are visible

## Step 5: Verify Domain in Resend

- [ ] Go back to Resend → **Domains**
- [ ] Click **"Verify"** on your domain
- [ ] Status shows ✅ **Verified** (not ⏳ Pending or ❌ Failed)

## Step 6: Update Vercel Environment Variables

- [ ] Go to Vercel → Your Project → **Settings** → **Environment Variables**
- [ ] Update `RESEND_FROM_EMAIL`:
  - Old: `onboarding@resend.dev`
  - New: `noreply@yourdomain.com` (or your preferred address)
- [ ] Make sure **Production** environment is selected
- [ ] Click **Save**

## Step 7: Redeploy

- [ ] Vercel auto-redeploys, OR
- [ ] Manually redeploy from **Deployments** tab

## Step 8: Test

- [ ] Go to your production site
- [ ] Navigate to `/create-account`
- [ ] Enter an email address
- [ ] Click "Send Verification Email"
- [ ] Check inbox - email should come from `noreply@yourdomain.com`
- [ ] ✅ Success!

## Troubleshooting

If domain verification fails:
- [ ] Double-check DNS records match exactly
- [ ] Wait longer (up to 48 hours for some providers)
- [ ] Check for typos or extra spaces
- [ ] Verify TXT records are visible at dnschecker.org
- [ ] Try removing and re-adding domain in Resend

## Common Email Addresses

Choose one for `RESEND_FROM_EMAIL`:
- `noreply@yourdomain.com` ✅ Most common
- `no-reply@yourdomain.com`
- `verify@yourdomain.com`
- `notifications@yourdomain.com`
- `support@yourdomain.com`

**Note:** You don't need to create actual email accounts - Resend handles sending.

## Estimated Time

- **DNS Setup**: 5-15 minutes
- **DNS Propagation**: 5-60 minutes (usually 15-30)
- **Total**: ~30-45 minutes

## Need Help?

See detailed instructions in `SETUP_DNS_RESEND.md`
