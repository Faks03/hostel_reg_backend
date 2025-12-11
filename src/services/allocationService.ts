// src/services/allocation.service.ts

import prisma from "../config/prisma";
import { runAllocationSolver } from "./allocation.solver";
import { AllocationResult } from "../utils/types";
import { BlobServiceClient } from '@azure/storage-blob'; // Example for PDF/CSV storage

// In-memory status tracking (In production, use Redis or a database table)
let allocationStatus = {
  isRunning: false,
  progress: 0,
  currentStep: "Idle",
  startTime: undefined as string | undefined,
};

// In-memory result storage (In production, store this in a database table)
let lastAllocationResult: AllocationResult | null = null;

export const getPreAllocationCheck = async () => {
  // 1. Get students eligible for allocation
const approvedStudents = await prisma.student.findMany({
  where: {
    registration: {
      status: {
        in: ["SUBMITTED", "submitted"],
      },
    },
    documents: { some: { status: "verified" } },
    allocation: null,
  },
  select: { id: true },
});

  // 2. Get all rooms and their current allocation counts
  const rooms = await prisma.room.findMany({
    include: {
      _count: {
        select: { allocations: true },
      },
    },
  });

  // 3. Calculate total available spaces
  const availableSpaces = rooms.reduce(
    (total, room) => total + (room.capacity - room._count.allocations),
    0
  );

// 4. NEW: Calculate block-by-block availability
const blockAvailability = rooms.reduce(
  (acc: Array<{ block: string; availableSpaces: number; estimatedStudents: number }>, room) => {
    const blockName = room.block;
    const availableInRoom = Math.max(0, room.capacity - room._count.allocations);
    
    // FIX: Changed 'let' to 'const'
    const block = acc.find(b => b.block === blockName);

    if (block) {
      // This is mutating a property of the object, which is allowed with const
      block.availableSpaces += availableInRoom;
    } else {
      acc.push({
        block: blockName,
        availableSpaces: availableInRoom,
        estimatedStudents: 0, // Will be calculated next
      });
    }
    return acc;
  },
  []
);

  // 5. Add a simple estimation for students per block
  blockAvailability.forEach((b) => {
    if (availableSpaces > 0) {
      const proportion = b.availableSpaces / availableSpaces;
      b.estimatedStudents = Math.round(approvedStudents.length * proportion);
    }
  });


  // 6. Generate warnings
  const warnings: string[] = [];
  if (approvedStudents.length > availableSpaces) {
    warnings.push(
      `Not enough space: ${approvedStudents.length} eligible students for ${availableSpaces} available spaces.`
    );
  }
  if (approvedStudents.length === 0) {
    warnings.push("No eligible students found for allocation.");
  }
  if (availableSpaces === 0) {
    warnings.push("No available hostel spaces found.");
  }

  // 7. Return the complete object that matches the frontend's expectation
  return {
    approvedStudents: approvedStudents.length, // FIX: Renamed from eligibleStudents
    availableSpaces,
    canAllocateAll: approvedStudents.length <= availableSpaces,
    warnings,
    blockAvailability, // FIX: Added the missing property
  };
};

// ... rest of the allocation.service.ts file
export const getAllocationStatus = async () => {
  return allocationStatus;
};

export const startAllocationProcess = async () => {
  if (allocationStatus.isRunning) {
    throw new Error("Allocation process is already running.");
  }

  allocationStatus = {
    isRunning: true,
    progress: 0,
    currentStep: "Initializing...",
    startTime: new Date().toISOString(),
  };

  // Run solver in the background without blocking the API response
  runAndFinalizeAllocation().catch(console.error);

  return { message: "Allocation process started successfully." };
};

