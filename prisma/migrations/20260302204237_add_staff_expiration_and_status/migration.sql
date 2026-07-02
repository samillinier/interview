-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "expirationDate" TIMESTAMP(3);
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
-- Update existing rows to have 'active' status if status is null
UPDATE "StaffMember" SET "status" = 'active' WHERE "status" IS NULL;
-- Make status NOT NULL after setting defaults
ALTER TABLE "StaffMember" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "StaffMember" ALTER COLUMN "status" SET DEFAULT 'active';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffMember_status_idx" ON "StaffMember"("status");
