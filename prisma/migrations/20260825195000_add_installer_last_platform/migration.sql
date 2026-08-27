-- Track how each installer last accessed the app (native app vs web) and when
ALTER TABLE "Installer" ADD COLUMN "lastPlatform" TEXT;
ALTER TABLE "Installer" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
