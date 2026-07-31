-- CreateTable
CREATE TABLE "GpsDeviceAlias" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GpsDeviceAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GpsDeviceAlias_deviceKey_key" ON "GpsDeviceAlias"("deviceKey");

-- CreateIndex
CREATE INDEX "GpsDeviceAlias_deviceKey_idx" ON "GpsDeviceAlias"("deviceKey");
