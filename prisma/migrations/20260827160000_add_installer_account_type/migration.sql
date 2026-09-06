-- Distinguish "estimator" accounts (self-registered, no AI interview)
-- from regular "installer" accounts.
ALTER TABLE "Installer" ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'installer';
