/**
 * Supabase JS client — singleton for the frontend.
 *
 * USE THIS CLIENT FOR:
 *   • supabase.auth.signInWithPassword()   — production login
 *   • supabase.auth.signOut()              — logout
 *   • supabase.auth.getSession()           — session recovery on reload
 *   • supabase.auth.mfa.*                  — TOTP enroll / challenge / verify
 *
 * DO NOT use this client for raw database queries from the frontend.
 * All data operations must go through the server edge function
 * (https://{projectId}.supabase.co/functions/v1/make-server-309fe679/*)
 * to keep the service-role key server-side only.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
      {
        auth: {
          // Persist session across page reloads in localStorage
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return _client;
}

/** Pre-instantiated singleton — import this directly where needed. */
export const supabase = getSupabaseClient();
