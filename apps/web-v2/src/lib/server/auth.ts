import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AUTH_SECRET } from "$env/static/private";

const COST = 12;
const SESSION_DURATION_DAYS = 30;

export interface JwtPayload {
  sub: string; // user id or "owner"
  iat: number;
  exp: number;
}

/**
 * Hash a password with bcrypt
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, COST);
}

/**
 * Compare a plaintext password against a bcrypt hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Create a signed JWT token
 */
export function createSessionToken(userId: string = "owner"): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      iat: now,
      exp: now + SESSION_DURATION_DAYS * 24 * 60 * 60,
    },
    AUTH_SECRET
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifySessionToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, AUTH_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Rate limiter: simple in-memory store
 */
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMs?: number;
} {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }
  }

  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (entry && now < entry.resetAt) {
    entry.count++;
  } else {
    attempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
  }
}

export function clearAttempts(ip: string): void {
  attempts.delete(ip);
}
