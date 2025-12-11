import express from "express";
import { studentLogin, adminLogin } from "../controllers/authController";

const router = express.Router();

// Student login
router.post("/student/login", studentLogin);

// Admin login
router.post("/admin/login", adminLogin);

export default router;

