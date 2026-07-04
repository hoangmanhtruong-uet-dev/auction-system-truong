-- AlterTable
ALTER TABLE "profiles" 
ADD COLUMN "address" TEXT,
ADD COLUMN "city" VARCHAR(100),
ADD COLUMN "gender" VARCHAR(10),
ADD COLUMN "birthday" DATE,
ADD COLUMN "bio" TEXT;

-- CreateTable
CREATE TABLE "user_preferences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" UUID NOT NULL,
  "receive_email_marketing" BOOLEAN NOT NULL DEFAULT true,
  "receive_email_auction" BOOLEAN NOT NULL DEFAULT true,
  "receive_email_notification" BOOLEAN NOT NULL DEFAULT true,
  "dark_mode" BOOLEAN NOT NULL DEFAULT false,
  "locale" VARCHAR(10) NOT NULL DEFAULT 'vi-VN',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_preferences_profile_id" ON "user_preferences"("profile_id");

-- CreateIndex
CREATE INDEX "idx_user_preferences_profile_id" ON "user_preferences"("profile_id");

-- AddForeignKey
ALTER TABLE "user_preferences" 
ADD CONSTRAINT "user_preferences_profile_id_fkey" 
FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;