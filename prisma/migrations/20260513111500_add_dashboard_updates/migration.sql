CREATE TABLE "DashboardUpdate" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updateNumber" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "photoUrl" TEXT,
  "createdByEmail" TEXT,
  "createdByName" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "DashboardUpdate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DashboardUpdate_createdAt_idx" ON "DashboardUpdate"("createdAt");
CREATE INDEX "DashboardUpdate_isActive_idx" ON "DashboardUpdate"("isActive");
