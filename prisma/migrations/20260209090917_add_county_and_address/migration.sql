-- AlterTable
ALTER TABLE "Installer" ADD COLUMN IF NOT EXISTS "companyCounty" TEXT,
ADD COLUMN IF NOT EXISTS "companyAddress" TEXT;
