-- AlterEnum
-- This migration adds MANAGER to the AdminRole enum
-- NOTE: In some environments this migration can run before the enum exists
-- (e.g. shadow DB / reset flows). Guard so migrate dev can apply all migrations cleanly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname IN ('AdminRole', 'adminrole')) THEN
    ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'MANAGER';
  END IF;
END $$;
