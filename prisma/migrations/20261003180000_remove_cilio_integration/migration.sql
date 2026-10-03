-- Remove Cilio integration: drop the three Cilio tables and the Installer column.
-- Data in these tables was already purged; tables are empty and safe to drop.
DROP TABLE IF EXISTS "CilioJobRecord" CASCADE;
DROP TABLE IF EXISTS "CilioGeoMetric" CASCADE;
DROP TABLE IF EXISTS "CilioSyncState" CASCADE;
ALTER TABLE "Installer" DROP COLUMN IF EXISTS "cilioEnterpriseGroupNumber";
