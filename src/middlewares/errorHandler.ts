// middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal Server Error";

  // Prisma unique constraint error
  if (error.code === "P2002") {
    statusCode = 400;
    message = "Duplicate entry: This record already exists";
  }

  // Prisma record not found error
  if (error.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", error);
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack })
  });
};