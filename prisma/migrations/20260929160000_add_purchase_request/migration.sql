-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateRequested" TIMESTAMP(3) NOT NULL,
    "priority" TEXT,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT,
    "reason" TEXT,
    "priceRange" TEXT,
    "neededByDate" TIMESTAMP(3),
    "purchaseMethod" TEXT NOT NULL DEFAULT 'corporate',
    "purchaseMethodNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdAt_idx" ON "PurchaseRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_dateRequested_idx" ON "PurchaseRequest"("dateRequested");

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdByEmail_idx" ON "PurchaseRequest"("createdByEmail");
