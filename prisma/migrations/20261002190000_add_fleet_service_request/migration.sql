-- CreateTable
CREATE TABLE "FleetServiceRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "attachmentUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "FleetServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FleetServiceRequest_createdAt_idx" ON "FleetServiceRequest"("createdAt");

-- CreateIndex
CREATE INDEX "FleetServiceRequest_requestDate_idx" ON "FleetServiceRequest"("requestDate");

-- CreateIndex
CREATE INDEX "FleetServiceRequest_location_idx" ON "FleetServiceRequest"("location");

-- CreateIndex
CREATE INDEX "FleetServiceRequest_status_idx" ON "FleetServiceRequest"("status");
