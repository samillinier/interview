-- Add category to group licence records into Corporate → Documents sections
ALTER TABLE "Licence" ADD COLUMN "category" TEXT;

CREATE INDEX "Licence_category_idx" ON "Licence"("category");

