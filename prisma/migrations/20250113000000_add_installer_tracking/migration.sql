-- CreateTable
CREATE TABLE "InstallerTracking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "installerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "category" TEXT,
    "metadata" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "InstallerTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstallerTracking_installerId_idx" ON "InstallerTracking"("installerId");

-- CreateIndex
CREATE INDEX "InstallerTracking_status_idx" ON "InstallerTracking"("status");

-- CreateIndex
CREATE INDEX "InstallerTracking_type_idx" ON "InstallerTracking"("type");

-- CreateIndex
CREATE INDEX "InstallerTracking_createdAt_idx" ON "InstallerTracking"("createdAt");

-- CreateIndex
CREATE INDEX "InstallerTracking_priority_idx" ON "InstallerTracking"("priority");

-- AddForeignKey
ALTER TABLE "InstallerTracking" ADD CONSTRAINT "InstallerTracking_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
