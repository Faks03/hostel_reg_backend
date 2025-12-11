import prisma from "../config/prisma";

export const createNotification = async (
  studentId: number,
  title: string,
  message: string,
  type: string = 'info'
) => {
  await prisma.notification.create({
    data: {
      studentId,
      title,
      message,
      type,
    },
  });
};