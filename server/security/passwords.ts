import crypto from 'node:crypto';

export interface PasswordResetToken {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: number;
  isUsed: boolean;
}

export interface EmailVerificationToken {
  tokenHash: string;
  userId: string;
  email: string;
  expiresAt: number;
  isVerified: boolean;
}

const passwordResetStore = new Map<string, PasswordResetToken>();
const emailVerificationStore = new Map<string, EmailVerificationToken>();

// Constant-time string comparison to prevent timing attacks
export function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Hash password with salt using PBKDF2 (SHA512, 100,000 iterations)
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

/**
 * Verify password against stored hash and salt (supports legacy plaintext for seed personas)
 */
export function verifyPassword(password: string, storedHash?: string, storedSalt?: string): boolean {
  if (!storedHash) return false;

  // If salt exists, use PBKDF2
  if (storedSalt) {
    const computed = crypto.pbkdf2Sync(password, storedSalt, 100000, 64, 'sha512').toString('hex');
    return timingSafeCompare(computed, storedHash);
  }

  // Fallback for seed personas with plaintext or pre-hashed password
  return timingSafeCompare(password, storedHash);
}

/**
 * Generate secure password reset token (15 minute expiration)
 */
export function createPasswordResetToken(userId: string, email: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  passwordResetStore.set(tokenHash, {
    tokenHash,
    userId,
    email,
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
    isUsed: false,
  });

  return rawToken;
}

/**
 * Verify and consume password reset token
 */
export function consumePasswordResetToken(rawToken: string): { valid: boolean; userId?: string; email?: string; error?: string } {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = passwordResetStore.get(tokenHash);

  if (!record) {
    return { valid: false, error: 'Invalid or unrecognized password reset token.' };
  }

  if (record.isUsed) {
    return { valid: false, error: 'Password reset token has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    passwordResetStore.delete(tokenHash);
    return { valid: false, error: 'Password reset token has expired. Please request a new one.' };
  }

  record.isUsed = true;
  passwordResetStore.set(tokenHash, record);
  return { valid: true, userId: record.userId, email: record.email };
}

/**
 * Generate email verification token (24 hour expiration)
 */
export function createEmailVerificationToken(userId: string, email: string): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  emailVerificationStore.set(tokenHash, {
    tokenHash,
    userId,
    email,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    isVerified: false,
  });

  return rawToken;
}

/**
 * Verify email using verification token
 */
export function verifyEmailWithToken(rawToken: string): { valid: boolean; userId?: string; email?: string; error?: string } {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = emailVerificationStore.get(tokenHash);

  if (!record) {
    return { valid: false, error: 'Invalid or unrecognized email verification token.' };
  }

  if (record.isVerified) {
    return { valid: false, error: 'Email has already been verified with this token.' };
  }

  if (Date.now() > record.expiresAt) {
    emailVerificationStore.delete(tokenHash);
    return { valid: false, error: 'Email verification link has expired.' };
  }

  record.isVerified = true;
  emailVerificationStore.set(tokenHash, record);
  return { valid: true, userId: record.userId, email: record.email };
}
