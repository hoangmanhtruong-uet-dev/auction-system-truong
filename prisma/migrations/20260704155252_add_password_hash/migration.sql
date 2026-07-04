-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "password_hash" TEXT,
ALTER COLUMN "email_verified" SET DEFAULT true;