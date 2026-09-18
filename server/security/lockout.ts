interface LockoutRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

const lockoutStore = new Map<string, LockoutRecord>();

export class LockoutManager {
  /**
   * Check if identifier (email, username, or IP) is locked
   */
  public isLocked(identifier: string): { locked: boolean; remainingSeconds?: number } {
    const key = identifier.toLowerCase().trim();
    const record = lockoutStore.get(key);

    if (!record || !record.lockedUntil) {
      return { locked: false };
    }

    const now = Date.now();
    if (now < record.lockedUntil) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return { locked: true, remainingSeconds };
    }

    // Lockout expired, reset record
    lockoutStore.delete(key);
    return { locked: false };
  }

  /**
   * Record a failed attempt. Returns whether account is now locked.
   */
  public recordFailure(identifier: string): { locked: boolean; remainingAttempts: number; lockoutSeconds?: number } {
    const key = identifier.toLowerCase().trim();
    const now = Date.now();
    let record = lockoutStore.get(key);

    if (!record || (now - record.firstAttemptAt > WINDOW_MS && !record.lockedUntil)) {
      record = {
        attempts: 1,
        firstAttemptAt: now,
        lockedUntil: null,
      };
      lockoutStore.set(key, record);
      return { locked: false, remainingAttempts: MAX_ATTEMPTS - 1 };
    }

    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_DURATION_MS;
      lockoutStore.set(key, record);
      return {
        locked: true,
        remainingAttempts: 0,
        lockoutSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
      };
    }

    lockoutStore.set(key, record);
    return {
      locked: false,
      remainingAttempts: MAX_ATTEMPTS - record.attempts,
    };
  }

  /**
   * Reset attempts on successful authentication
   */
  public recordSuccess(identifier: string): void {
    const key = identifier.toLowerCase().trim();
    lockoutStore.delete(key);
  }

  /**
   * For testing: clear all lockout states
   */
  public resetAll(): void {
    lockoutStore.clear();
  }
}

export const lockoutManager = new LockoutManager();
