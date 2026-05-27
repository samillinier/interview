-- CreateTable
CREATE TABLE "LicenceDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "licenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "LicenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LicenceDocument_licenceId_idx" ON "LicenceDocument"("licenceId");

-- AddForeignKey
ALTER TABLE "LicenceDocument" ADD CONSTRAINT "LicenceDocument_licenceId_fkey" FOREIGN KEY ("licenceId") REFERENCES "Licence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
