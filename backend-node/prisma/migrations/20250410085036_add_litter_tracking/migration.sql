-- AlterTable
ALTER TABLE "plogging_sessions" ADD COLUMN     "points" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "collectedLitters" JSONB DEFAULT '{}';
