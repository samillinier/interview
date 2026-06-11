-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customer" TEXT,
    "jobNumber" TEXT,
    "workroom" TEXT,
    "installationDate" TIMESTAMP(3),
    "installerId" TEXT,
    "installerName" TEXT,
    "category" TEXT,
    "claimNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dateOfLoss" TIMESTAMP(3),
    "damage" TEXT,
    "amount" DECIMAL(12,2),
    "updateNotes" TEXT,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Claim_installerId_idx" ON "Claim"("installerId");

-- CreateIndex
CREATE INDEX "Claim_status_idx" ON "Claim"("status");

-- CreateIndex
CREATE INDEX "Claim_claimNumber_idx" ON "Claim"("claimNumber");

-- CreateIndex
CREATE INDEX "Claim_jobNumber_idx" ON "Claim"("jobNumber");

-- CreateIndex
CREATE INDEX "Claim_workroom_idx" ON "Claim"("workroom");

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
