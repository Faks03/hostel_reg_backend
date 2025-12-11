import { Request, Response } from 'express';
import * as documentService from '../services/documentService';
import { Document } from '@prisma/client';

// This function will now be passed the `uploadMiddleware`
export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const uploadedFiles = req.files as Express.Multer.File[];
    const documentType = req.body.type_documents; // Get the document type from form data

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files uploaded.' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required.' });
    }

    const documents = uploadedFiles.map(file => ({
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      fileData: file.buffer,
      type: documentType,
    }));

    const result = await documentService.uploadDocuments(studentId, documents);
    
    // Format response to match frontend expectations
    const formattedResult = result.map(doc => ({
      id: doc.id,
      name: doc.fileName,
      fileName: doc.fileName,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      type: doc.type,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileUrl: doc.fileUrl,
    }));

    res.status(201).json(formattedResult);
  } catch (error: unknown) {
    console.error('Upload error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
};

export const getStudentDocuments = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const documents = await documentService.getStudentDocuments(studentId);
    
    // Format response to match frontend expectations
    const formattedDocs = documents.map(doc => ({
      id: doc.id,
      name: doc.fileName,
      fileName: doc.fileName,
      status: doc.status,
      uploadedAt: doc.uploadedAt.toISOString(),
      type: doc.type,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileUrl: doc.fileUrl,
    }));

    res.status(200).json(formattedDocs);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
};

export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const document: Document | null = await documentService.getDocumentById(docId);
    
    if (document && document.fileUrl) {
      // Redirect the user to the Cloudinary URL to download the file
      res.redirect(document.fileUrl);
    } else {
      res.status(404).json({ error: 'Document not found' });
    }
  } catch (error: unknown) {
    console.error('Download error:', error);
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(404).json({ error: 'An unknown error occurred' });
    }
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const result = await documentService.deleteDocument(docId);
    res.status(200).json(result);
  } catch (error: unknown) {
    console.error('Delete error:', error);
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(404).json({ error: 'An unknown error occurred' });
    }
  }
};

// Get all pending documents for admin review
export const getPendingDocuments = async (req: Request, res: Response) => {
  try {
    const documents = await documentService.getPendingDocuments();
    res.status(200).json(documents);
  } catch (error) {
    console.error('Get pending documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve pending documents' });
  }
};

// NEW: Verify a document by student ID and document type (matches frontend)
// In your controller - verifyDocumentByStudent function
export const verifyDocumentByStudent = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const { documentType, status, rejectionReason } = req.body;

    if (!documentType || !status) {
      return res.status(400).json({ error: 'Document type and status are required' });
    }

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "verified" or "rejected"' });
    }

    // Map frontend document types back to database types
    const frontendToDbTypeMapping: { [key: string]: string } = {
      'passportPhoto': 'passport photo',
      'schoolFeesReceipt': 'fee receipt',
      'accommodationReceipt': 'hall dues'
    };

    const dbDocumentType = frontendToDbTypeMapping[documentType];
    
    if (!dbDocumentType) {
      return res.status(400).json({ 
        error: `Invalid document type: ${documentType}. Valid types are: ${Object.keys(frontendToDbTypeMapping).join(', ')}` 
      });
    }

    console.log('Mapping document type:', documentType, '->', dbDocumentType);

    const document = await documentService.updateDocumentStatusByType(
      studentId, 
      dbDocumentType, // Use the mapped database type
      status as 'verified' | 'rejected',
      rejectionReason
    );
    
    res.status(200).json(document);
  } catch (error: unknown) {
    console.error('Verify document by student error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
};

// Verify a document (admin action) - Keep for backward compatibility
export const verifyDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const document = await documentService.updateDocumentStatus(docId, 'verified');
    res.status(200).json(document);
  } catch (error: unknown) {
    console.error('Verify document error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
};

// Reject a document (admin action) - Keep for backward compatibility
export const rejectDocument = async (req: Request, res: Response) => {
  try {
    const docId = parseInt(req.params.id);
    const document = await documentService.updateDocumentStatus(docId, 'rejected');
    res.status(200).json(document);
  } catch (error: unknown) {
    console.error('Reject document error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: 'An unknown error occurred' });
    }
  }
};