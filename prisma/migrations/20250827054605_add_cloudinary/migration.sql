/*
  Warnings:

  - You are about to drop the column `fileData` on the `Document` table. All the data in the column will be lost.
  - Added the required column `fileUrl` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "fileData",
ADD COLUMN     "fileUrl" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'pending';
