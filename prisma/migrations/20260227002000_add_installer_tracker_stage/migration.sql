-- Add Installer tracker stage to support the installer "Installer Tracker Status" UI

DO $$ BEGIN
  CREATE TYPE "InstallerTrackerStage" AS ENUM (
    'PENDING',
    'QUALIFIED',
    'WAITING_FOR_APPROVAL',
    'VERIFICATION_IN_PROGRESS',
    'BACKGROUND',
    'ACTIVE_APPROVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Installer"
ADD COLUMN IF NOT EXISTS "trackerStage" "InstallerTrackerStage" NOT NULL DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "Installer_trackerStage_idx" ON "Installer"("trackerStage");

