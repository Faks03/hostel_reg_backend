import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { submit, getStatus, updateStatus, getAll } from "../controllers/hostelController";

const router = express.Router();

// Student routes
// This single endpoint can handle both creating a new registration and updating an existing one
router.post("/register", authenticateToken, submit);
router.get("/registration", authenticateToken, getStatus);
router.put("/registration", authenticateToken, submit);

// Admin routes
router.patch("/status/:id", authenticateToken, requireAdmin, updateStatus);
router.get("/all", authenticateToken, requireAdmin, getAll);

export default router;
