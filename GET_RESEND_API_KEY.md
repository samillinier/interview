# Get Resend API Key - Quick Steps

## To Send Real Emails, You Need a Resend API Key

### Step 1: Sign Up for Resend (Free)

1. Go to **https://resend.com**
2. Click **"Sign Up"** (top right)
3. Sign up with your email (takes 30 seconds)
4. Verify your email if needed

### Step 2: Get Your API Key

1. After logging in, go to **"API Keys"** in the sidebar
2. Click **"Create API Key"**
3. Give it a name (e.g., "Installer Portal")
4. **Copy the API key** (starts with `re_`)
   - ⚠️ **Important**: Copy it now - you won't see it again!

### Step 3: Add to Your Project

Add this line to your `.env.local` file:

```bash
RESEND_API_KEY=re_your_actual_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Example:**
```bash
RESEND_API_KEY=re_abc123xyz789
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### Step 4: Restart Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

### Step 5: Test!

Now when you create an account:
- ✅ Email will be sent to the user's inbox
- ✅ Professional email with verification link
- ✅ User clicks link in their email
- ✅ Email is verified
- ✅ User creates password

## Free Tier Limits

- **100 emails per day**
- **3,000 emails per month**
- Perfect for development and small production use

## What Happens Now

**Without API Key:**
- Verification URL shown on page (development mode)
- User can click link directly

**With API Key:**
- ✅ Email sent to user's inbox
- ✅ Professional email template
- ✅ User receives email and clicks link
- ✅ Full email verification flow

## Need Help?

The code is already set up and ready. Just add the API key and restart the server!
