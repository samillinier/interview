-- CreateTable
CREATE TABLE IF NOT EXISTS "Contact" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "category" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Contact_externalId_key" ON "Contact"("externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_category_idx" ON "Contact"("category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_name_idx" ON "Contact"("name");
