import { Request, Response } from "express";
import * as studentService from "../services/studentService";
import { Prisma } from "@prisma/client";

// Define a custom interface for the Express Request object
// This lets you add properties like 'user' without using 'any'
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: "student" | "admin";
  };
}

// Get current student's profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const student = await studentService.getStudentProfile(user.id);
    res.json(student);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(404).json({ error: "Student not found." });
    } else if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

// Update current student's profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const updatedStudent = await studentService.updateStudentProfile(user.id, req.body);
    res.json(updatedStudent);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};

// Admin - list all students
export const getAllStudents = async (req: Request, res: Response) => {
  
  try {
    const students = await studentService.listAllStudents();
    res.json(students);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred." });
    }
  }
};


// list all students with registration status
export const getAllRegisteredStudents = async (req: Request, res: Response): Promise<Response> => {
  try {
    // Call the helper function without any arguments.
    // The TypeScript error will now be gone.

    const students = await studentService.getAllStudents();
    return res.status(200).json(students);
  } catch (error) {
    console.error("Failed to fetch all students:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};