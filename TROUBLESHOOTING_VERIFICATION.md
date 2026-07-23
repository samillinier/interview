# Troubleshooting Email Verification

## If you see "Failed to send verification email" error:

### 1. Regenerate Prisma Client
The Prisma client needs to be regenerated to include the new database columns:

```bash
npx prisma generate
```

### 2. Verify Database Columns Exist
Check that the columns were added:

```bash
sqlite3 prisma/dev.db "PRAGMA table_info(Installer);" | grep -E "(emailVerificationToken|emailVerifiedAt)"
```

You should see:
- `emailVerificationToken` (TEXT)
- `emailVerifiedAt` (DATETIME)
- `passwordResetToken` (TEXT)

### 3. Check Server Logs
Look at your terminal/console where the dev server is running. The error details will be logged there.

### 4. Common Issues

**Issue: "Unknown column" error**
- Solution: Run `npx prisma generate` to regenerate Prisma client

**Issue: "P2025" error (Record not found)**
- Solution: The installer record might not exist. Try creating a new account.

**Issue: Database connection error**
- Solution: Check your `DATABASE_URL` in `.env.local`

### 5. Development Mode
In development, the verification URL is displayed on the page after clicking "Send Verification Email". You can copy this URL and use it directly to test the flow without needing actual email delivery.

### 6. Test the API Directly
You can test the API endpoint directly:

```bash
curl -X POST http://localhost:3000/api/installers/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

This will help identify if the issue is with the API or the frontend.

## Quick Fix Steps

1. Stop your dev server (Ctrl+C)
2. Run: `npx prisma generate`
3. Restart dev server: `npm run dev`
4. Try creating account again

If the issue persists, check the server console for detailed error messages.
