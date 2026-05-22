-- Create ComplianceStatus enum (Postgres)
DO $$
BEGIN
  CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NOT_COMPLIANT', 'IN_PROGRESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add complianceStatus field to Installer
ALTER TABLE "Installer" ADD COLUMN IF NOT EXISTS "complianceStatus" "ComplianceStatus";

