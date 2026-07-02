-- AlterTable
ALTER TABLE "StaffMember" ADD COLUMN IF NOT EXISTS "expirationDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffMember_status_idx" ON "StaffMember"("status");
