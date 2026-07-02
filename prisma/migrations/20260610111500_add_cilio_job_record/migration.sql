-- CreateTable
CREATE TABLE "CilioJobRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderNumber" INTEGER NOT NULL,
    "orderStatusDescription" TEXT,
    "jobType" TEXT NOT NULL DEFAULT 'scheduled',
    "storeNumber" TEXT,
    "storeName" TEXT,
    "laborCategoryDescription" TEXT,
    "workroom" TEXT,
    "scheduledInstallDate" TIMESTAMP(3),
    "measureDate" TIMESTAMP(3),
    "bookingDate" TIMESTAMP(3),
    "installerId" TEXT NOT NULL,
    "installerName" TEXT,
    "cilioPayload" JSONB NOT NULL,

    CONSTRAINT "CilioJobRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CilioJobRecord_orderNumber_key" ON "CilioJobRecord"("orderNumber");

-- CreateIndex
CREATE INDEX "CilioJobRecord_installerId_idx" ON "CilioJobRecord"("installerId");

-- CreateIndex
CREATE INDEX "CilioJobRecord_jobType_idx" ON "CilioJobRecord"("jobType");

-- CreateIndex
CREATE INDEX "CilioJobRecord_orderNumber_idx" ON "CilioJobRecord"("orderNumber");

-- CreateIndex
CREATE INDEX "CilioJobRecord_createdAt_idx" ON "CilioJobRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "CilioJobRecord" ADD CONSTRAINT "CilioJobRecord_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
