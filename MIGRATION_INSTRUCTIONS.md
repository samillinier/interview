# Database Migration Instructions

## Issue
The "Failed to update installer" error occurs because the database schema doesn't include the new `companyCounty` and `companyAddress` fields yet.

## Solution

Run the following commands to update your database schema:

```bash
# Generate Prisma client with new schema
npx prisma generate

# Push schema changes to database (for development)
npx prisma db push

# OR create a migration (recommended for production)
npx prisma migrate dev --name add_county_and_address
```

## For Production (Vercel)

If you're deploying to Vercel, the migration will run automatically during the build process if you have `prisma migrate deploy` in your build script, or you can run:

```bash
npx prisma migrate deploy
```

## After Migration

1. Restart your development server if it's running
2. Try saving the installer profile again
3. The error should be resolved

## New Fields Added

- `companyCounty` - String field for county information
- `companyAddress` - String field for full formatted address (used for Google Maps)
