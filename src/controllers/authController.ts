import { Request, Response } from "express";
import * as authService from "../services/authService";

export const studentLogin = async (req: Request, res: Response) => {
  const { matricNumber, email } = req.body;
  try {
    const { token, student } = await authService.loginStudent(matricNumber, email);
    res.json({ token, student });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const adminLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const { token, admin } = await authService.loginAdmin(email, password);
    res.json({ token, admin });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
