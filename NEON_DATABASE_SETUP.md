# Set Up Neon Database

## Current Status

**Local Development:**
- Currently using: **SQLite** (`file:./dev.db`)
- Data is saved locally in `prisma/dev.db` file
- ✅ Data is being saved, but only locally

**Production:**
- Configured for: **Vercel Postgres** (not Neon)
- No Neon database configured yet

## 🔄 Switch to Neon Database

If you want to use Neon (serverless PostgreSQL) instead:

### Step 1: Create Neon Database

1. **Go to Neon Console:**
   - Visit: https://console.neon.tech
   - Sign up or log in

2. **Create a new project:**
   - Click "Create Project"
   - Choose a name (e.g., "FIS Recruitment")
   - Select a region
   - Click "Create Project"

3. **Get Connection String:**
   - After creating, you'll see a connection string
   - It looks like: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - Copy this connection string

### Step 2: Update `.env.local`

Replace the SQLite URL with your Neon connection string:

```bash
# OLD (SQLite):
DATABASE_URL="file:./dev.db"

# NEW (Neon):
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

### Step 3: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to Neon database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name init
```

### Step 4: Verify Connection

```bash
# Open Prisma Studio to view data
npx prisma studio
```

This will open a browser where you can see your data in Neon.

## 📊 Current Database Status

**Local (SQLite):**
- ✅ Data is being saved
- Location: `prisma/dev.db` (233KB file exists)
- All installer and interview data is stored here

**If you switch to Neon:**
- Data will be saved to Neon's cloud PostgreSQL
- Accessible from anywhere
- Better for production and team collaboration
- Can migrate existing SQLite data to Neon

## 🔄 Migrate Existing Data to Neon

If you have data in SQLite and want to move it to Neon:

1. **Export from SQLite:**
   ```bash
   # This is complex - Prisma doesn't have direct migration tool
   # You might need to export/import manually or use a tool
   ```

2. **Or start fresh:**
   - Just switch DATABASE_URL to Neon
   - Run `prisma db push`
   - New data will go to Neon

## ✅ Benefits of Neon

- **Serverless**: Scales automatically
- **Free tier**: Generous free tier available
- **PostgreSQL**: Full PostgreSQL features
- **Branching**: Database branching for testing
- **Better for production**: More reliable than SQLite

## 🎯 Quick Decision

**Keep SQLite if:**
- Only developing locally
- Don't need cloud access
- Want simple setup

**Switch to Neon if:**
- Need cloud database
- Planning to deploy
- Want team collaboration
- Need production-ready database

## 📝 After Setting Up Neon

1. Update `.env.local` with Neon connection string
2. Run `npx prisma db push`
3. Restart your dev server
4. Data will now save to Neon instead of SQLite

