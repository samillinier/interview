-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "assignedLocation" TEXT NOT NULL,
    "makeModel" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "headlightsTailLights" TEXT,
    "brakeLights" TEXT,
    "signalHazardLights" TEXT,
    "autoGlassMirrors" TEXT,
    "wipers" TEXT,
    "brakes" TEXT,
    "horn" TEXT,
    "seatBelts" TEXT,
    "tires" TEXT,
    "firstAidKit" TEXT,
    "fireExtinguisher" TEXT,
    "insuranceRegistration" TEXT,
    "licensePlateSticker" TEXT,
    "cleanedRegularly" TEXT,
    "currentMileage" DOUBLE PRECISION,
    "nextOilChangeDate" TIMESTAMP(3),
    "nextOilChangeMileage" DOUBLE PRECISION,
    "comments" TEXT,
    "inspectionStatement" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VehicleInspection_createdAt_idx" ON "VehicleInspection"("createdAt");

-- CreateIndex
CREATE INDEX "VehicleInspection_inspectionDate_idx" ON "VehicleInspection"("inspectionDate");

-- CreateIndex
CREATE INDEX "VehicleInspection_assignedLocation_idx" ON "VehicleInspection"("assignedLocation");

-- CreateIndex
CREATE INDEX "VehicleInspection_createdByEmail_idx" ON "VehicleInspection"("createdByEmail");
