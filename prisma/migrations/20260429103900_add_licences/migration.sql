-- CreateTable
CREATE TABLE "Licence" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "county" TEXT,
    "city" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "areas" TEXT,
    "licenceType" TEXT,
    "licenceNumber" TEXT,
    "licenceExpirationDate" TIMESTAMP(3),
    "lastPaymentDate" TIMESTAMP(3),
    "cost" DECIMAL(12,2),
    "bondRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "competenceCardsNotes" TEXT,
    "businessTaxOccLicenceNumber" TEXT,
    "taxOccExpirationDate" TIMESTAMP(3),
    "taxOccCost" DECIMAL(12,2),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "Licence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Licence_isActive_idx" ON "Licence"("isActive");

-- CreateIndex
CREATE INDEX "Licence_licenceNumber_idx" ON "Licence"("licenceNumber");

-- CreateIndex
CREATE INDEX "Licence_county_idx" ON "Licence"("county");

-- CreateIndex
CREATE INDEX "Licence_city_idx" ON "Licence"("city");

-- CreateIndex
CREATE INDEX "Licence_licenceType_idx" ON "Licence"("licenceType");

