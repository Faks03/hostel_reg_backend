import { Response } from "express";
import * as notificationService from "../services/notificationService";
import { AuthRequest } from "../middlewares/auth";

// Get notifications for the authenticated student
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized: Missing student ID." });
    }
    const notifications = await notificationService.getNotificationsForStudent(studentId);
    res.json(notifications);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch notifications.";
    res.status(500).json({ error: message });
  }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized: Missing student ID." });
    }

    const notification = await notificationService.markNotificationAsRead(notificationId, studentId);
    if (!notification) {
      return res.status(404).json({ error: "Notification not found or access denied." });
    }

    res.json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notification.";
    res.status(500).json({ error: message });
  }
};

// Mark all notifications for a student as read
export const markAllNotificationsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized: Missing student ID." });
    }
    const result = await notificationService.markAllNotificationsAsRead(studentId);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update notifications.";
    res.status(500).json({ error: message });
  }
};

// Delete a specific notification for a student
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const notificationId = Number(req.params.id);
    const studentId = req.user?.id;

    if (!studentId) {
      return res.status(401).json({ error: "Unauthorized: Missing student ID." });
    }

    const result = await notificationService.deleteNotification(notificationId, studentId);
    if (!result) {
      return res.status(404).json({ error: "Notification not found or access denied." });
    }

    res.json({ message: "Notification deleted successfully." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete notification.";
    res.status(500).json({ error: message });
  }
};

// Admin creates a global notification
export const createGlobalNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type, priority } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: "Title and message are required" });
    }

    const notification = await notificationService.createGlobalNotification(title, message, type, priority);
    res.status(201).json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create notification.";
    res.status(400).json({ error: message });
  }
};

// Admin cleanup old notifications
export const cleanupNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const result = await notificationService.cleanupNotifications(days);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clean up notifications.";
    res.status(400).json({ error: message });
  }
};
