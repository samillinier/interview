-- Track whether a saved contractor was contacted, offered, contracted, or declined
ALTER TABLE "MarketingLead" ADD COLUMN "outreachStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "MarketingLead" ADD COLUMN "remark" TEXT;

CREATE INDEX "MarketingLead_outreachStatus_idx" ON "MarketingLead"("outreachStatus");
