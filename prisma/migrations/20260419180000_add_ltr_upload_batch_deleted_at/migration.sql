-- Soft-delete survey uploads for admin UI only (installers keep sent copies).
ALTER TABLE "LtrUploadBatch" ADD COLUMN "deletedAt" TIMESTAMP(3);
