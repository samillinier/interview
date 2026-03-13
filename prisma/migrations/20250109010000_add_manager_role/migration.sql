-- AlterEnum
-- This migration adds MANAGER to the AdminRole enum
ALTER TYPE "AdminRole" ADD VALUE IF NOT EXISTS 'MANAGER';
