-- CreateTable
CREATE TABLE "ApparelOrder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "workroom" TEXT NOT NULL,
    "employeeName" TEXT,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdByEmail" TEXT,
    "createdByName" TEXT,

    CONSTRAINT "ApparelOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApparelOrder_createdAt_idx" ON "ApparelOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ApparelOrder_status_idx" ON "ApparelOrder"("status");

-- CreateIndex
CREATE INDEX "ApparelOrder_workroom_idx" ON "ApparelOrder"("workroom");

-- CreateIndex
CREATE INDEX "ApparelOrder_createdByEmail_idx" ON "ApparelOrder"("createdByEmail");
