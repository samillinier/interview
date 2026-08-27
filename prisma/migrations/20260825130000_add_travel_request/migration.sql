-- Add travel request table for employee business travel & accommodation requests
CREATE TABLE "TravelRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    "dateOfRequest" TIMESTAMP(3) NOT NULL,
    "travelerName" TEXT NOT NULL,
    "travelReason" TEXT NOT NULL,
    "chargeWorkroom" TEXT NOT NULL,

    "stayType" TEXT,
    "destinationCity" TEXT,
    "checkInDate" TIMESTAMP(3),
    "checkOutDate" TIMESTAMP(3),
    "stayComments" TEXT,

    "departingFrom" TEXT,
    "arrivingAt" TEXT,
    "departureDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "flightComments" TEXT,

    "vehiclePickupLocation" TEXT,
    "vehicleReturnLocation" TEXT,
    "vehiclePickupDate" TIMESTAMP(3),
    "vehicleReturnDate" TIMESTAMP(3),
    "licenseState" TEXT,
    "licenseNumber" TEXT,
    "carComments" TEXT,
    "rideshareBudget" TEXT,

    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "TravelRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TravelRequest_createdAt_idx" ON "TravelRequest"("createdAt");
CREATE INDEX "TravelRequest_status_idx" ON "TravelRequest"("status");
CREATE INDEX "TravelRequest_chargeWorkroom_idx" ON "TravelRequest"("chargeWorkroom");
CREATE INDEX "TravelRequest_createdByEmail_idx" ON "TravelRequest"("createdByEmail");
