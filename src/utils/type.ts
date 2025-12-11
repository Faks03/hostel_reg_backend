import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    // Add any other user properties you store in the token payload
  };
}