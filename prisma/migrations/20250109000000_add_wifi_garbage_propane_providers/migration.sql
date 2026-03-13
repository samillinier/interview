-- AlterTable
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "wifiName" TEXT,
ADD COLUMN IF NOT EXISTS "garbageProvider" TEXT,
ADD COLUMN IF NOT EXISTS "propaneProvider" TEXT;
