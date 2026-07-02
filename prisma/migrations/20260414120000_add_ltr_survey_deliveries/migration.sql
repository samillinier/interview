-- CreateTable
CREATE TABLE "LtrSurveyDelivery" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "installerId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "workroom" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "installer" TEXT NOT NULL,
    "sentByEmail" TEXT,

    CONSTRAINT "LtrSurveyDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LtrSurveyDelivery_installerId_createdAt_idx" ON "LtrSurveyDelivery"("installerId", "createdAt");

-- CreateIndex
CREATE INDEX "LtrSurveyDelivery_batchId_idx" ON "LtrSurveyDelivery"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "LtrSurveyDelivery_installerId_batchId_workroom_company_installer_key" ON "LtrSurveyDelivery"("installerId", "batchId", "workroom", "company", "installer");

-- AddForeignKey
ALTER TABLE "LtrSurveyDelivery" ADD CONSTRAINT "LtrSurveyDelivery_installerId_fkey" FOREIGN KEY ("installerId") REFERENCES "Installer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LtrSurveyDelivery" ADD CONSTRAINT "LtrSurveyDelivery_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "LtrUploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

