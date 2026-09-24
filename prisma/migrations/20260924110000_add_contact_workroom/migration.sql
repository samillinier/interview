-- AlterTable
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "workroom" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_workroom_idx" ON "Contact"("workroom");
