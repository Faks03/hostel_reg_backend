// src/controllers/allocation.controller.ts
import { Response } from "express";
import * as allocationService from "../services/allocationService";
import { AuthenticatedRequest } from "../utils/type";


// Get pre-allocation check data
export const getPreAllocationCheck = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const preCheck = await allocationService.getPreAllocationCheck();
    res.json(preCheck);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: message });
  }
};

// Get current allocation status
export const getAllocationStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = await allocationService.getAllocationStatus();
    res.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: message });
  }
};

// Start allocation process
export const startAllocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await allocationService.startAllocationProcess();
    res.status(202).json(result); // 202 Accepted is suitable for starting a background job
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(400).json({ error: message });
  }
};

// Get last allocation result
export const getLastAllocationResult = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await allocationService.getLastAllocationResult();
    if (!result) {
      return res.status(404).json({ error: "No allocation results found" });
    }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: message });
  }
};

// Download allocation report
export const downloadAllocationReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format } = req.query; // 'csv' or 'pdf'

    if (format === 'csv') {
      const csvData = await allocationService.generateCSVReport(id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=allocation-report-${id}.csv`);
      res.send(csvData);
    } else if (format === 'pdf') {
      const pdfBuffer = await allocationService.generatePDFReport(id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=allocation-report-${id}.pdf`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({ error: "Invalid format. Use 'csv' or 'pdf'" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: message });
  }
};

// Student fetches own allocation
export const myAllocation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const allocation = await allocationService.getStudentAllocation(req.user.id);
    res.json(allocation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Allocation not found";
    res.status(404).json({ error: message });
  }
};

// Admin views all allocations
export const allAllocations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const allocations = await allocationService.getAllAllocations();
    res.json(allocations);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ error: message });
  }
};