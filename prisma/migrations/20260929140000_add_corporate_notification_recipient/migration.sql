-- CreateTable
CREATE TABLE "CorporateNotificationRecipient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kind" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CorporateNotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateNotificationRecipient_kind_idx" ON "CorporateNotificationRecipient"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateNotificationRecipient_kind_email_key" ON "CorporateNotificationRecipient"("kind", "email");
