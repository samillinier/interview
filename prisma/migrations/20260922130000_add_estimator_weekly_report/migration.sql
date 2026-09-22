-- CreateTable
CREATE TABLE IF NOT EXISTS "EstimatorWeeklyReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "subcontractorName" TEXT NOT NULL,
    "weekEnding" TIMESTAMP(3) NOT NULL,
    "lines" JSONB NOT NULL,
    CONSTRAINT "EstimatorWeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EstimatorWeeklyReport_installerId_weekEnding_idx" ON "EstimatorWeeklyReport"("installerId", "weekEnding");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "EstimatorWeeklyReport"
    ADD CONSTRAINT "EstimatorWeeklyReport_installerId_fkey"
    FOREIGN KEY ("installerId") REFERENCES "Installer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
