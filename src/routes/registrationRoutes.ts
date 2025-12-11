import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { apply, status, verify, allRegistrations, updateStatus } from "../controllers/registrationController";

const router = express.Router();

// Student applies
router.post("/apply", authenticateToken, apply);

// Student checks status
router.get("/status", authenticateToken, status);

// Admin verifies or rejects documents
router.patch("/verify/:id", authenticateToken, requireAdmin, verify);
router.get("/all", authenticateToken, requireAdmin, allRegistrations);
router.patch("/:id/status", authenticateToken, requireAdmin, updateStatus);


export default router;
