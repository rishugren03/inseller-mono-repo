CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "firebaseUid" TEXT NOT NULL,
  "email" TEXT,
  "displayName" TEXT,
  "photoUrl" TEXT,
  "authProvider" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_firebaseUid_key" ON "User"("firebaseUid");

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Store' AND column_name = 'ownerUid'
  ) THEN
    INSERT INTO "User" ("id", "firebaseUid", "createdAt", "updatedAt")
    SELECT gen_random_uuid()::TEXT, "ownerUid", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM (SELECT DISTINCT "ownerUid" FROM "Store" WHERE "ownerUid" IS NOT NULL) owned_stores
    ON CONFLICT ("firebaseUid") DO NOTHING;

    UPDATE "Store"
    SET "userId" = "User"."id"
    FROM "User"
    WHERE "Store"."ownerUid" = "User"."firebaseUid";
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Store_userId_idx" ON "Store"("userId");
CREATE INDEX IF NOT EXISTS "Conversation_storeId_idx" ON "Conversation"("storeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Store_userId_fkey'
  ) THEN
    ALTER TABLE "Store"
      ADD CONSTRAINT "Store_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

END $$;
