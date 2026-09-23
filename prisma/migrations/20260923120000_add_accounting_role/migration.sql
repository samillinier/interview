-- AlterEnum: add ACCOUNTING to AdminRole
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname IN ('AdminRole', 'adminrole')) THEN
    ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'ACCOUNTING';
  END IF;
END $$;
