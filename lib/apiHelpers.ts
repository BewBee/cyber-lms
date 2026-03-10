/**
 * lib/apiHelpers.ts — Reusable utilities for Next.js API route handlers.
 * Includes request validation, response helpers, auth extraction, and payload guards.
 * To test: import individual helpers and call them with mock NextApiRequest objects.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { OptionKey, UserRole } from '@/types';

// ─── Response Helpers ─────────────────────────────────────────────────────────

/** Sends a standard success JSON response. */
export function ok<T>(res: NextApiResponse, data: T, status = 200): void {
  res.status(status).json(data);
}

/** Sends a standardized error JSON response. */
export function err(res: NextApiResponse, message: string, status = 400): void {
  res.status(status).json({ error: message });
}

/** Rejects non-matching HTTP methods. */
export function methodNotAllowed(
  req: NextApiRequest,
  res: NextApiResponse,
  allowed: string[]
): void {
  res.setHeader('Allow', allowed);
  err(res, `Method ${req.method} not allowed. Allowed: ${allowed.join(', ')}`, 405);
}

// ─── Request Validation ───────────────────────────────────────────────────────

/** Returns true if value is a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Returns true if value is a valid UUID v4 format. */
export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Returns true if value is a valid option key. */
export function isValidOptionKey(value: unknown): value is OptionKey {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D';
}

/** Returns true if value is a non-negative integer. */
export function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

// ─── Auth Extraction ──────────────────────────────────────────────────────────

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if no valid Bearer token is found.
 */
export function extractBearerToken(req: NextApiRequest): string | null {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Validates that the request has a Bearer token and returns it.
 * Automatically sends 401 and returns null if missing.
 */
export function requireAuth(req: NextApiRequest, res: NextApiResponse): string | null {
  const token = extractBearerToken(req);
  if (!token) {
    err(res, 'Unauthorized: missing or invalid Bearer token', 401);
    return null;
  }
  return token;
}

// ─── Role Guards ──────────────────────────────────────────────────────────────

/**
 * Checks that the user's role matches one of the allowed roles.
 * Sends 403 and returns false if the role check fails.
 */
export function requireRole(
  userRole: UserRole,
  allowedRoles: UserRole[],
  res: NextApiResponse
): boolean {
  if (!allowedRoles.includes(userRole)) {
    err(res, `Forbidden: requires role ${allowedRoles.join(' or ')}`, 403);
    return false;
  }
  return true;
}

// ─── Attempt Payload Validation ───────────────────────────────────────────────

export interface RawAnswerPayload {
  questionId: unknown;
  selectedOption: unknown;
  responseTimeMs: unknown;
  // streakAtAttempt intentionally excluded — server computes streak from correctness
}

/** Validates a single answer in the attempt payload. */
export function validateAnswer(raw: RawAnswerPayload): string | null {
  if (!isValidUUID(raw.questionId)) return 'Invalid questionId (must be UUID)';
  if (!isValidOptionKey(raw.selectedOption)) return 'Invalid selectedOption (must be A-D)';
  if (!isNonNegativeInt(raw.responseTimeMs)) return 'Invalid responseTimeMs (must be non-negative integer)';
  return null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Parses page/pageSize query params with sane defaults and bounds. */
export function parsePagination(
  query: NextApiRequest['query'],
  defaultPageSize = 20,
  maxPageSize = 100
): { page: number; pageSize: number; offset: number } {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const rawSize = parseInt(String(query.pageSize ?? String(defaultPageSize)), 10) || defaultPageSize;
  const pageSize = Math.min(Math.max(1, rawSize), maxPageSize);
  return { page, pageSize, offset: (page - 1) * pageSize };
}
