import path from 'node:path';

// Max file size: 10MB
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

// Magic bytes for Excel Zip container (.xlsx)
const XLSX_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Sanitize filename preventing path traversal, null byte injections, and control characters
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed_file';
  // Strip null bytes, slashes, backslashes, relative navigation
  const base = path.basename(filename).replace(/[\0\r\n\t]/g, '');
  const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'file';
}

/**
 * Validate file upload buffer/string:
 * - Checks file size limit
 * - Checks magic numbers for XLSX
 * - Checks character encoding and format for CSV
 */
export function validateUploadedFile(
  fileData: string | Buffer,
  declaredType: 'xlsx' | 'csv' | 'sheet'
): { valid: boolean; buffer?: Buffer; error?: string } {
  let buffer: Buffer;

  if (Buffer.isBuffer(fileData)) {
    buffer = fileData;
  } else if (typeof fileData === 'string') {
    // If it's a base64 string
    if (fileData.startsWith('data:') && fileData.includes(';base64,')) {
      const base64Content = fileData.split(';base64,')[1];
      buffer = Buffer.from(base64Content, 'base64');
    } else {
      // Plain text CSV or raw buffer
      buffer = Buffer.from(fileData, 'utf-8');
    }
  } else {
    return { valid: false, error: 'Invalid file data format. Expected buffer or base64/UTF-8 string.' };
  }

  // 1. File size limit
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File payload exceeds maximum institutional quota of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB. (Received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`,
    };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Uploaded file payload is empty (0 bytes).' };
  }

  // 2. MIME / Magic Bytes validation
  if (declaredType === 'xlsx') {
    if (buffer.length < 4 || !buffer.subarray(0, 4).equals(XLSX_MAGIC_BYTES)) {
      return {
        valid: false,
        error: 'Security Failure: File content does not match genuine OpenXML spreadsheet signature (MIME mismatch / invalid magic bytes).',
      };
    }
  } else if (declaredType === 'csv') {
    // Check if buffer contains null bytes (binary disguised as CSV)
    if (buffer.includes(0x00)) {
      return {
        valid: false,
        error: 'Security Failure: CSV contains illegal binary null bytes. Possible disguised executable or binary payload.',
      };
    }
  }

  return { valid: true, buffer };
}

/**
 * Validate URL to prevent SSRF, file:// protocol execution, or javascript: payloads
 */
export function validateExternalUrl(urlStr: string): { valid: boolean; error?: string } {
  if (!urlStr) return { valid: true };

  const trimmed = urlStr.trim().toLowerCase();
  if (
    trimmed.startsWith('file:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return { valid: false, error: 'Unsafe URL scheme detected. Only secure http:// or https:// references are permitted.' };
  }

  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, error: `Disallowed protocol: ${parsed.protocol}. Only http/https permitted.` };
    }

    // SSRF protection: reject internal network endpoints
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.')
    ) {
      return { valid: false, error: 'Target URL resolves to restricted internal loopback or private network.' };
    }
  } catch {
    return { valid: false, error: 'Malformed URL format.' };
  }

  return { valid: true };
}
