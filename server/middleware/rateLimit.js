/**
 * Rate Limiting, Input Sanitization, and Bad-Word Filtering Middleware
 */

import crypto from 'crypto';
import { config } from '../config.js';

// In-memory rate limiting state per socket
const nextRateLimitMap = new Map(); // socketId -> timestamp of last 'next'
const messageRateLimitMap = new Map(); // socketId -> array of recent message timestamps

// Simple offensive words list for server-side profanity filtering
const PROFANITY_LIST = [
  'nigger', 'nigga', 'faggot', 'kike', 'chink', 'retard',
  'kill yourself', 'kys', 'child porn', 'cp', 'rape'
];

/**
 * Creates a one-way cryptographic SHA-256 hash of an IP address.
 * Raw IP addresses are NEVER stored or broadcast.
 */
export function hashIpAddress(ip) {
  const cleanIp = ip ? String(ip).replace('::ffff:', '').trim() : '127.0.0.1';
  return crypto
    .createHash('sha256')
    .update(cleanIp + (config.IP_SALT || 'salt'))
    .digest('hex');
}

/**
 * Checks whether a socket is allowed to perform a 'next' action (cooldown of 2000ms).
 */
export function checkNextRateLimit(socketId) {
  const now = Date.now();
  const lastNext = nextRateLimitMap.get(socketId) || 0;
  const cooldown = config.RATE_LIMITS.NEXT_COOLDOWN_MS;

  if (now - lastNext < cooldown) {
    const remainingMs = Math.ceil((cooldown - (now - lastNext)) / 1000);
    return {
      allowed: false,
      message: `Please wait ${remainingMs}s before skipping to the next match.`
    };
  }

  nextRateLimitMap.set(socketId, now);
  return { allowed: true };
}

/**
 * Checks whether a socket is exceeding the message sending rate (max 5 msgs per 3000ms).
 */
export function checkMessageRateLimit(socketId) {
  const now = Date.now();
  const windowMs = config.RATE_LIMITS.MSG_WINDOW_MS;
  const maxCount = config.RATE_LIMITS.MSG_MAX_COUNT;

  const timestamps = (messageRateLimitMap.get(socketId) || []).filter(t => now - t < windowMs);

  if (timestamps.length >= maxCount) {
    return {
      allowed: false,
      message: 'You are sending messages too fast. Please slow down.'
    };
  }

  timestamps.push(now);
  messageRateLimitMap.set(socketId, timestamps);
  return { allowed: true };
}

/**
 * Sanitizes and censors text messages:
 * - Truncates to max 500 characters
 * - Strips/escapes HTML tags to prevent XSS
 * - Masks abusive words with asterisks
 */
export function sanitizeAndFilterMessage(text) {
  if (typeof text !== 'string') return '';

  // 1. Truncate to maximum permitted length
  let cleaned = text.slice(0, config.RATE_LIMITS.MSG_MAX_LENGTH).trim();

  // 2. Escape HTML special characters to prevent XSS injection
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // 3. Server-side profanity filter
  for (const word of PROFANITY_LIST) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '*'.repeat(word.length));
    }
  }

  return cleaned;
}

/**
 * Clean up rate limit tracking on socket disconnection
 */
export function cleanupSocketRateLimits(socketId) {
  nextRateLimitMap.delete(socketId);
  messageRateLimitMap.delete(socketId);
}
