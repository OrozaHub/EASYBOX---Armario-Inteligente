import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';

// Extend Express Request to augment user info
export interface AuthRequest extends Request {
  user?: { id: string; role: string; email: string };
}

export function authMiddleware(roles: string[] = []) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token) as any;

    if (!decoded) {
      return res.status(401).json({ error: 'Token expired or invalid' });
    }

    // Role check
    if (roles.length > 0 && !roles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role' });
    }

    req.user = decoded;
    next();
  };
}
