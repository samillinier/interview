ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "usagePlacement" TEXT DEFAULT 'in_use';
UPDATE "Inventory" SET "usagePlacement" = 'in_use' WHERE "usagePlacement" IS NULL;
ALTER TABLE "Inventory" DROP COLUMN IF EXISTS "price";
