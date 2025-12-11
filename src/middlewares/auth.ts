import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

interface JwtPayload {
  id: number;
  role: string;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Access denied. No token provided." });

  try {
    const verified = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).user = verified;
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (user.role !== "hall-admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// export Request
export interface AuthRequest extends Request {
  user?: JwtPayload;
}