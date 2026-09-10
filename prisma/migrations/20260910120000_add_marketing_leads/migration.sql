-- Admin marketing crawler leads
CREATE TABLE "MarketingLead" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "query" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "websiteHost" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "state" TEXT,
    "services" TEXT,
    "contactUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "licenseInfo" TEXT,
    "keywords" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "sourceUrl" TEXT,
    "snippet" TEXT,
    "savedByEmail" TEXT,

    CONSTRAINT "MarketingLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingLead_websiteHost_key" ON "MarketingLead"("websiteHost");
CREATE INDEX "MarketingLead_score_idx" ON "MarketingLead"("score");
CREATE INDEX "MarketingLead_createdAt_idx" ON "MarketingLead"("createdAt");
CREATE INDEX "MarketingLead_query_idx" ON "MarketingLead"("query");