const runAndFinalizeAllocation = async () => {
  try {
    allocationStatus.currentStep = "Fetching students and rooms...";
    allocationStatus.progress = 10;

    const allocationId = `alloc-${Date.now()}`;
    const result = await runAllocationSolver(allocationId);
    
    allocationStatus.currentStep = "Saving allocations to database...";
    allocationStatus.progress = 85;

    if (result.allocations.length > 0) {
      // Fetch all rooms first, before using them
      const allRooms = await prisma.room.findMany();
      
      // Create a map for better performance
      const roomMap = new Map(
        allRooms.map(room => [`${room.block}-${room.roomNumber}`, room.id])
      );

      const allocationData = result.allocations.map(a => {
        const roomKey = `${a.block}-${a.roomNumber}`;
        const roomId = roomMap.get(roomKey);
        if (!roomId) {
          throw new Error(`Room not found: ${a.block} ${a.roomNumber}`);
        }
        return {
          studentId: a.studentId,
          roomId: roomId
        };
      });

      await prisma.allocation.createMany({
        data: allocationData,
        skipDuplicates: true,
      });
    }

    lastAllocationResult = result; // Store result
    
    allocationStatus = { ...allocationStatus, isRunning: false, progress: 100, currentStep: "Completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred.";
    lastAllocationResult = {
        id: `alloc-fail-${Date.now()}`,
        timestamp: new Date().toISOString(),
        status: "failed",
        errors: [message],
        studentsAllocated: 0, 
        studentsUnallocated: 0, 
        totalStudents: 0,
        conflicts: [], 
        allocations: [],
    };
    allocationStatus = { ...allocationStatus, isRunning: false, currentStep: `Failed: ${message}` };
  }
};

export const getLastAllocationResult = async () => {
  return lastAllocationResult;
};

export const getStudentAllocation = async (studentId: number) => {
  const allocation = await prisma.allocation.findUnique({
    where: { studentId },
    include: { room: true, student: { select: { firstname: true, lastname: true, matricNumber: true } } },
  });
  if (!allocation) throw new Error("No allocation found for this student.");
  return allocation;
};

export const getAllAllocations = async () => {
  return prisma.allocation.findMany({
    include: {
      student: { select: { id: true, firstname: true, lastname: true, matricNumber: true } },
      room: true,
    },
    orderBy: [{ room: { block: 'asc' } }, { room: { roomNumber: 'asc' } }],
  });
};

// --- Report Generation (can be moved to a reporting.service.ts) ---

export const generateCSVReport = async (id: string): Promise<string> => {
    if (!lastAllocationResult || lastAllocationResult.id !== id) {
      throw new Error("Allocation result not found");
    }
    const header = "Student Name,Matric Number,Block,Room Number\n";
    const rows = lastAllocationResult.allocations
      .map(a => `"${a.studentName}","${a.matricNumber}","${a.block}","${a.roomNumber}"`)
      .join("\n");
    return header + rows;
};

export const generatePDFReport = async (id: string): Promise<Buffer> => {
    // In a real application, use a library like PDFKit or Puppeteer for better formatting
    if (!lastAllocationResult || lastAllocationResult.id !== id) {
      throw new Error("Allocation result not found");
    }
    const content = `
        <h1>Room Allocation Report (${lastAllocationResult.id})</h1>
        <p><strong>Generated:</strong> ${new Date(lastAllocationResult.timestamp).toLocaleString()}</p>
        <p><strong>Status:</strong> ${lastAllocationResult.status.toUpperCase()}</p>
        <hr>
        <h2>Summary</h2>
        <ul>
            <li>Total Students Processed: ${lastAllocationResult.totalStudents}</li>
            <li>Successfully Allocated: ${lastAllocationResult.studentsAllocated}</li>
            <li>Unallocated / Conflicts: ${lastAllocationResult.studentsUnallocated}</li>
        </ul>
        <h2>Allocations</h2>
        <pre>${lastAllocationResult.allocations.map(a => `${a.studentName} (${a.matricNumber}) -> ${a.block} ${a.roomNumber}`).join("\n")}</pre>
    `;
    return Buffer.from(content); // Simulating PDF generation
};