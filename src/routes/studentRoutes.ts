import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { getProfile, updateProfile, getAllStudents, getAllRegisteredStudents
 } from "../controllers/studentController";

const router = express.Router();

// Student profile routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);
router.get("/", authenticateToken, requireAdmin, getAllStudents);

// Admin routes
router.get("/", authenticateToken, requireAdmin, getAllStudents);
router.get("/registrations/status", authenticateToken, requireAdmin, getAllRegisteredStudents);

export default router;
