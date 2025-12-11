import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Request } from "express";

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Extend Request type for type safety
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  file?: Express.Multer.File;
}

// File filter function to allow only certain file types
const fileFilter = (
  req: MulterRequest,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "image/gif",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed."));
  }
};

// Multer configuration
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5, // 5 files limit
  },
});
