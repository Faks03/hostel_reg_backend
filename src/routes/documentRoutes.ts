import { Router } from 'express';
import { uploadMiddleware } from '../middlewares/upload';
import * as documentController from '../controllers/documentController';

const router = Router();

// Route for uploading documents with the middleware
router.post('/upload/:studentId', uploadMiddleware.array('documents'), documentController.uploadDocuments);

// Route to get all documents for a student
router.get('/my-documents/:studentId', documentController.getStudentDocuments);

// Route to get a specific document by ID
router.get('/download/:id', documentController.downloadDocument);

// Route to delete a specific document by ID
router.delete('/delete/:id', documentController.deleteDocument);

// Admin routes
router.get('/pending', documentController.getPendingDocuments);

// NEW: Route to verify/reject documents by student ID and document type (matches frontend)
router.patch('/verify/:studentId', documentController.verifyDocumentByStudent);

// Keep existing routes for backward compatibility
router.post('/verify/:id', documentController.verifyDocument);
router.post('/reject/:id', documentController.rejectDocument);

export default router;