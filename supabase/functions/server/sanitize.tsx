/**
 * sanitize.tsx — Input validation & sanitization utilities
 *
 * Phase 3.1: Defense-in-depth against XSS, injection, and malformed input.
 *
 * Compliance notes (ISO 27001 / PDPA / OWASP):
 *   - A.14.2.5  Secure system engineering — validate all inputs at the boundary
 *   - OWASP A03:2021 — Injection prevention
 *   - OWASP A07:2021 — XSS prevention (stored XSS via API)
 *
 * Usage:
 *   import { sanitizeString, sanitizeObject, validateEmail } from './sanitize.tsx';
 *   const cleanBody = sanitizeObject(await c.req.json());
 */

// ─── HTML / XSS Sanitisation ─────────────────────────────────────────────────
// Strips HTML tags and common XSS vectors from user-provided text.
// This is NOT a full HTML sanitiser (like DOMPurify) — it's a server-side
// defense layer that removes dangerous patterns before storage.

/** Characters that are dangerous in HTML context — escape them. */
const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/** Regex for common XSS payload patterns (case-insensitive). */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,  // <script> tags
  /javascript\s*:/gi,                                       // javascript: URIs
  /on\w+\s*=\s*["'][^"']*["']/gi,                          // onerror=, onclick=, etc.
  /on\w+\s*=\s*[^\s>]+/gi,                                 // onerror=alert(1)
  /data\s*:\s*text\/html/gi,                                // data:text/html URIs
  /vbscript\s*:/gi,                                         // vbscript: URIs
  /expression\s*\(/gi,                                      // CSS expression()
];

/**
 * Strip HTML tags from a string. Does NOT attempt to render/parse HTML —
 * simply removes anything that looks like a tag.
 */
function stripTags(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitise a single string value:
 *   1. Remove HTML tags
 *   2. Remove common XSS patterns
 *   3. Trim whitespace
 *
 * Safe for text content that should never contain HTML (names, descriptions, etc.).
 * For fields that may contain legitimate HTML (e.g. email templates), skip this.
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  let clean = input;

  // Remove XSS patterns first (before stripping tags, since patterns may span tags)
  for (const pattern of XSS_PATTERNS) {
    clean = clean.replace(pattern, '');
  }

  // Strip remaining HTML tags
  clean = stripTags(clean);

  // Trim excess whitespace
  clean = clean.trim();

  return clean;
}

/**
 * Recursively sanitise all string values in an object.
 * Arrays are traversed; nested objects are recursed into.
 *
 * @param obj       The object to sanitise (mutated in-place and returned)
 * @param skipKeys  Set of keys to skip (e.g. 'html' for email templates, 'password' for credentials)
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  skipKeys: Set<string> = new Set(),
): T {
  if (!obj || typeof obj !== 'object') return obj;

  for (const [key, value] of Object.entries(obj)) {
    if (skipKeys.has(key)) continue;

    if (typeof value === 'string') {
      (obj as any)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (obj as any)[key] = value.map((item: any) => {
        if (typeof item === 'string') return sanitizeString(item);
        if (typeof item === 'object' && item !== null) return sanitizeObject(item, skipKeys);
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitizeObject(value, skipKeys);
    }
  }

  return obj;
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

/** RFC 5322 simplified email regex — catches most common formats. */
const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false; // RFC 5321 max length
  return EMAIL_RE.test(email);
}

/** UUID v4 format validation. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateUuid(id: string): boolean {
  return typeof id === 'string' && UUID_RE.test(id);
}

/**
 * Validate a string field has a minimum and maximum length.
 * Returns an error message or null if valid.
 */
export function validateLength(
  field: string,
  value: string,
  min: number,
  max: number,
): string | null {
  if (!value || typeof value !== 'string') return `${field} is required`;
  if (value.length < min) return `${field} must be at least ${min} characters`;
  if (value.length > max) return `${field} must be at most ${max} characters`;
  return null;
}

/**
 * Validate that a value is one of the allowed options.
 * Returns an error message or null if valid.
 */
export function validateEnum(
  field: string,
  value: string,
  allowed: string[],
): string | null {
  if (!allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(', ')}`;
  }
  return null;
}

/**
 * Validate and clamp a numeric value within bounds.
 * Returns the clamped number or null if the input is not a valid number.
 */
export function validateNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}
