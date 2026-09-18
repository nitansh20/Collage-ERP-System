import crypto from 'node:crypto';

export interface UserMfaRecord {
  userId: string;
  secret: string;
  isEnabled: boolean;
  backupCodes: { codeHash: string; isUsed: boolean }[];
  lastUsedTimestamp?: number;
}

const userMfaStore = new Map<string, UserMfaRecord>();

/**
 * Generate 8 cryptographically random alphanumeric backup codes
 */
export function generateBackupCodes(): { rawCodes: string[]; hashedCodes: { codeHash: string; isUsed: boolean }[] } {
  const rawCodes: string[] = [];
  const hashedCodes: { codeHash: string; isUsed: boolean }[] = [];

  for (let i = 0; i < 8; i++) {
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase(); // e.g. A3F8-92B1
    const formatted = `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    rawCodes.push(formatted);
    const hash = crypto.createHash('sha256').update(formatted).digest('hex');
    hashedCodes.push({ codeHash: hash, isUsed: false });
  }

  return { rawCodes, hashedCodes };
}

/**
 * Setup MFA for a user
 */
export function setupMfa(userId: string, email: string): { secret: string; backupCodes: string[]; qrUrl: string } {
  const secret = crypto.randomBytes(20).toString('hex');
  const { rawCodes, hashedCodes } = generateBackupCodes();

  userMfaStore.set(userId, {
    userId,
    secret,
    isEnabled: false, // will be enabled upon first successful verification
    backupCodes: hashedCodes,
  });

  const encodedIssuer = encodeURIComponent('College ERP Hogward');
  const encodedEmail = encodeURIComponent(email);
  const qrUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}`;

  return {
    secret,
    backupCodes: rawCodes,
    qrUrl,
  };
}

/**
 * Generate a deterministic time-based code for secret at step T
 */
export function generateTotpCode(secret: string, timeStep = Math.floor(Date.now() / 30000)): string {
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(timeStep));
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = (binary % 1000000).toString().padStart(6, '0');
  return code;
}

/**
 * Verify TOTP code or backup code
 */
export function verifyMfa(userId: string, code: string): { success: boolean; method?: 'TOTP' | 'BACKUP_CODE'; error?: string } {
  const record = userMfaStore.get(userId);
  if (!record) {
    return { success: false, error: 'MFA is not configured for this account.' };
  }

  const cleanCode = code.trim().toUpperCase();

  // 1. Check if it matches a backup code
  const backupHash = crypto.createHash('sha256').update(cleanCode).digest('hex');
  const backupIndex = record.backupCodes.findIndex((b) => b.codeHash === backupHash && !b.isUsed);
  if (backupIndex !== -1) {
    record.backupCodes[backupIndex].isUsed = true;
    record.isEnabled = true;
    userMfaStore.set(userId, record);
    return { success: true, method: 'BACKUP_CODE' };
  }

  // 2. Check TOTP window (-1, 0, +1 time steps to tolerate clock drift)
  const currentStep = Math.floor(Date.now() / 30000);
  for (const stepOffset of [-1, 0, 1]) {
    const validCode = generateTotpCode(record.secret, currentStep + stepOffset);
    if (cleanCode === validCode) {
      record.isEnabled = true;
      record.lastUsedTimestamp = Date.now();
      userMfaStore.set(userId, record);
      return { success: true, method: 'TOTP' };
    }
  }

  return { success: false, error: 'Invalid authentication code or expired one-time code.' };
}

/**
 * Check if user has active MFA enabled
 */
export function isMfaEnabled(userId: string): boolean {
  const record = userMfaStore.get(userId);
  return !!(record && record.isEnabled);
}
