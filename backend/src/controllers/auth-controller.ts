import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

/**
 * Handle user login, password verification, token generation, and audit logging.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;

  // 1. Request Validation
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password are required' });
    return;
  }

  try {
    const cleanUsername = username.trim().toLowerCase();

    // 2. Fetch user from DB, including their Role definition
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: { role: true },
    });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    // 3. Verify Password using bcrypt
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: 'Invalid username or password' });
      return;
    }

    // 4. Generate JWT
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret';
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role.name,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // 5. Log the Login activity in the database
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'User logged in',
        orderId: null,
      },
    });

    // 6. Return response
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role.name,
        fullName: user.fullName,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'An internal server error occurred during login' });
  }
}

/**
 * Handle user logout by writing an audit log. The stateless JWT is deleted by the client.
 */
export async function logout(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }

  try {
    // Audit log the logout event
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'User logged out',
        orderId: null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout logging error:', error);
    res.status(500).json({ success: false, error: 'An internal server error occurred during logout logging' });
  }
}
