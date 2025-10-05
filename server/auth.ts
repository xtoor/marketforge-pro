import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { User, InsertUser } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "marketforge-dev-secret-key-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  email: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token and extract user ID
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Authentication middleware
 * Extracts JWT from Authorization header and verifies it
 */
export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    // Get user from database
    const user = await storage.getUser(decoded.userId);

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    res.status(500).json({ message: "Authentication error" });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 */
export async function optionalAuthMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (decoded) {
      const user = await storage.getUser(decoded.userId);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Register a new user
 */
export async function register(data: RegisterData): Promise<AuthResponse> {
  const { username, password, email } = data;

  // Check if user already exists
  const existingUser = await storage.getUserByUsername(username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const userData: InsertUser = {
    username,
    password: hashedPassword,
    email,
  };

  const user = await storage.createUser(userData);

  // Generate token
  const token = generateToken(user.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { username, password } = credentials;

  // Get user by username
  const user = await storage.getUserByUsername(username);

  if (!user) {
    throw new Error("Invalid username or password");
  }

  // Verify password
  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw new Error("Invalid username or password");
  }

  // Generate token
  const token = generateToken(user.id);

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * Get current user from token
 */
export async function getCurrentUser(userId: string): Promise<Omit<User, 'password'> | null> {
  const user = await storage.getUser(userId);

  if (!user) {
    return null;
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}
