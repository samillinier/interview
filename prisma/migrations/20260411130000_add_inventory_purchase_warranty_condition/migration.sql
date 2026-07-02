ALTER TABLE "Inventory"
ADD COLUMN "purchaseDate" TIMESTAMP(3),
ADD COLUMN "warrantyDate" TIMESTAMP(3),
ADD COLUMN "condition" TEXT,
ADD COLUMN "maintenanceNotes" TEXT;
