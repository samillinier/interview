-- Add magic-link login token columns to Installer
ALTER TABLE "Installer" ADD COLUMN "loginToken" TEXT;
ALTER TABLE "Installer" ADD COLUMN "loginTokenExpiresAt" TIMESTAMP(3);
