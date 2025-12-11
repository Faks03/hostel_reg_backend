import express from "express";
import { authenticateToken, requireAdmin } from "../middlewares/auth";
import { 
  getNotifications, 
  createGlobalNotification, 
  cleanupNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "../controllers/notification";

const router = express.Router();

// Students can view their own notifications
router.get("/", authenticateToken, getNotifications);
// Mark a specific notification as read
router.patch("/:id/read", authenticateToken, markNotificationAsRead);
// Mark all notifications as read
router.patch("/read-all", authenticateToken, markAllNotificationsAsRead);
// Delete a specific notification
router.delete("/:id", authenticateToken, deleteNotification);

// Admin only routes
router.post("/", authenticateToken, requireAdmin, createGlobalNotification);
router.delete("/cleanup", authenticateToken, requireAdmin, cleanupNotifications);

export default router;
