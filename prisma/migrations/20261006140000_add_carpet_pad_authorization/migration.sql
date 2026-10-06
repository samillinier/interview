-- AlterTable
ALTER TABLE "CarpetPadOrder"
ADD COLUMN "authorizedBy" TEXT,
ADD COLUMN "authorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "authorizationMethod" TEXT;

-- CreateIndex
CREATE INDEX "CarpetPadOrder_authorized_idx" ON "CarpetPadOrder"("authorized");
