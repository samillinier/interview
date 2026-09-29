-- CreateTable
CREATE TABLE "OfficeSupplyOrder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "workroom" TEXT NOT NULL,
    "priority" TEXT,
    "items" JSONB NOT NULL,
    "additionalItems" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "OfficeSupplyOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OfficeSupplyOrder_createdAt_idx" ON "OfficeSupplyOrder"("createdAt");

-- CreateIndex
CREATE INDEX "OfficeSupplyOrder_status_idx" ON "OfficeSupplyOrder"("status");

-- CreateIndex
CREATE INDEX "OfficeSupplyOrder_workroom_idx" ON "OfficeSupplyOrder"("workroom");

-- CreateIndex
CREATE INDEX "OfficeSupplyOrder_createdByEmail_idx" ON "OfficeSupplyOrder"("createdByEmail");
