-- CreateTable
CREATE TABLE "GpsTelemetryReset" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "engineHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mileageKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsTelemetryReset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GpsTelemetryReset_deviceKey_key" ON "GpsTelemetryReset"("deviceKey");

-- CreateIndex
CREATE INDEX "GpsTelemetryReset_deviceKey_idx" ON "GpsTelemetryReset"("deviceKey");
