import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { PersonaProfile } from '../types/index.js';

// Secret keys for cryptographic operations
const JWT_SECRET = process.env.JWT_SECRET || 'university-erp-secure-jwt-secret-2026-prod-grade';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'university-erp-secure-refresh-token-secret-2026';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes access token
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface JWTPayload {
  sub: string; // user ID
  name: string;
  email: string;
  role: string;
  department?: string;
  departmentId?: string;
  sessionId: string;
  jti: string; // unique token ID
  isMfaVerified?: boolean;
}

export interface RefreshTokenRecord {
  tokenHash: string;
  userId: string;
  sessionId: string;
  familyId: string;
  isUsed: boolean;
  expiresAt: number;
}

// In-memory store for active refresh tokens
export const refreshTokenStore = new Map<string, RefreshTokenRecord>();

// Revoked token IDs store (for immediate blacklisting before expiry)
export const revokedTokenJtis = new Set<string>();

/**
 * Generate cryptographically signed access token
 */
export function generateAccessToken(user: PersonaProfile, sessionId: string, isMfaVerified = true): string {
  const jti = crypto.randomUUID();
  const payload: JWTPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    departmentId: (user as any).departmentId || (user.department?.toLowerCase().includes('computer') ? 'dept_cs' : 'dept_all'),
    sessionId,
    jti,
    isMfaVerified,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Generate cryptographically secure refresh token
 */
export function generateRefreshToken(userId: string, sessionId: string, familyId?: string): string {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = hashToken(rawToken);
  const famId = familyId || crypto.randomUUID();

  refreshTokenStore.set(tokenHash, {
    tokenHash,
    userId,
    sessionId,
    familyId: famId,
    isUsed: false,
    expiresAt: Date.now() + REFRESH_TOKEN_EXPIRY_MS,
  });

  return rawToken;
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
    if (revokedTokenJtis.has(decoded.jti)) {
      throw new Error('Token has been revoked');
    }
    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Access token has expired');
    }
    throw new Error('Invalid or tampered access token');
  }
}

/**
 * Rotate refresh token with reuse detection
 */
export function rotateRefreshToken(oldRawToken: string): { newAccessToken: string; newRefreshToken: string; user: PersonaProfile } {
  const oldHash = hashToken(oldRawToken);
  const record = refreshTokenStore.get(oldHash);

  if (!record) {
    throw new Error('Invalid refresh token');
  }

  // Token reuse detection: if already used, invalidate entire token family (breach detection)
  if (record.isUsed) {
    // Revoke all tokens in this family
    for (const [key, val] of refreshTokenStore.entries()) {
      if (val.familyId === record.familyId) {
        refreshTokenStore.delete(key);
      }
    }
    throw new Error('Suspicious token reuse detected. All sessions in this family have been terminated.');
  }

  if (Date.now() > record.expiresAt) {
    refreshTokenStore.delete(oldHash);
    throw new Error('Refresh token has expired');
  }

  // Mark old token as used
  record.isUsed = true;
  refreshTokenStore.set(oldHash, record);

  // Find user
  const { repo } = require('../repositories/index.js');
  const user = repo.personas.find((p: PersonaProfile) => p.id === record.userId);
  if (!user) {
    throw new Error('User associated with refresh token not found');
  }

  // Issue new pair
  const newAccessToken = generateAccessToken(user, record.sessionId);
  const newRefreshToken = generateRefreshToken(user.id, record.sessionId, record.familyId);

  return { newAccessToken, newRefreshToken, user };
}

/**
 * Invalidate a specific token or session
 */
export function revokeSessionTokens(sessionId: string, jti?: string) {
  if (jti) {
    revokedTokenJtis.add(jti);
  }
  for (const [hash, record] of refreshTokenStore.entries()) {
    if (record.sessionId === sessionId) {
      refreshTokenStore.delete(hash);
    }
  }
}

/**
 * Revoke a specific JWT token by token string or jti
 */
export function revokeToken(tokenOrJti: string) {
  try {
    const decoded = jwt.decode(tokenOrJti) as JWTPayload | null;
    if (decoded?.jti) {
      revokedTokenJtis.add(decoded.jti);
      if (decoded.sessionId) {
        revokeSessionTokens(decoded.sessionId);
      }
      return;
    }
  } catch {
    // Fallback if raw JTI string passed
  }
  revokedTokenJtis.add(tokenOrJti);
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
