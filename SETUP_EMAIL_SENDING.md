# Setup Email Sending - Quick Guide

## Why You're Not Getting Emails

The system is ready to send emails, but you need to:
1. Install the Resend package
2. Get a free Resend API key
3. Add it to your environment variables

## Step-by-Step Setup

### Step 1: Install Resend (Run this command)

```bash
npm install resend
```

### Step 2: Get Resend API Key (Free)

1. **Go to**: https://resend.com
2. **Sign up** for a free account (takes 2 minutes)
3. **Go to**: API Keys section
4. **Click**: "Create API Key"
5. **Copy** the key (starts with `re_`)

### Step 3: Add to .env.local

Open your `.env.local` file and add:

```bash
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Note:** For the free tier, you can use `onboarding@resend.dev` as the sender email.

### Step 4: Restart Server

```bash
# Stop server (Ctrl+C in terminal)
npm run dev
```

### Step 5: Test

Now when you create an account:
1. Enter your email
2. Click "Send Verification Email"
3. **Check your actual email inbox!**
4. Click the link in the email
5. Verify and create password

## What Happens After Setup

✅ **Emails will be sent** to the user's email address
✅ **Professional email template** with verification link
✅ **Works in production** automatically
✅ **Free tier**: 100 emails/day, 3,000/month

## Current Status

- ✅ Code is ready to send emails
- ⏳ Waiting for Resend API key
- ⏳ Resend package needs to be installed

Once you complete the steps above, emails will be sent automatically!

## Troubleshooting

**Still not getting emails?**
1. Check spam folder
2. Verify API key is correct in `.env.local`
3. Check server console for errors
4. Verify email address is correct
5. Check Resend dashboard for delivery status

**Need help?** The code is already set up - just need the API key!
