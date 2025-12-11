import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import {
  createRoom,
  getAllRooms,
  updateRoom,
  deleteRoom,
  getRoomSummary,
  getBlockSummary // <-- Import the new controller
} from "../controllers/roomController";

const router = express.Router();

// All routes require admin access
router.use(authenticateToken, requireAdmin); // Apply middleware to all routes at once

router.post("/", createRoom);
router.get("/", getAllRooms);

// *** NEW ROUTES ***
router.get("/summary", getRoomSummary);
router.get("/blocks", getBlockSummary); // <-- Route for block data

// *** CHANGED & MOVED ***
router.patch("/:id", updateRoom); // <-- Changed from PUT to PATCH
router.delete("/:id", deleteRoom);


export default router;