# Where Production Data is Saved

## ✅ Production Database: Neon (via Vercel Storage)

**Production data is being saved to:**
- **Neon Database** (PostgreSQL)
- Configured through **Vercel Storage**
- Accessible via Vercel Dashboard

## 📊 Current Setup

### Production (Vercel)
- **Database Type:** Neon (PostgreSQL)
- **Location:** Cloud (Neon servers)
- **Access:** Via Vercel Dashboard → Storage
- **Connection:** Through `DATABASE_URL` environment variable

### Local Development
- **Database Type:** SQLite
- **Location:** `prisma/dev.db` (local file)
- **Separate:** Local data is completely separate from production

## 🔍 How to Verify Where Production Data is Saved

### Step 1: Check Vercel Storage

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `floor-interior-service`

2. **Check Storage:**
   - Click **Storage** tab
   - You should see your Neon database listed
   - Click on it to see:
     - Database name
     - Connection details
     - Data tables

### Step 2: Check Environment Variables

1. **Go to Settings → Environment Variables:**
   - Look for `DATABASE_URL` or `POSTGRES_URL`
   - The connection string should contain `neon.tech` if it's Neon
   - Example: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`

### Step 3: View Production Data

**Option 1: Via Vercel Dashboard**
- Go to **Storage** → Your Neon database
- Use the database viewer to see tables and data

**Option 2: Via Prisma Studio (with production connection)**
1. Get production DATABASE_URL from Vercel
2. Run locally:
   ```bash
   DATABASE_URL="your-production-connection-string" npx prisma studio
   ```
3. This opens a browser to view production data

**Option 3: Test in Production App**
- Visit your production URL
- Create an installer/interview
- Check if it appears in the dashboard
- This confirms data is saving to Neon

## 📝 What Data is Saved

Based on your Prisma schema, production saves:
- **Installers:** All installer information
- **Interviews:** Interview sessions and responses
- **Documents:** Uploaded documents
- **Communications:** Communication logs
- **Screening Criteria:** Prescreening configurations

All this data is stored in the **Neon PostgreSQL database** in production.

## 🎯 Summary

**Production Data Location:**
- ✅ **Neon Database** (PostgreSQL)
- ✅ **Via Vercel Storage**
- ✅ **Cloud-hosted** (accessible from anywhere)
- ✅ **Persistent** (data survives deployments)

**Local Data Location:**
- ✅ **SQLite** (`prisma/dev.db`)
- ✅ **Local file** (only on your computer)
- ✅ **Separate** from production

## ✅ Your Setup is Correct

- ✅ Production uses Neon (cloud database)
- ✅ Local uses SQLite (fast development)
- ✅ Data is being saved correctly
- ✅ Production data is persistent and accessible

This is the recommended setup! 🎉

