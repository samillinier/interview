-- Ensure GpsPosition exists (may have been created via db push earlier)
CREATE TABLE IF NOT EXISTS "GpsPosition" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "altitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GpsPosition_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GpsPosition_deviceId_fkey'
  ) THEN
    ALTER TABLE "GpsPosition"
      ADD CONSTRAINT "GpsPosition_deviceId_fkey"
      FOREIGN KEY ("deviceId") REFERENCES "GpsDevice"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- GpsDevice missing in this environment
END $$;

CREATE INDEX IF NOT EXISTS "GpsPosition_deviceId_timestamp_idx"
  ON "GpsPosition"("deviceId", "timestamp");

CREATE INDEX IF NOT EXISTS "GpsPosition_timestamp_idx"
  ON "GpsPosition"("timestamp");

-- Deduplicate any existing (deviceId, timestamp) rows before unique index
DELETE FROM "GpsPosition" a
USING "GpsPosition" b
WHERE a."deviceId" = b."deviceId"
  AND a."timestamp" = b."timestamp"
  AND a."id" > b."id";

CREATE UNIQUE INDEX IF NOT EXISTS "GpsPosition_deviceId_timestamp_key"
  ON "GpsPosition"("deviceId", "timestamp");
