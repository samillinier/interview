-- AlterTable: make installerId optional on CilioJobRecord so jobs without matched installers can still be saved
ALTER TABLE "CilioJobRecord" ALTER COLUMN "installerId" DROP NOT NULL;
