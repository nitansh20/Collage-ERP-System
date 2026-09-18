import crypto from 'node:crypto';
import { FeeChallan } from '../types/index.js';

// Payment gateway secret
const PAYMENT_SECRET = process.env.PAYMENT_GATEWAY_SECRET || 'erp_gateway_secret_live_f89a2b1c4d';
const processedWebhookIds = new Set<string>();

export interface PaymentSignaturePayload {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEventPayload {
  eventId: string;
  timestamp: number;
  challanId: string;
  amount: number;
  currency: string;
  status: 'captured' | 'failed';
}

/**
 * Statutory institutional tuition fee breakdown schedule
 */
export const STATUTORY_FEE_SCHEDULE: Record<string, { tuitionFee: number; labFee: number; libraryFee: number; examFee: number }> = {
  'BTECH-CSE': { tuitionFee: 65000, labFee: 15000, libraryFee: 5000, examFee: 2500 },
  'BTECH-ECE': { tuitionFee: 62000, labFee: 14000, libraryFee: 5000, examFee: 2500 },
  'BTECH-MECH': { tuitionFee: 58000, labFee: 16000, libraryFee: 5000, examFee: 2500 },
  'MTECH-CPS': { tuitionFee: 75000, labFee: 20000, libraryFee: 7000, examFee: 3500 },
  DEFAULT: { tuitionFee: 50000, labFee: 10000, libraryFee: 5000, examFee: 2000 },
};

/**
 * Server-side authoritative fee total calculation
 */
export function calculateStatutoryFee(courseCode: string): {
  tuitionFee: number;
  labFee: number;
  libraryFee: number;
  examFee: number;
  totalAmount: number;
} {
  const schedule = STATUTORY_FEE_SCHEDULE[courseCode] || STATUTORY_FEE_SCHEDULE.DEFAULT;
  const totalAmount = schedule.tuitionFee + schedule.labFee + schedule.libraryFee + schedule.examFee;
  return { ...schedule, totalAmount };
}

/**
 * Verify client payment signature (HMAC-SHA256(orderId + "|" + paymentId, secret))
 */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto.createHmac('sha256', PAYMENT_SECRET).update(body).digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographic signature for an order / payment
 */
export function signPaymentOrder(orderId: string, paymentId: string): string {
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', PAYMENT_SECRET).update(body).digest('hex');
}

/**
 * Validate payment webhook signature and prevent replay attacks (300s window)
 */
export function validatePaymentWebhook(
  rawBody: string,
  signatureHeader: string,
  timestampHeader?: string
): { valid: boolean; error?: string } {
  if (!signatureHeader) {
    return { valid: false, error: 'Missing webhook signature header.' };
  }

  // Check timestamp to prevent replay attacks (tolerance 300s)
  if (timestampHeader) {
    const timestampMs = parseInt(timestampHeader, 10);
    const now = Date.now();
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > 300 * 1000) {
      return { valid: false, error: 'Webhook timestamp expired or outside tolerance window (replay protection).' };
    }
  }

  const expectedSignature = crypto.createHmac('sha256', PAYMENT_SECRET).update(rawBody).digest('hex');

  try {
    const sigBuf = Buffer.from(signatureHeader, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid webhook HMAC signature.' };
    }
  } catch {
    return { valid: false, error: 'Webhook signature verification failed.' };
  }

  return { valid: true };
}

/**
 * Idempotency check for payment webhooks
 */
export function recordWebhookEventId(eventId: string): boolean {
  if (processedWebhookIds.has(eventId)) {
    return false; // Already processed
  }
  processedWebhookIds.add(eventId);
  return true;
}

/**
 * Validate fee payment amount against server-side balance.
 * Reject tampered payloads: negative amounts, zero amounts, or amounts exceeding remaining balance.
 */
export function validatePaymentAmount(challan: FeeChallan, attemptedAmount: number): { valid: boolean; error?: string } {
  if (typeof attemptedAmount !== 'number' || isNaN(attemptedAmount) || !isFinite(attemptedAmount)) {
    return { valid: false, error: 'Payment amount must be a valid numeric quantity.' };
  }

  if (attemptedAmount <= 0) {
    return { valid: false, error: 'Payment amount must be strictly greater than zero.' };
  }

  if (attemptedAmount > challan.balanceAmount) {
    return {
      valid: false,
      error: `Payment amount (₹${attemptedAmount}) exceeds outstanding balance (₹${challan.balanceAmount}).`,
    };
  }

  if (challan.status === 'PAID') {
    return { valid: false, error: 'Challan is already fully paid. No further payments accepted.' };
  }

  return { valid: true };
}
