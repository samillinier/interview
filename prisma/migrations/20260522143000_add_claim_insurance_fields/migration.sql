-- AlterTable
ALTER TABLE "Claim" ADD COLUMN "lowesClaimNumber" TEXT;
ALTER TABLE "Claim" ADD COLUMN "insuranceCompany" TEXT;
ALTER TABLE "Claim" ADD COLUMN "adjusterName" TEXT;
ALTER TABLE "Claim" ADD COLUMN "adjusterPhone" TEXT;
ALTER TABLE "Claim" ADD COLUMN "adjusterEmail" TEXT;

-- CreateIndex
CREATE INDEX "Claim_lowesClaimNumber_idx" ON "Claim"("lowesClaimNumber");

-- CreateTable
CREATE TABLE "ClaimDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ClaimDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClaimDocument_claimId_idx" ON "ClaimDocument"("claimId");

-- AddForeignKey
ALTER TABLE "ClaimDocument" ADD CONSTRAINT "ClaimDocument_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
