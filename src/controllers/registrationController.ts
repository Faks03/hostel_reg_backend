// registrationController.ts

import { Request, Response } from "express";
import * as registrationService from "../services/registrationService";
import * as documentService from "../services/documentService";


interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: unknown;
  };
}

// Student applies for hostel
export const apply = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const { documents } = req.body;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: "Documents are required" });
    }

    const response = await registrationService.applyForHostel(user.id, documents);
    res.json(response);
  } catch (error) {
    console.error('Registration apply error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: "An unknown error occurred" });
    }
  }
};

// Student views registration status
export const status = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await registrationService.getRegistrationStatus(user.id);
    res.json(result);
  } catch (error) {
    console.error('Registration status error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: "An unknown error occurred" });
    }
  }
};

// Admin verifies or rejects a document
export const verify = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be 'verified' or 'rejected'" });
    }

    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ error: "Rejection reason is required when rejecting a document" });
    }

    const result = await registrationService.verifyDocument(Number(id), status, rejectionReason);
    res.json(result);
  } catch (error) {
    console.error('Document verification error:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: "An unknown error occurred" });
    }
  }
};

// Admin views all registrations
export const allRegistrations = async (req: Request, res: Response) => {
    try {
        const registrations = await registrationService.getAllRegistrations();
        res.json(registrations);
    } catch (error) {
        console.error('Fetching all registrations error:', error);
        if (error instanceof Error) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(400).json({ error: "An unknown error occurred" });
        }
    }
};

export const updateStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate the new status
  if (status !== "approved" && status !== "rejected") {
    return res.status(400).json({
      error: "Invalid status provided. Must be 'approved' or 'rejected'.",
    });
  }

  try {
    const updatedRegistration = await registrationService.updateRegistrationStatus(Number(id), status);
    return res.status(200).json(updatedRegistration);
  } catch (error) {
    console.error("Failed to update registration status:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};