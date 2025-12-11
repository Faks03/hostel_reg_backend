// src/services/allocation.solver.ts

import prisma from "../config/prisma";
import { AllocationResult, EligibleStudent, RoomState } from "../utils/types";

const FINALIST_LEVEL = 400; // Assume 400-level and above are finalists

/**
 * The main allocation solver function. It applies constraints to find the best room for each student.
 * @param allocationId A unique ID for this allocation run.
 * @returns A promise that resolves to the AllocationResult.
 */
export const runAllocationSolver = async (allocationId: string): Promise<AllocationResult> => {
  const errors: string[] = [];
  const conflicts: AllocationResult["conflicts"] = [];
  const assignments: Array<{ studentId: number; roomId: number }> = [];

  // ======== 1. PREPARATION: Fetch Variables and Domains ========
  // Note: Changed registration status from 'SUBMITTED' to 'approved' for correctness
  const eligibleStudents: EligibleStudent[] = await prisma.student.findMany({
    where: {
      registration: {
      status: {
        in: ["SUBMITTED", "submitted"],
      },
    },
      documents: { some: { status: "verified" } },
      allocation: null,
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      matricNumber: true,
      level: true,
      registration: {
        select: { preferredBlock: true },
      },
    },
  });

  if (eligibleStudents.length === 0) {
    throw new Error("No eligible students found for allocation.");
  }

  // Fetch all rooms and their current state (Domains)
  const allRooms = await prisma.room.findMany({ include: { allocations: { include: { student: true } } } });
  const roomStates: Map<number, RoomState> = new Map(
    allRooms.map((r) => [
      r.id,
      {
        id: r.id,
        block: r.block,
        roomNumber: r.roomNumber,
        capacity: r.capacity,
        occupants: r.allocations.map(a => a.student),
      },
    ])
  );

  // ======== 2. CATEGORIZATION (based on Hard Constraints) ========

  const freshmen = eligibleStudents.filter((s) => s.level === 100);
  const finalists = eligibleStudents.filter((s) => s.level >= FINALIST_LEVEL);
  const returning = eligibleStudents.filter((s) => s.level > 100 && s.level < FINALIST_LEVEL);

  // ======== 3. ASSIGNMENT: Process each category against its domain ========

  // Process freshmen for Block A
  processStudentCategory(freshmen, getAvailableRoomsForBlock("A", roomStates), roomStates, assignments, conflicts);

  // Process finalists for Block D
  processStudentCategory(finalists, getAvailableRoomsForBlock("D", roomStates), roomStates, assignments, conflicts);

  // Process returning students for Blocks B and C
  const returningStudentRooms = [
    ...getAvailableRoomsForBlock("B", roomStates),
    ...getAvailableRoomsForBlock("C", roomStates),
  ];
  processStudentCategory(returning, returningStudentRooms, roomStates, assignments, conflicts);
  
  // ======== 4. FINALIZATION: Build and return the result object ========

  const allocatedStudents = await prisma.student.findMany({
      where: { id: { in: assignments.map(a => a.studentId) } },
      select: { id: true, firstname: true, lastname: true, matricNumber: true }
  });

  const allocationsView = assignments.map(a => {
      const student = allocatedStudents.find(s => s.id === a.studentId)!;
      const room = roomStates.get(a.roomId)!;
      return {
        studentId: student.id,
        studentName: `${student.firstname} ${student.lastname}`,
        matricNumber: student.matricNumber,
        block: room.block,
        roomNumber: room.roomNumber,
      };
  });
  
  return {
    id: allocationId,
    timestamp: new Date().toISOString(),
    status: conflicts.length === 0 && errors.length === 0 ? "completed" : "partial",
    studentsAllocated: assignments.length,
    studentsUnallocated: conflicts.length + (eligibleStudents.length - assignments.length - conflicts.length),
    totalStudents: eligibleStudents.length,
    errors,
    conflicts,
    allocations: allocationsView,
  };
};

/**
 * Processes a list of students against a list of available rooms.
 */
const processStudentCategory = (
  students: EligibleStudent[],
  availableRooms: RoomState[],
  roomStates: Map<number, RoomState>,
  assignments: Array<{ studentId: number; roomId: number }>,
  conflicts: AllocationResult["conflicts"]
) => {
  if (availableRooms.length === 0) {
    students.forEach((student) => {
      conflicts.push({
        studentId: student.id,
        studentName: `${student.firstname} ${student.lastname}`,
        issue: "No available rooms in designated block(s).",
      });
    });
    return;
  }

  for (const student of students) {
    const bestRoom = findBestRoomForStudent(student, availableRooms);

    if (!bestRoom) {
      conflicts.push({
        studentId: student.id,
        studentName: `${student.firstname} ${student.lastname}`,
        issue: "Could not find a suitable room matching constraints.",
      });
      continue;
    }

    // Assign student and update room state
    assignments.push({ studentId: student.id, roomId: bestRoom.id });
    bestRoom.occupants.push(student as any); // Update state for next student
  }
};

/**
 * Finds the best room for a student by scoring available options based on soft constraints.
 * @param student The student to allocate.
 * @param rooms The list of potential rooms.
 * @returns The best RoomState or null if no room is available.
 */
const findBestRoomForStudent = (student: EligibleStudent, rooms: RoomState[]): RoomState | null => {
  let bestRoom: RoomState | null = null;
  let maxScore = -1;

  for (const room of rooms) {
    // HARD CONSTRAINT: Check room capacity
    if (room.occupants.length >= room.capacity) {
      continue;
    }

    // SCORE CALCULATION (based on Soft Constraints)
    let currentScore = 100;

    // S1: Preferred block
    if (room.block === student.registration?.preferredBlock) {
      currentScore += 20;
    }

    // S2: Academic level clustering
    if (room.occupants.length > 0) {
      const sameLevelOccupants = room.occupants.filter((occ) => occ.level === student.level).length;
      currentScore += sameLevelOccupants * 10; // +10 for each roommate of the same level
    }
    
    // S3: Fair distribution (Implicitly handled by preferring less occupied rooms)
    currentScore -= room.occupants.length * 5; // Penalize fuller rooms slightly to encourage spread

    if (currentScore > maxScore) {
      maxScore = currentScore;
      bestRoom = room;
    }
  }

  return bestRoom;
};

//Helper to filter rooms by block.
const getAvailableRoomsForBlock = (block: string, roomStates: Map<number, RoomState>): RoomState[] => {
  return Array.from(roomStates.values()).filter(
    (r) => r.block === block && r.occupants.length < r.capacity
  );
};