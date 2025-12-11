/*
  Warnings:

  - You are about to drop the column `name` on the `Student` table. All the data in the column will be lost.
  - Added the required column `department` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstname` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastname` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Student" DROP COLUMN "name",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "firstname" TEXT NOT NULL,
ADD COLUMN     "lastname" TEXT NOT NULL;
