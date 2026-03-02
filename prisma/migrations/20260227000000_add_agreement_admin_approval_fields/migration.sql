-- Add admin approval/signature metadata to InstallerAgreement
ALTER TABLE "InstallerAgreement"
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedBy" TEXT,
ADD COLUMN     "adminSignature" TEXT,
ADD COLUMN     "adminSignedDate" TEXT;

-- Helpful index for pending approvals
CREATE INDEX IF NOT EXISTS "InstallerAgreement_status_idx" ON "InstallerAgreement"("status");

