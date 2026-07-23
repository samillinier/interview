# Email Setup Guide

## Current Status

The email verification system is set up to use **Resend** for sending emails. Currently, emails are not being sent because the Resend API key is not configured.

## Quick Setup (Resend - Recommended)

### Step 1: Get Resend API Key

1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Go to **API Keys** section
4. Create a new API key
5. Copy the API key (starts with `re_`)

### Step 2: Add to Environment Variables

Add to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

**Note:** For the free tier, you can use `onboarding@resend.dev` as the from email, or verify your own domain.

### Step 3: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

## Alternative: Use Development Mode

If you don't want to set up Resend right now, the system will:
- Show the verification URL directly on the page (in development)
- Log the URL to the server console
- You can copy the URL and use it to test the flow

## Testing

After setting up Resend:

1. Go to `/create-account`
2. Enter your email
3. Click "Send Verification Email"
4. Check your email inbox
5. Click the verification link
6. Create your password

## Email Template

The email includes:
- Professional HTML template
- Plain text fallback
- Clear call-to-action button
- Verification link
- Expiration notice (24 hours)

## Troubleshooting

**Not receiving emails?**
1. Check spam folder
2. Verify RESEND_API_KEY is set correctly
3. Check server console for errors
4. Verify your email address is correct
5. Check Resend dashboard for delivery status

**Resend API errors?**
- Make sure API key is valid
- Check Resend account limits
- Verify from email is configured correctly

## Free Tier Limits

Resend free tier:
- 100 emails per day
- 3,000 emails per month
- Perfect for development and small production use
