/**
 * crypto.tsx — Symmetric encryption for sensitive data at rest
 *
 * Phase 3.2: Encrypts credentials (SMTP passwords, API keys) before storage.
 *
 * Compliance notes (ISO 27001 / PDPA / GDPR):
 *   - A.10.1.1 Cryptographic controls — AES-256-GCM for data at rest
 *   - A.10.1.2 Key management — derived from SUPABASE_SERVICE_ROLE_KEY via HKDF
 *   - PDPA s.9  Security principle — protect personal data with encryption
 *   - GDPR Art.32(1)(a) — pseudonymisation and encryption of personal data
 *
 * Usage:
 *   import { encrypt, decrypt, isEncrypted } from './crypto.tsx';
 *   const ciphertext = await encrypt('smtp-password-123');
 *   const plaintext  = await decrypt(ciphertext); // 'smtp-password-123'
 *
 * Storage format: `enc:v1:<base64(iv + ciphertext + tag)>`
 *   - Prefix 'enc:v1:' identifies encrypted values (vs plaintext legacy data)
 *   - iv:  12 bytes (96-bit, AES-GCM standard)
 *   - tag: 16 bytes (128-bit, appended by Web Crypto API)
 */

// ─── Key Derivation ──────────────────────────────────────────────────────────
// We derive a 256-bit AES key from the service role key using HKDF.
// This ensures the encryption key is independent from the auth key.

const ENC_PREFIX = 'enc:v1:';
const IV_LENGTH = 12;  // 96-bit IV for AES-GCM

let _encKey: CryptoKey | null = null;

async function getEncryptionKey(): Promise<CryptoKey> {
  if (_encKey) return _encKey;

  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) {
    throw new Error('[crypto] SUPABASE_SERVICE_ROLE_KEY not set — cannot derive encryption key');
  }

  const enc = new TextEncoder();
  // Import the secret as raw key material for HKDF
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    'HKDF',
    false,
    ['deriveKey'],
  );

  // Derive a 256-bit AES-GCM key with a fixed salt and info string
  _encKey = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode('brandtelligence:enc:v1:salt'),
      info: enc.encode('brandtelligence:credential-encryption'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,  // not extractable
    ['encrypt', 'decrypt'],
  );

  return _encKey;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a value is already encrypted (has the enc:v1: prefix).
 * Use this to avoid double-encryption.
 */
export function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a prefixed string: `enc:v1:<base64>`.
 * If the value is empty or already encrypted, returns it unchanged.
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return plaintext;
  if (isEncrypted(plaintext)) return plaintext; // Already encrypted

  const key = await getEncryptionKey();
  const enc = new TextEncoder();

  // Generate a random IV for each encryption
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );

  // Concatenate iv + ciphertext (tag is appended by AES-GCM)
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipherBuf), iv.length);

  return ENC_PREFIX + toBase64(combined.buffer);
}

/**
 * Decrypt a value encrypted by `encrypt()`.
 * If the value doesn't have the enc:v1: prefix, returns it as-is
 * (backward-compatible with legacy plaintext values).
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return ciphertext;
  if (!isEncrypted(ciphertext)) return ciphertext; // Legacy plaintext — return as-is

  const key = await getEncryptionKey();
  const raw = fromBase64(ciphertext.slice(ENC_PREFIX.length));

  // Extract IV and ciphertext+tag
  const iv = raw.slice(0, IV_LENGTH);
  const data = raw.slice(IV_LENGTH);

  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    );
    return new TextDecoder().decode(plainBuf);
  } catch (err) {
    console.log(`[crypto] Decryption failed — data may be corrupt or key may have changed`);
    throw new Error('Failed to decrypt credential — the encryption key may have changed');
  }
}

/**
 * Encrypt specific fields in an object. Only encrypts string values
 * for the specified keys, and only if they're not already encrypted.
 *
 * @param obj    The object containing fields to encrypt
 * @param fields Array of field names whose values should be encrypted
 * @returns The same object with specified fields encrypted
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: string[],
): Promise<T> {
  for (const field of fields) {
    if (typeof obj[field] === 'string' && obj[field]) {
      (obj as any)[field] = await encrypt(obj[field]);
    }
  }
  return obj;
}

/**
 * Decrypt specific fields in an object. Only decrypts string values
 * that have the enc:v1: prefix.
 *
 * @param obj    The object containing fields to decrypt
 * @param fields Array of field names whose values should be decrypted
 * @returns The same object with specified fields decrypted
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: string[],
): Promise<T> {
  for (const field of fields) {
    if (typeof obj[field] === 'string' && isEncrypted(obj[field])) {
      (obj as any)[field] = await decrypt(obj[field]);
    }
  }
  return obj;
}
