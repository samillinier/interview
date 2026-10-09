-- The original PurchaseRequest migration was later edited to include productUrl
-- after it had already been applied in production, so the column never landed.
ALTER TABLE "PurchaseRequest" ADD COLUMN IF NOT EXISTS "productUrl" TEXT;
