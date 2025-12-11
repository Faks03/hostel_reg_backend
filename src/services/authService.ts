// services/auth.ts (Backend File)

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";

// Ensure your JWT_SECRET is a secure, long, and complex string
const JWT_SECRET = process.env.JWT_SECRET as string;

// Backend function to handle student login
export const loginStudent = async (matricNumber: string, email: string) => {
  const student = await prisma.student.findUnique({ where: { matricNumber } });

  if (!student || student.email !== email) {
    throw new Error("Invalid matric number or email");
  }

  const token = jwt.sign(
    { id: student.id, role: "student" },
    JWT_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );

  // Return the token and the student data
  return { token, student };
};

// Backend function to handle admin login
export const loginAdmin = async (email: string, password: string) => {
  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    throw new Error("Admin not found");
  }

  // Compare the provided password with the hashed password from the database
  const validPassword = await bcrypt.compare(password, admin.password);
  if (!validPassword) {
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    { id: admin.id, role: "hall-admin" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Return the token and the admin data
  return { token, admin };
};
