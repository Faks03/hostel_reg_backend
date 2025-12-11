-- DropForeignKey
ALTER TABLE "public"."Allocation" DROP CONSTRAINT "Allocation_studentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Document" DROP CONSTRAINT "Document_studentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."HostelRegistration" DROP CONSTRAINT "HostelRegistration_studentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_studentId_fkey";

-- AddForeignKey
ALTER TABLE "public"."HostelRegistration" ADD CONSTRAINT "HostelRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Allocation" ADD CONSTRAINT "Allocation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
