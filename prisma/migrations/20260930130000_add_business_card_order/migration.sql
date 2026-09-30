-- CreateTable
CREATE TABLE "BusinessCardOrder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "workroom" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "businessPhone" TEXT,
    "jobTitle" TEXT,
    "emailAddress" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 500,
    "sendEmailReceipt" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "BusinessCardOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCardOrder_createdAt_idx" ON "BusinessCardOrder"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessCardOrder_status_idx" ON "BusinessCardOrder"("status");

-- CreateIndex
CREATE INDEX "BusinessCardOrder_workroom_idx" ON "BusinessCardOrder"("workroom");

-- CreateIndex
CREATE INDEX "BusinessCardOrder_createdByEmail_idx" ON "BusinessCardOrder"("createdByEmail");
