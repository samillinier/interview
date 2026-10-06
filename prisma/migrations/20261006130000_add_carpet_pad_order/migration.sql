-- CreateTable
CREATE TABLE "CarpetPadOrder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "orderClassification" TEXT NOT NULL,
    "recycledBalesPickup" TEXT NOT NULL,
    "recycledBalesCount" INTEGER,
    "reviewedPreviousOrders" TEXT NOT NULL,
    "superSixLbRolls" INTEGER,
    "stainmasterSelectRolls" INTEGER,
    "odorBanRolls" INTEGER,
    "stainmasterEliteRolls" INTEGER,
    "stainmasterMemoryFoamRolls" INTEGER,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "CarpetPadOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarpetPadOrder_createdAt_idx" ON "CarpetPadOrder"("createdAt");

-- CreateIndex
CREATE INDEX "CarpetPadOrder_location_idx" ON "CarpetPadOrder"("location");

-- CreateIndex
CREATE INDEX "CarpetPadOrder_orderClassification_idx" ON "CarpetPadOrder"("orderClassification");

-- CreateIndex
CREATE INDEX "CarpetPadOrder_createdByEmail_idx" ON "CarpetPadOrder"("createdByEmail");
