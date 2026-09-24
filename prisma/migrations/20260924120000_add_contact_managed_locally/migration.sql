-- AlterTable
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "managedLocally" BOOLEAN NOT NULL DEFAULT false;
