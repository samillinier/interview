-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('ADMIN', 'MODERATOR');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "role" "AdminRole" NOT NULL DEFAULT 'ADMIN';

