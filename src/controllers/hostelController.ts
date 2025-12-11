// src/controllers/hostelRegistrationController.ts

import { Request, Response } from "express";
import * as hostelRegistrationService from "../services/hostelService";
import { AuthenticatedRequest } from "../utils/type"; // Assuming this utility type exists
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Submit or update a student's hostel registration
export const submit = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      preferredBlock,
      specialRequests,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
    } = req.body;

    if (!emergencyContactName || !emergencyContactPhone) {
      return res.status(400).json({ error: "Emergency contact information is required." });
    }

    // Pass the form data to the service
    const result = await hostelRegistrationService.submitRegistration(user.id, {
      preferredBlock,
      specialRequests,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Hostel registration submission error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
};

// Get a student's registration status
export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const registration = await hostelRegistrationService.getRegistrationStatus(user.id);
    res.status(200).json(registration);
  } catch (error) {
    console.error('Hostel registration status error:', error);
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
};

// Admin: Update registration status
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
    }

    const result = await hostelRegistrationService.updateRegistrationStatus(Number(id), status);
    res.status(200).json(result);
  } catch (error) {
    console.error('Hostel registration status update error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
};

// Admin function to update registration status
export const updateRegistrationStatus = async (registrationId: number, status: "APPROVED" | "REJECTED") => {
  try {
    const updatedRegistration = await prisma.hostelRegistration.update({
      where: { id: registrationId },
      data: { status },
    });
    return updatedRegistration;
  } catch (error) {
    console.error("Error updating registration status:", error);
    throw new Error("Failed to update registration status.");
  }
};

// Get all hostel registrations (Admin only)
export const getAll = async (req: Request, res: Response) => {
  try {
    const registrations = await prisma.hostelRegistration.findMany({
      include: {
        student: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            matricNumber: true,
            department: true,
            level: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" }, // latest first
    });

    res.status(200).json(registrations);
  } catch (error) {
    console.error("Error fetching hostel registrations:", error);
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
};
