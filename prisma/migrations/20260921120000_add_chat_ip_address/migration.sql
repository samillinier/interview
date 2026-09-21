-- AlterTable
ALTER TABLE "Installer" ADD COLUMN IF NOT EXISTS "lastIpAddress" TEXT;

-- AlterTable
ALTER TABLE "WebsiteChat" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
