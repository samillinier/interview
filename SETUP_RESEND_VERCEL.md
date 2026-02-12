# Setup Resend Email in Vercel - Quick Guide

## Current Issue
Emails are not being sent because `RESEND_API_KEY` is not configured in Vercel environment variables.

## Quick Fix (5 minutes)

### Step 1: Get Resend API Key

1. Go to **https://resend.com**
2. Sign up for a free account (takes 2 minutes)
3. Go to **API Keys** in the sidebar
4. Click **"Create API Key"**
5. Give it a name (e.g., "Floor Interior Service")
6. **Copy the API key** (starts with `re_`)
   - ⚠️ **Important**: Copy it now - you won't see it again!

### Step 2: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables:

   **Variable Name:** `RESEND_API_KEY`  
   **Value:** `re_your_actual_api_key_here`  
   **Environment:** Select all (Production, Preview, Development)

   **Variable Name:** `RESEND_FROM_EMAIL`  
   **Value:** `onboarding@resend.dev`  
   **Environment:** Select all (Production, Preview, Development)

   **Variable Name:** `RESEND_FROM_NAME` (Optional)  
   **Value:** `Floor Interior Service`  
   **Environment:** Select all (Production, Preview, Development)

4. Click **Save** for each variable

### Step 3: Redeploy

After adding environment variables, Vercel will automatically redeploy. Or you can:

1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger deployment

### Step 4: Test

1. Go to your production site
2. Navigate to `/create-account`
3. Enter an email address
4. Click "Send Verification Email"
5. Check the email inbox - you should receive the verification email!

## Free Tier Limits

Resend free tier includes:
- ✅ **100 emails per day**
- ✅ **3,000 emails per month**
- ✅ Perfect for development and small production use

## Troubleshooting

### Still not receiving emails?

1. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → **Logs**
   - Look for Resend-related errors
   - Check if `RESEND_API_KEY` is being read correctly

2. **Check Resend Dashboard:**
   - Go to https://resend.com/emails
   - See if emails are being sent
   - Check delivery status

3. **Common Issues:**
   - **Invalid API Key**: Make sure you copied the full key starting with `re_`
   - **Domain not verified**: Free tier can only send to your account email OR use `onboarding@resend.dev`
   - **Rate limit**: Free tier has 100 emails/day limit

4. **Verify Environment Variables:**
   - In Vercel, go to Settings → Environment Variables
   - Make sure `RESEND_API_KEY` is set for **Production** environment
   - Make sure there are no typos

### Error Messages

**"Invalid API key"**
- Check that the API key is correct in Vercel environment variables
- Make sure it starts with `re_`
- Regenerate the key in Resend if needed

**"You can only send testing emails"**
- Free tier limitation
- Verify a domain at https://resend.com/domains
- Or use `onboarding@resend.dev` as FROM_EMAIL

**"Domain not verified"**
- If using custom domain, verify it in Resend
- Or use `onboarding@resend.dev` for free tier

## Next Steps

Once emails are working:
- ✅ Users will receive verification emails automatically
- ✅ Professional email templates are already configured
- ✅ Email verification flow is complete

## Need Help?

Check the server logs in Vercel for detailed error messages. The code includes comprehensive logging to help debug issues.
