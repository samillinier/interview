-- CreateTable
CREATE TABLE "InstallerAgreement" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "installerId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "payload" JSONB NOT NULL,
  "signedAt" TIMESTAMP(3),

  CONSTRAINT "InstallerAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstallerAgreement_installerId_type_key" ON "InstallerAgreement"("installerId", "type");

-- CreateIndex
CREATE INDEX "InstallerAgreement_installerId_idx" ON "InstallerAgreement"("installerId");

-- CreateIndex
CREATE INDEX "InstallerAgreement_type_idx" ON "InstallerAgreement"("type");

-- CreateIndex
CREATE INDEX "InstallerAgreement_status_idx" ON "InstallerAgreement"("status");

-- AddForeignKey
ALTER TABLE "InstallerAgreement" ADD CONSTRAINT "InstallerAgreement_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

