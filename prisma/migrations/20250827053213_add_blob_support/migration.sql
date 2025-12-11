/*
  Warnings:

  - You are about to drop the column `url` on the `Document` table. All the data in the column will be lost.
  - Added the required column `fileData` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `Document` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Document" DROP COLUMN "url",
ADD COLUMN     "fileData" BYTEA NOT NULL,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL;
