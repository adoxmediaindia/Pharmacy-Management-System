import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// Type definition for the JWT user payload
export interface UserPayload {
  id: string;
  username: string;
  role: string;
}

// Custom Request type containing the validated user payload
export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

/**
 * Middleware to verify that the request has a valid JWT token in its headers.
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication token missing or invalid format' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const decoded = jwt.verify(token, jwtSecret) as UserPayload;
    
    // Attach the user metadata payload to the request
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid authentication token' });
  }
}

/**
 * Middleware factory to restrict endpoint access to specified roles.
 * @param allowedRoles List of roles permitted to call this endpoint (e.g. ['ADMIN', 'BILLER'])
 */
export function roleMiddleware(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role '${userRole}' is not authorized to access this resource.`,
      });
      return;
    }

    next();
  };
}
