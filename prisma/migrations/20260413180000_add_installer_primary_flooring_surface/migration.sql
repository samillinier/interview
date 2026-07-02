-- Installer: single "strongest" flooring surface from voice interview (after multi-select skills).
ALTER TABLE "Installer" ADD COLUMN IF NOT EXISTS "primaryFlooringSurface" TEXT;
