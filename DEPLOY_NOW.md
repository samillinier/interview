# 🚀 Deploy to Vercel - Quick Steps

## Current Status
✅ Code is prepared for deployment
✅ Schema switched to PostgreSQL  
✅ Vercel CLI limit reached (100/day) - use Dashboard instead

## Deploy via Vercel Dashboard (Recommended)

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Find your project: **floor-interior-service**
3. Or import from GitHub: https://github.com/samillinier/interview

### Step 2: Set Up Vercel Postgres Database
1. In your project dashboard, go to **Storage** tab
2. Click **Create Database** → Select **Postgres**
3. Name: `floor-interior-db`
4. Region: Choose same as your app
5. Click **Create**
6. Wait for database to be created (~1 minute)

### Step 3: Add Environment Variables
Go to **Settings** → **Environment Variables**

Add these (select **Production, Preview, Development** for each):

1. **DATABASE_URL**
   - Go to Storage → Your Postgres DB → `.env.local` tab
   - Copy the `POSTGRES_URL` value
   - Add new variable: Name=`DATABASE_URL`, Value=(paste POSTGRES_URL value)

2. **OPENAI_API_KEY**
   - Value: `sk-your-openai-api-key-here` (get from https://platform.openai.com/api-keys)

3. **NEXTAUTH_URL**
   - For first deploy: Use placeholder `https://your-app.vercel.app`
   - After deploy: Update with actual URL

4. **NEXTAUTH_SECRET**
   - Value: `fis-recruitment-secret-key-2024`

5. **NEXT_PUBLIC_APP_URL**
   - Same as NEXTAUTH_URL

### Step 4: Deploy
1. Go to **Deployments** tab
2. Click **Redeploy** on latest deployment (or trigger new deploy)
3. Or push to GitHub: `git push origin main` (auto-deploys)

### Step 5: After First Deployment
1. Note your deployment URL (e.g., `https://floor-interior-service.vercel.app`)
2. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with actual URL
3. Redeploy

## ⚠️ Important Notes

- Database schema will auto-create on first deployment
- Build may take 5-10 minutes
- Check build logs if deployment fails
- Your database will be empty initially (different from local SQLite)

## 🔍 Verify Deployment

1. Visit your deployment URL
2. Test interview flow: `/interview/new`
3. Check dashboard: `/dashboard`
4. Verify data is saving to Postgres

## 📞 Need Help?

- Check build logs in Vercel Dashboard
- Verify all environment variables are set
- Ensure Postgres database is linked to project

