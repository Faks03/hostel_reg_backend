import prisma from "../config/prisma";
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Document, Student, Prisma } from '@prisma/client';
import { createNotification } from '../services/notification'; // Import the new function

export interface DocumentUpload {
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData: Buffer;
  type: string;
}

// Upload multiple documents for a student
export const uploadDocuments = async (studentId: number, documents: DocumentUpload[]) => {
  if (documents.length === 0) {
    throw new Error("No documents provided for upload.");
  }

  const createdDocuments = await Promise.all(
    documents.map(async (doc) => {
      const existingDoc = await prisma.document.findFirst({
        where: {
          studentId,
          type: doc.type,
        },
      });

      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: `student_docs/${studentId}` },
          (error, result) => {
            if (error) return reject(error);
            if (!result) return reject(new Error("Cloudinary upload failed"));
            resolve(result);
          }
        ).end(doc.fileData);
      });

      let returnedDoc;

      if (existingDoc) {
        returnedDoc = await prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            fileUrl: uploadResult.secure_url,
            status: 'pending',
            uploadedAt: new Date(),
          }
        });
      } else {
        returnedDoc = await prisma.document.create({
          data: {
            studentId,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            fileSize: doc.fileSize,
            fileUrl: uploadResult.secure_url,
            type: doc.type,
            status: 'pending'
          }
        });
      }

      // === ADDED NOTIFICATION ===
      createNotification(
        studentId,
        'Document Uploaded',
        `Your document "${doc.fileName}" (${doc.type}) has been uploaded successfully and is pending review.`,
        'success'
      ).catch(err => console.error("Failed to create upload notification:", err));

      return returnedDoc;
    })
  );

  return createdDocuments.map(doc => ({
    id: doc.id,
    fileName: doc.fileName,
    type: doc.type,
    fileSize: doc.fileSize,
    mimeType: doc.mimeType,
    status: doc.status,
    uploadedAt: doc.uploadedAt,
    fileUrl: doc.fileUrl,
  }));
};

// Get student documents (with fileUrl for frontend)
export const getStudentDocuments = async (studentId: number) => {
  const documents = await prisma.document.findMany({
    where: { studentId },
    select: {
      id: true,
      fileName: true,
      type: true,
      mimeType: true,
      fileSize: true,
      status: true,
      uploadedAt: true,
      fileUrl: true,
    },
    orderBy: { uploadedAt: 'desc' }
  });
  return documents;
};

// Get single document with file data (for download)
export const getDocumentById = async (docId: number, studentId?: number): Promise<Document | null> => {
  const where: Prisma.DocumentWhereUniqueInput = { id: docId };
  if (studentId) {
    where.studentId = studentId;
  }
  const document = await prisma.document.findUnique({
    where,
  });

  if (!document) {
    throw new Error('Document not found');
  }

  return document;
};

// Update document status (for admin verification)
export const updateDocumentStatus = async (docId: number, status: 'verified' | 'rejected', rejectionReason?: string) => {
  const document = await prisma.document.update({
    where: { id: docId },
    data: { 
      status,
      ...(status === 'rejected' && rejectionReason && { rejectionReason }),
      ...(status === 'verified' && { verifiedAt: new Date() }),
    },
    select: {
      id: true,
      fileName: true,
      type: true,
      status: true,
      studentId: true, // Need studentId to create notification
      student: {
        select: {
          firstname: true,
          lastname: true,
          matricNumber: true,
        },
      },
    },
  });

  // === ADDED NOTIFICATION ===
  if (status === 'verified') {
    createNotification(
      document.studentId,
      'Document Verified',
      `Your document "${document.fileName}" (${document.type}) has been successfully verified by an administrator.`,
      'success'
    ).catch(err => console.error("Failed to create verified notification:", err));
  } else if (status === 'rejected') {
    createNotification(
      document.studentId,
      'Document Rejected',
      `Your document "${document.fileName}" (${document.type}) was rejected. Reason: ${rejectionReason || 'No reason provided.'}. Please re-upload.`,
      'error'
    ).catch(err => console.error("Failed to create rejected notification:", err));
  }

  return document;
};

