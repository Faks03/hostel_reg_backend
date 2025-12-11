import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { 
  myAllocation, 
  allAllocations,
  getPreAllocationCheck,
  getAllocationStatus,
  startAllocation,
  getLastAllocationResult,
  downloadAllocationReport
} from "../controllers/allocationController";

const router = express.Router();

// Student routes
router.get("/my-allocation", authenticateToken, myAllocation);

// Admin routes for the allocation dashboard
router.get("/pre-check", authenticateToken, requireAdmin, getPreAllocationCheck);
router.get("/status", authenticateToken, requireAdmin, getAllocationStatus);
router.post("/start", authenticateToken, requireAdmin, startAllocation);
router.get("/last-result", authenticateToken, requireAdmin, getLastAllocationResult);
router.get("/report/:id", authenticateToken, requireAdmin, downloadAllocationReport);

// Legacy admin routes
router.get("/all", authenticateToken, requireAdmin, allAllocations);

export default router;