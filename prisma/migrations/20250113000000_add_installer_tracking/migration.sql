-- CreateTable
CREATE TABLE "InstallerTracking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "category" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "InstallerTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallerTracking_installerId_idx" ON "InstallerTracking"("installerId");

-- CreateIndex
CREATE INDEX "InstallerTracking_status_idx" ON "InstallerTracking"("status");

-- CreateIndex
CREATE INDEX "InstallerTracking_type_idx" ON "InstallerTracking"("type");

-- CreateIndex
CREATE INDEX "InstallerTracking_createdAt_idx" ON "InstallerTracking"("createdAt");

-- CreateIndex
CREATE INDEX "InstallerTracking_priority_idx" ON "InstallerTracking"("priority");

-- AddForeignKey
-- NOTE: In some environments this migration can run before the "Installer" table exists
-- (e.g. shadow DB / reset flows). Guard so migrate dev can apply all migrations cleanly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Installer'
  ) THEN
    ALTER TABLE "InstallerTracking"
      ADD CONSTRAINT "InstallerTracking_installerId_fkey"
      FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
