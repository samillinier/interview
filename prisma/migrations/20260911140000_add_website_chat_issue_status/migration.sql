-- Track whether a website chat issue is open, in progress, solved, or not solved
ALTER TABLE "WebsiteChat" ADD COLUMN "issueStatus" TEXT NOT NULL DEFAULT 'open';
