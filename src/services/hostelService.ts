// src/services/hostelRegistrationService.ts

import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

// Define a type for the registration data
export type HostelRegistrationData = Prisma.HostelRegistrationCreateInput;

// Function to get a student's hostel registration status
export const getRegistrationStatus = async (studentId: number) => {
  try {
    const registration = await prisma.hostelRegistration.findUnique({
      where: { studentId },
      include: {
        student: {
          include: {
            documents: true, // ✅ include student documents
            allocation: {
              include: {
                room: true, // ✅ so we can access roomId and room details
              },
            },
          },
        },
      },
    });

    if (!registration) {
      throw new Error("No existing registration found");
    }

    // ✅ Extract roomId from allocation (if exists)
    const roomId = registration.student.allocation?.roomId ?? null;

    return {
      id: registration.id,
      studentId: registration.studentId,
      status: registration.status,
      submittedAt: registration.createdAt, // or use submittedAt if you store separately
      updatedAt: registration.updatedAt,
      roomId, // ✅ now frontend will receive roomId
      documents: registration.student.documents, // ✅ now documents are returned too
    };
  } catch (error) {
    console.error("Error fetching registration:", error);
    throw new Error("Failed to fetch registration status.");
  }
};

// Function to create or update a student's hostel registration
export const submitRegistration = async (studentId: number, data: Omit<HostelRegistrationData, 'student'>) => {
  try {
    // We use upsert to create a new record if one doesn't exist,
    // or update an existing one if it does. This is safer than
    // a create followed by an update.
    const registration = await prisma.hostelRegistration.upsert({
      where: {
        studentId,
      },
      update: {
        preferredBlock: data.preferredBlock,
        specialRequests: data.specialRequests,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        status: "SUBMITTED", // Always set status to SUBMITTED on update
      },
      create: {
        student: {
          connect: { id: studentId },
        },
        ...data,
        status: "SUBMITTED",
      },
    });

    return { message: "Hostel registration submitted successfully", registration };
  } catch (error) {
    console.error("Error submitting hostel registration:", error);
    throw new Error("Failed to submit hostel registration.");
  }
};

// Admin function to update registration status
export const updateRegistrationStatus = async (
  registrationId: number,
  status: "APPROVED" | "REJECTED"
) => {
  try {
    const updatedRegistration = await prisma.hostelRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return updatedRegistration;
  } catch (error) {
    console.error("Error updating registration status:", error);
    throw new Error("Failed to update registration status.");
  }
};


