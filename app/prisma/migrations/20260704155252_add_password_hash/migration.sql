/*
  Warnings:

  - Added the required column `password_hash` to the `profiles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "password_hash" TEXT NOT NULL,
ALTER COLUMN "email_verified" SET DEFAULT true;
