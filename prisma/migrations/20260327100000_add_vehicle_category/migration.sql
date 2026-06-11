-- Add optional vehicle category for fleet filtering (e.g. cat, forklift)
ALTER TABLE "Vehicle"
ADD COLUMN "category" TEXT;

CREATE INDEX "Vehicle_category_idx" ON "Vehicle"("category");
