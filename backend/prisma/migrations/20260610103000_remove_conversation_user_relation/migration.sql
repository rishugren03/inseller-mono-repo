ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_userId_fkey";
DROP INDEX IF EXISTS "Conversation_userId_idx";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "userId";
