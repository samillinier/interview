-- AlterTable
ALTER TABLE "InstallerTracking" ADD COLUMN "matrixSortOrder" INTEGER NOT NULL DEFAULT 0;

-- Unique stable order for existing onboarding matrix rows (0 .. n-1 by createdAt)
WITH numbered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) - 1)::integer AS ord
  FROM "InstallerTracking"
  WHERE type = 'matrix_manual'
)
UPDATE "InstallerTracking" AS i
SET "matrixSortOrder" = n.ord
FROM numbered AS n
WHERE i.id = n.id;

-- CreateIndex
CREATE INDEX "InstallerTracking_type_matrixSortOrder_idx" ON "InstallerTracking"("type", "matrixSortOrder");
