-- CreateTable
CREATE TABLE "ForkliftInspection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "forkliftId" TEXT NOT NULL,
    "leaks" TEXT,
    "tiresWheelsAxles" TEXT,
    "forksPoleSafetyPin" TEXT,
    "overheadGuard" TEXT,
    "batteryCableConnector" TEXT,
    "mechanicalSafetyDevices" TEXT,
    "operatorControls" TEXT,
    "indicatorLightsAlarmsGauges" TEXT,
    "electricalSafetyDevices" TEXT,
    "mastChainHydraulics" TEXT,
    "steering" TEXT,
    "headBrakeLights" TEXT,
    "brakes" TEXT,
    "engineOil" TEXT,
    "radiatorWater" TEXT,
    "comments" TEXT,
    "inspectionStatement" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "ForkliftInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForkliftInspection_createdAt_idx" ON "ForkliftInspection"("createdAt");

-- CreateIndex
CREATE INDEX "ForkliftInspection_inspectionDate_idx" ON "ForkliftInspection"("inspectionDate");

-- CreateIndex
CREATE INDEX "ForkliftInspection_location_idx" ON "ForkliftInspection"("location");

-- CreateIndex
CREATE INDEX "ForkliftInspection_createdByEmail_idx" ON "ForkliftInspection"("createdByEmail");
