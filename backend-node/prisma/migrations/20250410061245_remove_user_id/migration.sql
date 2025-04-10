/*
  Warnings:

  - The primary key for the `badges` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `challenges` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `plogging_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `token_blacklist` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user_badges` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "plogging_sessions" DROP CONSTRAINT "plogging_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_badgeId_fkey";

-- DropForeignKey
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_userId_fkey";

-- DropIndex
DROP INDEX "users_userId_key";

-- AlterTable
ALTER TABLE "badges" DROP CONSTRAINT "badges_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "badges_id_seq";

-- AlterTable
ALTER TABLE "challenges" DROP CONSTRAINT "challenges_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "challenges_id_seq";

-- AlterTable
ALTER TABLE "plogging_sessions" DROP CONSTRAINT "plogging_sessions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "plogging_sessions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "plogging_sessions_id_seq";

-- AlterTable
ALTER TABLE "token_blacklist" DROP CONSTRAINT "token_blacklist_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "token_blacklist_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "token_blacklist_id_seq";

-- AlterTable
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ALTER COLUMN "badgeId" SET DATA TYPE TEXT,
ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "user_badges_id_seq";

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "userId",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "users_id_seq";

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plogging_sessions" ADD CONSTRAINT "plogging_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
