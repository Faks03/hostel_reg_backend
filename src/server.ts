import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import prisma from "../src/config/prisma";
import bcrypt from "bcryptjs";

import authRoutes from "./routes/authRoutes";

import studentRoutes from "./routes/studentRoutes";
import registrationRoutes from "./routes/registrationRoutes";
import allocationRoutes from "./routes/allocationRoutes";
import roomRoutes from "./routes/roomRoutes";
import notificationRoutes from "./routes/notification";
import reportRoutes from "./routes/reportRoutes";
import documentRoutes from './routes/documentRoutes';
import hostelRoutes from "./routes/hostelRoutes";
import { errorHandler } from "./middlewares/errorHandler";

dotenv.config();
const app = express();
app.use(helmet());


// Test database connection
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/allocation", allocationRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/hostel", hostelRoutes);

const PORT = process.env.PORT || 5000;
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});