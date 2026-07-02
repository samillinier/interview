-- CreateEnum
CREATE TYPE "LocationDocumentCategory" AS ENUM ('lease', 'misc');

-- CreateTable
CREATE TABLE "LocationDocument" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "LocationDocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "LocationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationDocument_locationId_idx" ON "LocationDocument"("locationId");

-- CreateIndex
CREATE INDEX "LocationDocument_category_idx" ON "LocationDocument"("category");

-- AddForeignKey
ALTER TABLE "LocationDocument" ADD CONSTRAINT "LocationDocument_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

