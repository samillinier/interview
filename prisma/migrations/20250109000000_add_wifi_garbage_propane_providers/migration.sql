-- AlterTable
-- NOTE: In some environments this migration can run before the "Location" table exists
-- (e.g. shadow DB / reset flows). Guard so migrate dev can apply all migrations cleanly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Location'
  ) THEN
    ALTER TABLE "Location"
      ADD COLUMN IF NOT EXISTS "wifiName" TEXT,
      ADD COLUMN IF NOT EXISTS "garbageProvider" TEXT,
      ADD COLUMN IF NOT EXISTS "propaneProvider" TEXT;
  END IF;
END $$;
