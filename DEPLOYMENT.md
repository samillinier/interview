# Vercel Deployment Guide

This guide will help you deploy your Floor Interior Service application to Vercel with Vercel Postgres database.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A GitHub account (to connect your repository)
3. An OpenAI API key

## Step 1: Prepare Your Repository

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

## Step 2: Create Vercel Postgres Database

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click on your project (or create a new one)

2. **Add Vercel Postgres:**
   - In your project dashboard, go to the **Storage** tab
   - Click **Create Database**
   - Select **Postgres**
   - Choose a name for your database (e.g., `floor-interior-db`)
   - Select a region (recommended: same as your app region)
   - Click **Create**

3. **Get your Database URL:**
   - After creation, Vercel will automatically create environment variables
   - The `POSTGRES_URL` variable will be automatically available
   - Note: Vercel uses `POSTGRES_URL` but Prisma expects `DATABASE_URL`

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Import your GitHub repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import Git Repository**
   - Select your repository
   - Click **Import**

2. **Configure your project:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `prisma generate && prisma migrate deploy && next build` (already in vercel.json)
   - **Install Command:** `npm install` (already in vercel.json)
   - **Output Directory:** `.next` (auto-detected)

3. **Add Environment Variables:**
   - Click **Environment Variables**
   - Add the following variables:

   ```
   DATABASE_URL = (Vercel will auto-populate this from POSTGRES_URL)
   OPENAI_API_KEY = sk-your-openai-api-key-here
   NEXTAUTH_URL = https://your-app.vercel.app
   NEXTAUTH_SECRET = (generate with: openssl rand -base64 32)
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   AZURE_AD_CLIENT_ID = your-azure-client-id (if using Azure AD)
   AZURE_AD_CLIENT_SECRET = your-azure-client-secret (if using Azure AD)
   AZURE_AD_TENANT_ID = your-azure-tenant-id (if using Azure AD)
   ```

   **Important:** 
   - Vercel Postgres automatically creates `POSTGRES_URL`, but Prisma needs `DATABASE_URL`
   - In Vercel, you can either:
     a) Add `DATABASE_URL` manually and copy the value from `POSTGRES_URL`
     b) Or update your code to use `POSTGRES_URL` (not recommended)

4. **Link Vercel Postgres:**
   - In the **Storage** tab, make sure your Postgres database is linked to your project
   - Vercel will automatically inject `POSTGRES_URL` as an environment variable

5. **Deploy:**
   - Click **Deploy**
   - Wait for the build to complete

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project:**
   ```bash
   vercel link
   ```

4. **Add environment variables:**
   ```bash
   vercel env add DATABASE_URL
   vercel env add OPENAI_API_KEY
   vercel env add NEXTAUTH_URL
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXT_PUBLIC_APP_URL
   ```

5. **Deploy:**
   ```bash
   vercel --prod
   ```

## Step 4: Configure Database Connection

Since Vercel Postgres provides `POSTGRES_URL` but Prisma expects `DATABASE_URL`, you have two options:

### Option 1: Use POSTGRES_URL as DATABASE_URL (Recommended)

In Vercel Dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Add a new variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Copy the value from `POSTGRES_URL`
   - **Environment:** Production, Preview, Development (select all)

### Option 2: Update Prisma to use POSTGRES_URL

Alternatively, you can update your code to use `POSTGRES_URL`:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("POSTGRES_URL")
   }
   ```

2. Update `src/lib/db.ts` if needed (usually not required)

## Step 5: Run Database Migrations

After deployment, the database migrations will run automatically during build (configured in `vercel.json`).

However, if you need to run migrations manually:

1. **Via Vercel CLI:**
   ```bash
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

2. **Or create a migration script:**
   Create `scripts/migrate.js`:
   ```javascript
   const { execSync } = require('child_process');
   execSync('npx prisma migrate deploy', { stdio: 'inherit' });
   ```

## Step 6: Verify Deployment

1. **Check your deployment:**
   - Visit `https://your-app.vercel.app`
   - Test the interview flow
   - Check the dashboard

2. **Verify database connection:**
   - Go to Vercel Dashboard → **Storage** → Your Postgres database
   - Check that tables are created
   - You can use Prisma Studio: `npx prisma studio` (with production DATABASE_URL)

## Troubleshooting

### Build Fails with Prisma Errors

1. **Ensure DATABASE_URL is set correctly:**
   - Check Vercel Dashboard → Environment Variables
   - Make sure `DATABASE_URL` matches `POSTGRES_URL`

2. **Check build logs:**
   - Go to Vercel Dashboard → Your Deployment → Build Logs
   - Look for Prisma-related errors

### Database Connection Issues

1. **Verify environment variables:**
   ```bash
   vercel env ls
   ```

2. **Test connection locally:**
   ```bash
   vercel env pull .env.local
   npx prisma db pull
   ```

### Migration Issues

If migrations fail:
1. Check that `prisma/migrations` folder exists
2. Ensure `vercel.json` has the correct build command
3. Run migrations manually if needed

## Environment Variables Summary

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (from Vercel Postgres) | Yes |
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `NEXTAUTH_URL` | Your app URL (e.g., https://your-app.vercel.app) | Yes |
| `NEXTAUTH_SECRET` | Secret for NextAuth (generate with `openssl rand -base64 32`) | Yes |
| `NEXT_PUBLIC_APP_URL` | Public app URL | Yes |
| `AZURE_AD_CLIENT_ID` | Azure AD client ID (if using Azure AD auth) | No |
| `AZURE_AD_CLIENT_SECRET` | Azure AD client secret | No |
| `AZURE_AD_TENANT_ID` | Azure AD tenant ID | No |

## Next Steps

- Set up custom domain (optional)
- Configure Azure AD authentication (if needed)
- Set up monitoring and analytics
- Configure backup strategy for your database

## Support

For issues:
- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Prisma Docs: [prisma.io/docs](https://www.prisma.io/docs)
- Vercel Postgres: [vercel.com/docs/storage/vercel-postgres](https://vercel.com/docs/storage/vercel-postgres)

