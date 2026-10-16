-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN "phoneNumber" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "imei" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "imei2" TEXT;

-- CreateIndex
CREATE INDEX "Inventory_phoneNumber_idx" ON "Inventory"("phoneNumber");
CREATE INDEX "Inventory_imei_idx" ON "Inventory"("imei");
