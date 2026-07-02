-- CreateTable
CREATE TABLE "PropertySafetyWalk" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "propertyId" TEXT NOT NULL,
  "inspectorName" TEXT NOT NULL,
  "inspectionDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "completionTime" TEXT NOT NULL,
  "workroom" TEXT NOT NULL,
  "comments" TEXT,
  "actionPlan" TEXT,
  "payload" JSONB NOT NULL,
  "analytics" JSONB,

  CONSTRAINT "PropertySafetyWalk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_propertyId_idx" ON "PropertySafetyWalk"("propertyId");

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_inspectionDate_idx" ON "PropertySafetyWalk"("inspectionDate");

-- CreateIndex
CREATE INDEX "PropertySafetyWalk_createdAt_idx" ON "PropertySafetyWalk"("createdAt");

-- AddForeignKey
ALTER TABLE "PropertySafetyWalk"
ADD CONSTRAINT "PropertySafetyWalk_propertyId_fkey"
FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
