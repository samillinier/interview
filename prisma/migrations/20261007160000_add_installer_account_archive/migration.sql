-- AlterTable
ALTER TABLE "Installer" ADD COLUMN "accountDeletedAt" TIMESTAMP(3),
ADD COLUMN "accountDeletedPreviousStatus" TEXT;

-- CreateIndex
CREATE INDEX "Installer_accountDeletedAt_idx" ON "Installer"("accountDeletedAt");
