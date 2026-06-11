# Quick Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

1. **Push code to GitHub** (if not already):
   ```bash
   git push origin main
   ```

## 🗄️ Step 1: Set Up Vercel Postgres Database

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project (or import from GitHub if not linked)
3. Go to the **Storage** tab
4. Click **Create Database** → Select **Postgres**
5. Name it (e.g., `floor-interior-db`)
6. Select a region (same as your app)
7. Click **Create**

## 🔑 Step 2: Add Environment Variables

Go to **Settings** → **Environment Variables** and add:

### Required Variables:

1. **DATABASE_URL**
   - Copy the value from `POSTGRES_URL` (auto-created by Vercel Postgres)
   - Add as new variable: `DATABASE_URL` = (copy POSTGRES_URL value)

2. **OPENAI_API_KEY**
   - `sk-your-openai-api-key-here` (get from https://platform.openai.com/api-keys)

3. **NEXTAUTH_URL**
   - Production: `https://your-app-name.vercel.app` (update after first deployment)
   - Preview: `https://your-app-name-*.vercel.app`

4. **NEXTAUTH_SECRET**
   - `fis-recruitment-secret-key-2024` (or generate new: `openssl rand -base64 32`)

5. **NEXT_PUBLIC_APP_URL**
   - Production: `https://your-app-name.vercel.app`
   - Preview: Same format

### Optional (if using Azure AD):
- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`

**Important:** Select all environments (Production, Preview, Development) for each variable!

## 🚀 Step 3: Deploy

### Option A: Via Vercel Dashboard
1. Go to your project in Vercel Dashboard
2. Click **Deploy** or push to GitHub (auto-deploys)

### Option B: Via CLI (Current)
```bash
vercel --prod
```

## ✅ Step 4: Verify Deployment

1. Visit your deployment URL (shown after deployment)
2. Test the interview flow
3. Check the dashboard
4. Verify database tables are created

## 🔧 After First Deployment

1. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with your actual Vercel URL
2. Redeploy if needed

## 📝 Notes

- Database schema will be pushed automatically during build
- First deployment may take 5-10 minutes
- Check build logs if deployment fails

