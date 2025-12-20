# Vercel Deployment Checklist

Quick checklist for deploying to Vercel with Vercel Postgres.

## Pre-Deployment

- [ ] Code is pushed to GitHub
- [ ] All environment variables are documented
- [ ] `vercel.json` is configured correctly
- [ ] Prisma schema is ready for PostgreSQL

## Vercel Setup

- [ ] Create Vercel account (if needed)
- [ ] Import GitHub repository to Vercel
- [ ] Create Vercel Postgres database
- [ ] Link Postgres database to project

## Environment Variables

- [ ] `DATABASE_URL` - Copy value from `POSTGRES_URL`
- [ ] `OPENAI_API_KEY` - Your OpenAI API key
- [ ] `NEXTAUTH_URL` - Your Vercel app URL (e.g., `https://your-app.vercel.app`)
- [ ] `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel app URL
- [ ] `AZURE_AD_CLIENT_ID` - (Optional, if using Azure AD)
- [ ] `AZURE_AD_CLIENT_SECRET` - (Optional, if using Azure AD)
- [ ] `AZURE_AD_TENANT_ID` - (Optional, if using Azure AD)

## Deployment

- [ ] Click "Deploy" in Vercel Dashboard
- [ ] Wait for build to complete
- [ ] Check build logs for any errors
- [ ] Verify database migrations ran successfully

## Post-Deployment Verification

- [ ] Visit your deployed app URL
- [ ] Test interview flow
- [ ] Check dashboard loads correctly
- [ ] Verify database connection (check Vercel Storage → Postgres)
- [ ] Test authentication (if configured)

## Troubleshooting

If build fails:
- [ ] Check `DATABASE_URL` matches `POSTGRES_URL`
- [ ] Verify all required environment variables are set
- [ ] Check build logs in Vercel Dashboard
- [ ] Ensure `vercel.json` build command is correct

If database issues:
- [ ] Verify Postgres database is linked to project
- [ ] Check `DATABASE_URL` environment variable
- [ ] Run migrations manually if needed: `npx prisma migrate deploy`

## Quick Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Pull Vercel environment variables locally
vercel env pull .env.local

# Run migrations manually
npx prisma migrate deploy

# Check Vercel environment variables
vercel env ls
```

---

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

