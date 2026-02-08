# How to Get Verification Emails

## Current Situation

Right now, emails are **not being sent** because an email service isn't configured. Instead, the verification URL is shown directly on the page in "Development Mode".

## Option 1: Use the URL on the Page (Works Now) ✅

When you click "Send Verification Email", you'll see a yellow box with the verification URL. You can:
1. **Copy that URL**
2. **Paste it in your browser**
3. **Complete the verification**

This works perfectly for testing!

## Option 2: Set Up Real Email Sending 📧

To actually send emails, you need to:

### Step 1: Install Resend Package

```bash
npm install resend
```

### Step 2: Get Resend API Key

1. Go to https://resend.com
2. Sign up (free - 100 emails/day)
3. Go to **API Keys**
4. Create new key
5. Copy it (starts with `re_`)

### Step 3: Add to .env.local

Add these lines to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Note:** For free tier, you can use `onboarding@resend.dev` as the sender email.

### Step 4: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Test

Now when you request verification, you'll receive an actual email!

## Quick Test Right Now

Even without email setup, you can test the full flow:

1. Go to `/create-account`
2. Enter your email
3. Click "Send Verification Email"
4. **Copy the URL from the yellow "Development Mode" box**
5. Paste it in your browser
6. Verify email → Create password → Done!

The URL looks like:
```
http://localhost:3000/verify-email?token=...&email=...
```

## Why No Emails Yet?

The code is ready to send emails, but:
- ❌ Resend package not installed
- ❌ No RESEND_API_KEY configured

Once you add those, emails will be sent automatically!

## Alternative: Other Email Services

If you prefer a different service:

- **SendGrid** - Free tier available
- **AWS SES** - Very cheap
- **Mailgun** - Free tier available
- **Nodemailer** - With Gmail/SMTP

Let me know if you want help setting up a different service!
