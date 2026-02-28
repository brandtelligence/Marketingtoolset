/**
 * authHeaders.ts — Shared utility for building Authorization headers
 *
 * Production mode → uses the real Supabase session access_token (JWT),
 *                   auto-refreshing expired sessions before returning.
 * Demo mode       → falls back to publicAnonKey (no real user session)
 *
 * Phase 2.3: CSRF token management — fetched once per session, stored in memory,
 *            attached to all mutating requests via X-CSRF-Token header.
 * Phase 2.4: HMAC signing key — stored in memory for high-value operations.
 *
 * Usage:
 *   const headers = await getAuthHeaders();
 *   fetch(url, { headers });
 */

import { IS_PRODUCTION } from '../config/appConfig';
import { supabase } from './supabaseClient';
import { publicAnonKey, projectId } from '/utils/supabase/info';

/** Buffer (seconds) — refresh the token if it expires within this window. */
const REFRESH_BUFFER_S = 60;

// ─── CSRF + Signing Key (Phase 2.3 / 2.4) ────────────────────────────────────
// Stored in module-level closure — never in localStorage (XSS safety).

let _csrfToken: string | null = null;
let _signingKey: string | null = null;
let _csrfFetchPromise: Promise<void> | null = null;

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

/** Fetch CSRF token + signing key from the server. Called lazily on first mutating request. */
async function fetchCsrfTokens(): Promise<void> {
  if (!IS_PRODUCTION) return; // Demo mode doesn't need CSRF

  try {
    const token = await getAccessToken();
    if (!token) return; // No session — can't get CSRF

    const res = await fetch(`${SERVER}/csrf-token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn('[authHeaders] CSRF token fetch failed:', res.status);
      return;
    }
    const data = await res.json();
    _csrfToken = data.csrfToken ?? null;
    _signingKey = data.signingKey ?? null;
  } catch (err) {
    console.warn('[authHeaders] CSRF token fetch error:', err);
  }
}

/**
 * Ensure CSRF tokens are loaded. Uses a singleton promise to prevent
 * concurrent fetches if multiple requests fire simultaneously.
 */
async function ensureCsrfTokens(): Promise<void> {
  if (_csrfToken) return; // Already loaded
  if (!IS_PRODUCTION) return;
  if (!_csrfFetchPromise) {
    _csrfFetchPromise = fetchCsrfTokens().finally(() => { _csrfFetchPromise = null; });
  }
  await _csrfFetchPromise;
}

/** Clear CSRF tokens (called on logout or session expiry). */
export function clearCsrfTokens(): void {
  _csrfToken = null;
  _signingKey = null;
  _csrfFetchPromise = null;
}

/** Get the current signing key for HMAC operations. Returns null if not yet loaded. */
export function getSigningKey(): string | null {
  return _signingKey;
}

/**
 * Compute HMAC-SHA256 signature for high-value operations.
 * Uses the Web Crypto API for browser-native cryptography.
 *
 * @param body - The request body string to sign
 * @returns Object with signature and timestamp headers, or null if signing key unavailable
 */
export async function signRequest(body: string): Promise<{
  'X-Request-Signature': string;
  'X-Request-Timestamp': string;
} | null> {
  await ensureCsrfTokens();
  if (!_signingKey) return null;

  const timestamp = String(Date.now());
  const message = `${body}:${timestamp}`;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(_signingKey),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    const hex = Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      'X-Request-Signature': hex,
      'X-Request-Timestamp': timestamp,
    };
  } catch (err) {
    console.warn('[authHeaders] HMAC signing failed:', err);
    return null;
  }
}

/**
 * Returns the best available Bearer token:
 *   Production: real access_token from Supabase session (auto-refreshed)
 *   Demo: publicAnonKey (server will accept it without user verification)
 *
 * Returns null only if production mode AND session is unrecoverable.
 */
export async function getAccessToken(): Promise<string | null> {
  if (!IS_PRODUCTION) return publicAnonKey;

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return null;

    // Check if token is expired or about to expire within the buffer window
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at ?? 0;            // epoch seconds
    const needsRefresh = expiresAt - nowSec < REFRESH_BUFFER_S;

    if (needsRefresh) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session) {
        console.warn('[authHeaders] Session refresh failed — signing out:', error?.message);
        // Token is expired and unrecoverable → force re-login
        await supabase.auth.signOut();
        // Clear CSRF tokens on session loss
        clearCsrfTokens();
        return null;
      }
      // Session refreshed — CSRF token may be stale, clear and re-fetch lazily
      clearCsrfTokens();
      return refreshed.session.access_token;
    }

    return session.access_token;
  } catch {
    return null;
  }
}

/**
 * Convenience: returns a Headers-compatible object with Authorization set.
 *
 * @param jsonOrMutating  true → includes Content-Type: application/json AND CSRF token.
 *                        Pass true for any mutating request (POST/PUT/DELETE/PATCH).
 *                        For bodyless DELETE, Content-Type is harmless and CSRF is required.
 *
 * Phase 2.3: Automatically includes X-CSRF-Token on mutating requests.
 */
export async function getAuthHeaders(jsonOrMutating = false): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token ?? publicAnonKey}`,
  };
  if (jsonOrMutating) {
    headers['Content-Type'] = 'application/json';
    // Lazily fetch CSRF token for mutating requests
    await ensureCsrfTokens();
    if (_csrfToken) {
      headers['X-CSRF-Token'] = _csrfToken;
    }
  }
  return headers;
}
