# How to Change/Configure Resend Email Address

## Current Setup

Right now, your emails are being sent from: `onboarding@resend.dev`

## Option 1: Use a Different Resend Domain (Quick)

Resend provides a few default domains you can use:

1. Go to **Resend Dashboard** → **Domains**
2. You'll see available domains like:
   - `onboarding@resend.dev` (current)
   - `delivered@resend.dev`
   - Or create a custom domain

3. Update your `.env.local`:
   ```bash
   RESEND_FROM_EMAIL=delivered@resend.dev
   ```

4. Restart server

## Option 2: Add Your Own Domain (Recommended for Production)

### Step 1: Add Domain in Resend

1. Go to **Resend Dashboard** → **Domains**
2. Click **"Add Domain"**
3. Enter your domain (e.g., `yourcompany.com`)
4. Follow the DNS setup instructions
5. Wait for verification (usually a few minutes)

### Step 2: Update Environment Variable

Once verified, update `.env.local`:

```bash
RESEND_FROM_EMAIL=noreply@yourcompany.com
# or
RESEND_FROM_EMAIL=verify@yourcompany.com
```

### Step 3: Restart Server

```bash
npm run dev
```

## Option 3: Change the Display Name

You can also change how the email appears by updating the code:

In `src/app/api/installers/send-verification/route.ts`, change:

```typescript
from: 'Your Company Name <onboarding@resend.dev>',
```

This will show as: **"Your Company Name"** <onboarding@resend.dev>

## Quick Change Right Now

To change the from email address:

1. **Open** `.env.local` file
2. **Find** the line: `RESEND_FROM_EMAIL=onboarding@resend.dev`
3. **Change** to: `RESEND_FROM_EMAIL=delivered@resend.dev` (or your preferred address)
4. **Save** the file
5. **Restart** your server

## What You See in Resend Dashboard

- **"onboarding 2"** - This is likely showing you have 2 emails sent from the onboarding domain
- **"Verif"** - Probably "Verification" emails

You can:
- Click on domains to see usage
- Add new domains
- Configure DNS records
- See email statistics

## For Production

Best practice:
1. Add your own domain (e.g., `noreply@yourcompany.com`)
2. Set up SPF/DKIM records (Resend provides instructions)
3. This improves deliverability and looks more professional

## Need Help?

The code automatically uses whatever email you set in `RESEND_FROM_EMAIL` in your `.env.local` file. Just change that value and restart!
