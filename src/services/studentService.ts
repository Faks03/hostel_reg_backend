import prisma from "../config/prisma";
import { createNotification } from './notification'; // Import the new service

// Get student profile by ID
export const getStudentProfile = async (studentId: number) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      registration: true,
      allocation: {
        include: {
          room: true,
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!student) throw new Error("Student not found");

  return {
    firstname: student.firstname,
    lastname: student.lastname,
    matricNumber: student.matricNumber,
    level: student.level,
    phone: student.phone,
    email: student.email,
    address: student.address,
    department: student.department,
    
    registrationStatus: student.registration?.status || "draft",
    allocatedRoom: student.allocation?.room
      ? {
          block: student.allocation.room.block,
          roomNumber: student.allocation.room.roomNumber,
        }
      : null,
    recentNotifications: student.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      date: n.createdAt.toISOString().split("T")[0],
      unread: !n.isRead,
    })),
  };
};

// Update student profile
export const updateStudentProfile = async (
  studentId: number,
  data: { 
    firstname?: string;
    lastname?: string;
    matricNumber?: string;
    level?: number;
    department?: string; 
    phone?: string; 
    email?: string; 
    address?: string;
  }
) => {
  const student = await prisma.student.update({
    where: { id: studentId },
    data,
  });

  // === NEW: CREATE A NOTIFICATION FOR THE STUDENT ===
  await createNotification(
    studentId,
    'Profile Updated',
    'Your profile information has been successfully updated.',
    'info'
  );
  
  return student;
};

// List all students (for admin)
export const listAllStudents = async () => {
  return prisma.student.findMany({
    include: { allocation: true },
  });
};

export const getAllStudents = async () => {
  try {
    const students = await prisma.student.findMany({
      include: {
        registration: true,
      },
    });

    return students.map(student => ({
      id: student.id,
      firstName: student.firstname,
      lastName: student.lastname,
      matricNumber: student.matricNumber,
      level: student.level,
      phoneNumber: student.phone,
      email: student.email,
      status: student.registration?.status || "unregistered",
      submissionDate: student.registration?.createdAt?.toISOString() || null,
      block: student.registration?.preferredBlock || null,
    }));
  } catch (error) {
    console.error("Error in getAllStudents:", error);
    throw error;
  }
};