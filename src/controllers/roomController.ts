import { Request, Response } from "express";
import * as roomService from "../services/roomService";

// Create new room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const { block, roomNumber, capacity } = req.body;

    if (!block || !roomNumber || !capacity) {
      return res.status(400).json({ error: "Block, room number, and capacity are required" });
    }

    const room = await roomService.createRoom(block, roomNumber, capacity);
    res.status(201).json(room);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get all rooms
export const getAllRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await roomService.getAllRooms();
    res.json(rooms);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Update room
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Ensure ID is a valid number
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "Invalid Room ID" });
    }
    const room = await roomService.updateRoom(Number(id), req.body);
    res.json(room);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Delete room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "Invalid Room ID" });
    }
    const result = await roomService.deleteRoom(Number(id));
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// Get room summary
export const getRoomSummary = async (req: Request, res: Response) => {
  try {
    const summary = await roomService.getRoomSummary();
    res.json(summary);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

// *** NEW FUNCTION ***
// Get block summary
export const getBlockSummary = async (req: Request, res: Response) => {
    try {
        const summary = await roomService.getBlockSummary();
        res.json(summary);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};