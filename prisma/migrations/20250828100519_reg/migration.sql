/*
  Warnings:

  - You are about to drop the column `department` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `level` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `matricNumber` on the `HostelRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `HostelRegistration` table. All the data in the column will be lost.
  - The `status` column on the `HostelRegistration` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."HostelRegistration" DROP COLUMN "department",
DROP COLUMN "email",
DROP COLUMN "firstName",
DROP COLUMN "lastName",
DROP COLUMN "level",
DROP COLUMN "matricNumber",
DROP COLUMN "phone",
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'draft';

-- DropEnum
DROP TYPE "public"."HostelRegistrationStatus";

-- AddForeignKey
ALTER TABLE "public"."HostelRegistration" ADD CONSTRAINT "HostelRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