// NEW: Update document status by student and document type
export const updateDocumentStatusByType = async (
  studentId: number, 
  documentType: string, 
  status: 'verified' | 'rejected', 
  rejectionReason?: string
) => {
  const document = await prisma.document.findFirst({
    where: {
      studentId,
      type: documentType,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  const updatedDocument = await prisma.document.update({
    where: { id: document.id },
    data: { 
      status,
      ...(status === 'rejected' && rejectionReason && { rejectionReason }),
    },
  });
  
  // === ADDED NOTIFICATION ===
  if (status === 'verified') {
    createNotification(
      studentId,
      'Document Verified',
      `Your document of type "${documentType}" has been successfully verified.`,
      'success'
    ).catch(err => console.error("Failed to create verified notification:", err));
  } else if (status === 'rejected') {
    createNotification(
      studentId,
      'Document Rejected',
      `Your document of type "${documentType}" was rejected. Reason: ${rejectionReason || 'No reason provided.'}. Please re-upload.`,
      'error'
    ).catch(err => console.error("Failed to create rejected notification:", err));
  }

  return updatedDocument;
};

// Delete student documents
export const deleteDocument = async (docId: number) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: docId },
      select: {
        id: true,
        fileUrl: true,
        status: true,
        studentId: true, // Need this to create notification
        type: true,
      }
    });

    if (!document) {
      throw new Error("Document not found.");
    }

    if (document.status === 'verified') {
      throw new Error("Cannot delete verified documents.");
    }

    if (document.fileUrl) {
      try {
        const urlParts = document.fileUrl.split('/');
        const publicIdWithExtension = urlParts.slice(-2).join('/');
        const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, "");
        
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
      }
    }

    await prisma.document.delete({
      where: { id: docId },
    });

    // === ADDED NOTIFICATION ===
    createNotification(
      document.studentId,
      'Document Deleted',
      `Your document of type "${document.type}" has been deleted.`,
      'info'
    ).catch(err => console.error("Failed to create deleted notification:", err));

    return { message: "Document deleted successfully", documentId: docId };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      throw new Error("Document not found.");
    }
    throw e;
  }
};

// Get document statistics (for admin)
export const getDocumentStats = async () => {
  const totalDocs = await prisma.document.count();
  const pendingDocs = await prisma.document.count({ where: { status: 'pending' } });
  const verifiedDocs = await prisma.document.count({ where: { status: 'verified' } });
  const rejectedDocs = await prisma.document.count({ where: { status: 'rejected' } });

  const sizeStats = await prisma.document.aggregate({
    _avg: { fileSize: true },
    _sum: { fileSize: true },
    _max: { fileSize: true },
  });

  return {
    totalDocuments: totalDocs,
    pendingDocuments: pendingDocs,
    verifiedDocuments: verifiedDocs,
    rejectedDocuments: rejectedDocs,
    averageFileSize: Math.round(sizeStats._avg.fileSize || 0),
    totalFileSize: sizeStats._sum.fileSize || 0,
    largestFileSize: sizeStats._max.fileSize || 0,
  };
};

// Get all pending documents for admin review - UPDATED to match frontend expectations
export const getPendingDocuments = async () => {
  try {
    const studentsWithDocuments = await prisma.student.findMany({
      where: {
        documents: {
          some: {}
        }
      },
      include: {
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileUrl: true,
            status: true,
            uploadedAt: true,
          },
        },
      },
    });

    const mapDocumentType = (dbType: string): string | null => {
      const typeMapping: { [key: string]: string } = {
        'passport photo': 'passportPhoto',
        'fee receipt': 'schoolFeesReceipt', 
        'hall dues': 'accommodationReceipt',
      };
      
      return typeMapping[dbType] || null;
    };

    const formattedStudents = studentsWithDocuments.map(student => {
      const documentsByType: any = {};
      
      student.documents.forEach(doc => {
        const mappedType = mapDocumentType(doc.type);
        
        if (mappedType) {
          const verified = doc.status === 'verified' ? true : (doc.status === 'rejected' ? false : null);
          documentsByType[mappedType] = {
            url: doc.fileUrl,
            verified: verified,
          };
        }
      });

      console.log(`Student ${student.firstname} ${student.lastname} documents:`, {
        rawDocuments: student.documents.map(d => ({ type: d.type, status: d.status })),
        mappedDocuments: documentsByType
      });

      const allDocs = Object.values(documentsByType);
      const allVerified = allDocs.length > 0 && allDocs.every((doc: any) => doc.verified === true);
      const anyRejected = allDocs.some((doc: any) => doc.verified === false);
      const overallStatus = allVerified ? 'verified' : (anyRejected ? 'rejected' : 'pending');

      return {
        id: student.id.toString(),
        firstName: student.firstname,
        lastName: student.lastname,
        matricNumber: student.matricNumber,
        level: student.level,
        email: student.email,
        submissionDate: student.documents[0]?.uploadedAt?.toISOString() || new Date().toISOString(),
        documents: documentsByType,
        overallDocumentStatus: overallStatus,
      };
    });

    return formattedStudents;
  } catch (error) {
    console.error('Get pending documents error:', error);
    throw new Error('Failed to retrieve pending documents');
  }
};