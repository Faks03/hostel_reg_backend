-- CreateEnum
CREATE TYPE "public"."HostelRegistrationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."HostelRegistration" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "matricNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "preferredBlock" TEXT,
    "specialRequests" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "emergencyContactRelation" TEXT,
    "status" "public"."HostelRegistrationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelRegistration_studentId_key" ON "public"."HostelRegistration"("studentId");
