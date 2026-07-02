-- Add SUPER_ADMIN role to enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'AdminRole' AND e.enumlabel = 'SUPER_ADMIN'
  ) THEN
    ALTER TYPE "AdminRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END $$;

