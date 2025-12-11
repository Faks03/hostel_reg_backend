// src/utils/types.ts

import { Request } from "express";
import { Student, Room, Allocation } from "@prisma/client";

// For authenticating requests, assuming user object is attached
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

// Defines the final result of an allocation run
export interface AllocationResult {
  id: string;
  timestamp: string;
  status: "completed" | "partial" | "failed";
  studentsAllocated: number;
  studentsUnallocated: number;
  totalStudents: number;
  errors: string[];
  conflicts: Array<{
    studentId: number;
    studentName: string;
    issue: string;
  }>;
  allocations: Array<{
    studentId: number;
    studentName: string;
    matricNumber: string;
    block: string;
    roomNumber: string;
  }>;
}

// Internal type for tracking room availability during solving
export interface RoomState {
  id: number;
  block: string;
  roomNumber: string;
  capacity: number;
  occupants: Student[]; // Keep track of who is in the room
}

// Type for a student eligible for allocation
export type EligibleStudent = Pick<
  Student,
  "id" | "firstname" | "lastname" | "matricNumber" | "level"
> & {
  registration?: {
    preferredBlock: string | null;
  } | null;
};