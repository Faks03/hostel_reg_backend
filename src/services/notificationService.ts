import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

// Get all notifications for a specific student (latest first)
export const getNotificationsForStudent = async (studentId: number) => {
  const notifications = await prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" }
  });
  return notifications;
};

// Create a notification for a specific student
export const createStudentNotification = async (
  studentId: number,
  title: string,
  message: string,
  type: string = "info",
  priority: string = "low" // Add priority parameter
) => {
  return await prisma.notification.create({
    data: {
      title,
      message,
      type,
      student: { connect: { id: studentId } }
    }
  });
};

// Mark a specific notification as read for the owning student
export const markNotificationAsRead = async (notificationId: number, studentId: number) => {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      studentId
    },
    data: {
      isRead: true
    }
  });
  if (notification.count === 0) return null;
  return { success: true };
};

// Mark all notifications as read for a specific student
export const markAllNotificationsAsRead = async (studentId: number) => {
  const result = await prisma.notification.updateMany({
    where: { studentId },
    data: { isRead: true }
  });
  return { updatedCount: result.count };
};

// Delete a specific notification for the owning student
export const deleteNotification = async (notificationId: number, studentId: number) => {
  const result = await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      studentId
    }
  });
  return result.count > 0;
};

// Admin creates a notification for all students
export const createGlobalNotification = async (
  title: string,
  message: string,
  type: string = "info",
  priority: string = "low",
) => {
  const students = await prisma.student.findMany({ select: { id: true } });
  
  const notificationsData: Prisma.NotificationCreateManyInput[] = students.map(student => ({
    title,
    message,
    type,
    priority,
    studentId: student.id,
  }));

  const result = await prisma.notification.createMany({
    data: notificationsData,
    skipDuplicates: true,
  });

  return { createdCount: result.count };
};

// Delete old notifications (cleanup)
export const cleanupNotifications = async (daysOld: number = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const deleted = await prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate }
    }
  });
  
  return { deleted: deleted.count };
};