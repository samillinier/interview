# Use Neon Database for Local Development

## Current Setup

**Production:**
- ✅ Using Neon: `postgresql://neondb_owner:npg_EwDyamW7RUl4@ep-wandering-field-ahyww5ft-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`

**Local:**
- Currently using: SQLite (`file:./dev.db`)

## Option 1: Use Neon Locally (Same Database as Production)

If you want to use the same Neon database for local development:

### Step 1: Update `.env.local`

Replace the SQLite URL with the Neon connection string:

```bash
# OLD (SQLite):
DATABASE_URL="file:./dev.db"

# NEW (Neon - same as production):
DATABASE_URL="postgresql://neondb_owner:npg_EwDyamW7RUl4@ep-wandering-field-ahyww5ft-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Step 2: Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to Neon database
npx prisma db push
```

### Step 3: Restart Dev Server

```bash
npm run dev
```

### ⚠️ Important Notes

**Pros:**
- ✅ Same data as production
- ✅ Can test with real data
- ✅ No need to sync data

**Cons:**
- ⚠️ Local changes affect production data
- ⚠️ Requires internet connection
- ⚠️ Slower than SQLite (network calls)

## Option 2: Keep Separate Databases (Recommended)

**Keep current setup:**
- **Local:** SQLite (fast, isolated)
- **Production:** Neon (cloud, persistent)

This way:
- ✅ Local development doesn't affect production
- ✅ Faster local development
- ✅ Can test without internet

## Option 3: Verify Vercel Configuration

Make sure `DATABASE_URL` in Vercel matches `POSTGRES_URL`:

1. **Go to Vercel Dashboard:**
   - Settings → Environment Variables
   - Check `DATABASE_URL`
   - Should be: `postgresql://neondb_owner:npg_EwDyamW7RUl4@ep-wandering-field-ahyww5ft-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`

2. **If different, update it:**
   - Click Edit on `DATABASE_URL`
   - Paste the connection string
   - Save

## Summary

**Current Production Setup:**
- ✅ Neon database configured
- ✅ Connection string confirmed
- ✅ Data saving to `neondb`

**Choose your local setup:**
- Option A: Use Neon locally (same DB as production)
- Option B: Keep SQLite locally (separate, recommended)

