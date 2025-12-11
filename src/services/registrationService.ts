import prisma from "../config/prisma";
import { createNotification } from './notification'; // Assuming this file exists and contains the function

// Document input type
interface DocumentInput {
  type: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileUrl: string;
}

// Submit registration
export const applyForHostel = async (studentId: number, documents: DocumentInput[]) => {
  if (documents.length === 0) {
    throw new Error("No documents provided");
  }

  for (const doc of documents) {
    if (!doc.fileUrl) {
      throw new Error(`Missing fileUrl for document: ${doc.fileName}`);
    }
    if (!doc.type || !doc.fileName || !doc.mimeType || !doc.fileSize) {
      throw new Error(`Missing required fields for document: ${doc.fileName}`);
    }
  }

  try {
    // Check if a registration already exists
    const existingRegistration = await prisma.hostelRegistration.findUnique({
      where: { studentId },
    });

    if (existingRegistration) {
      // If registration exists, just update its status if needed
      await prisma.hostelRegistration.update({
        where: { studentId },
        data: { status: "submitted" },
      });
    } else {
      // If no registration exists, create a new one
      await prisma.hostelRegistration.create({
        data: {
          studentId,
          status: "submitted",
          // Add other required fields if necessary, e.g., from the request body
          emergencyContactName: "Not Provided", // Placeholder
          emergencyContactPhone: "Not Provided", // Placeholder
        },
      });
    }

    // Delete all existing documents for the student first to prevent duplication.
    await prisma.document.deleteMany({
      where: { studentId },
    });

    // Then, create the new set of documents.
    await prisma.document.createMany({
      data: documents.map((doc) => ({
        studentId,
        type: doc.type,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        fileUrl: doc.fileUrl,
        status: "pending",
      })),
    });

    // === NEW: CREATE A NOTIFICATION ===
    await createNotification(
      studentId,
      'Documents Submitted',
      'Your documents have been submitted successfully and are pending review.',
      'info'
    );

    return { message: "Registration submitted successfully" };
  } catch (error) {
    console.error("Error saving documents to database:", error);
    throw new Error("Failed to save documents to database");
  }
};

// Get registration status
export const getRegistrationStatus = async (studentId: number) => {
  try {
    const registration = await prisma.hostelRegistration.findUnique({
      where: { studentId },
    });
    
    // Check for both registration and documents to determine status
    const documents = await prisma.document.findMany({
      where: { studentId },
    });

    if (registration) {
      return { status: registration.status, documents };
    } else {
      return { status: "not registered" };
    }
  } catch (error) {
    console.error("Error fetching registration status:", error);
    throw new Error("Failed to fetch registration status");
  }
};

// Admin: Verify or reject documents
export const verifyDocument = async (docId: number, status: "verified" | "rejected", rejectionReason?: string) => {
  try {
    // First, get the studentId to send a notification
    const document = await prisma.document.update({
      where: { id: docId },
      data: {
        status,
        ...(status === "rejected" && rejectionReason && { rejectionReason }),
        ...(status === "verified" && { verifiedAt: new Date() }),
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        studentId: true, // Need this to send notification
      }
    });

    // === NEW: CREATE A NOTIFICATION ===
    if (status === 'verified') {
      await createNotification(
        document.studentId,
        'Document Verified',
        `Your document "${document.fileName}" (${document.type}) has been successfully verified.`,
        'success'
      );
    } else if (status === 'rejected') {
      await createNotification(
        document.studentId,
        'Document Rejected',
        `Your document "${document.fileName}" (${document.type}) was rejected. Reason: ${rejectionReason || 'No reason provided.'}`,
        'error'
      );
    }

    return document;
  } catch (error) {
    console.error("Error updating document status:", error);
    throw new Error("Failed to update document status");
  }
};

// Get all documents for a student
export const getStudentDocuments = async (studentId: number) => {
  try {
    const documents = await prisma.document.findMany({
      where: { studentId },
      orderBy: { uploadedAt: 'desc' }
    });

    return documents;
  } catch (error) {
    console.error("Error fetching student documents:", error);
    throw new Error("Failed to fetch student documents");
  }
};

// Delete a document
export const deleteDocument = async (docId: number, studentId: number) => {
  try {
    const document = await prisma.document.findFirst({
      where: { 
        id: docId, 
        studentId,
        status: { not: "verified" }
      },
      select: {
        id: true,
        studentId: true,
        type: true,
      }
    });

    if (!document) {
      throw new Error("Document not found or cannot be deleted");
    }

    await prisma.document.delete({
      where: { id: docId }
    });

    // === NEW: CREATE A NOTIFICATION ===
    await createNotification(
      document.studentId,
      'Document Deleted',
      `Your document of type "${document.type}" has been deleted.`,
      'info'
    );

    return { message: "Document deleted successfully" };
  } catch (error) {
    console.error("Error deleting document:", error);
    throw new Error("Failed to delete document");
  }
};

// Admin: Get all registrations
export const getAllRegistrations = async () => {
  try {
    const registrations = await prisma.hostelRegistration.findMany({
      include: {
        student: {
          select: {
            id: true,
            matricNumber: true,
            firstname: true,
            lastname: true,
            email: true,
            phone: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return registrations;
  } catch (error) {
    console.error("Error fetching all registrations:", error);
    throw new Error("Failed to fetch all registrations");
  }
};

export const updateRegistrationStatus = async (
  id: number,
  status: "approved" | "rejected"
) => {
  const registration = await prisma.hostelRegistration.update({
    where: { id },
    data: { status },
    include: {
      student: true,
    },
  });

  // === NEW: CREATE A NOTIFICATION ===
  if (status === 'approved') {
    await createNotification(
      registration.studentId,
      'Registration Approved!',
      'Your hostel registration has been approved. You can now proceed to the allocation process.',
      'success'
    );
  } else if (status === 'rejected') {
    await createNotification(
      registration.studentId,
      'Registration Rejected',
      'Your hostel registration was rejected. Please check your documents and try again.',
      'error'
    );
  }

  return registration;
};