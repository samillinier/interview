-- Track when a contractor opt-in email was sent from Marketing
ALTER TABLE "MarketingLead" ADD COLUMN "emailOptInSentAt" TIMESTAMP(3);
