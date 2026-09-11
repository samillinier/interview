-- Track whether a landing-page visitor is currently online
ALTER TABLE "WebsiteChat" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE INDEX "WebsiteChat_lastSeenAt_idx" ON "WebsiteChat"("lastSeenAt");
