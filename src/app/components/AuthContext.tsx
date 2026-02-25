/**
 * AuthContext
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides authenticated user state across the whole app.
 *
 * Production mode  → session is bootstrapped from Supabase Auth on mount,
 *                    persisted in localStorage (handled by the Supabase client),
 *                    and cleared via supabase.auth.signOut() on logout.
 *
 * Demo mode        → state lives only in React memory; no Supabase calls.
 *
 * PRODUCTION SAFETY GATE: this file imports IS_PRODUCTION from appConfig and
 * branches accordingly. Mock data is NEVER touched here.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { RoleType } from '../data/mockSaasData';
import { IS_PRODUCTION } from '../config/appConfig';
import { supabase } from '../utils/supabaseClient';

// ─── UserProfile shape ────────────────────────────────────────────────────────

export interface UserProfile {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  email: string;
  profileImage: string;
  userLevel: 'employee' | 'admin' | 'superadmin';
  // ── RBAC extensions ───────────────────────────────────────────────────────
  role?: RoleType;
  tenantId?: string | null;
  tenantName?: string | null;
  // ── MFA / Supabase extensions ─────────────────────────────────────────────
  supabaseUid?: string;
  mfaVerified?: boolean;
  mfaFactorId?: string;
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface AuthContextType {
  user: UserProfile | null;
  /** Commit a fully-resolved UserProfile (post-MFA if required). */
  login: (user: UserProfile) => void;
  /** Clear session — also calls supabase.auth.signOut() in production. */
  logout: () => void;
  /** True while the session-recovery check is running on first mount. */
  sessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Demo default user (used only in demo mode, never in production) ──────────

/** @demo-only — lives in AuthContext per the global mock-data isolation rule */
export const mockUser: UserProfile = {
  firstName: 'Sarah',
  lastName: 'Chen',
  jobTitle: 'Project Manager',
  company: 'Brandtelligence',
  email: 'sarah.chen@brandtelligence.my',
  profileImage:
    'https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMGhlYWRzaG90JTIwcG9ydHJhaXR8ZW58MXx8fHwxNzcxNzY0MDY2fDA&ixlib=rb-4.1.0&q=80&w=1080',
  userLevel: 'employee',
  role: 'EMPLOYEE',
  tenantId: 't1',
  tenantName: 'Acme Corp',
};

// ─── Helper: build UserProfile from a Supabase User object ───────────────────

export function buildProfileFromSupabaseUser(supabaseUser: any): UserProfile {
  const meta  = supabaseUser.user_metadata ?? {};
  const role: RoleType = (meta.role ?? 'EMPLOYEE') as RoleType;
  const rawName = meta.name ?? meta.display_name ?? supabaseUser.email ?? 'User';
  const parts   = rawName.split(' ');

  return {
    firstName:    meta.first_name ?? parts[0] ?? '',
    lastName:     meta.last_name  ?? parts.slice(1).join(' ') ?? '',
    jobTitle:
      role === 'SUPER_ADMIN'  ? 'Platform Administrator' :
      role === 'TENANT_ADMIN' ? 'Tenant Administrator'   :
      'Team Member',
    company:      meta.company ?? meta.tenant_name ?? 'Brandtelligence',
    email:        supabaseUser.email ?? '',
    profileImage:
      meta.avatar_url ?? meta.profile_image ??
      `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&background=0BA4AA&color=fff`,
    userLevel:
      role === 'SUPER_ADMIN'  ? 'superadmin' :
      role === 'TENANT_ADMIN' ? 'admin'       : 'employee',
    role,
    tenantId:     meta.tenant_id   ?? null,
    tenantName:   meta.tenant_name ?? null,
    supabaseUid:  supabaseUser.id,
    mfaVerified:  false, // updated to true after MFA challenge passes
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,           setUser]           = useState<UserProfile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(IS_PRODUCTION);

  // ── Production session recovery on mount ───────────────────────────────────
  // In production, Supabase persists the session in localStorage.
  // On reload we reconstruct the user profile from the stored session so the
  // user doesn't need to log in again.
  useEffect(() => {
    if (!IS_PRODUCTION) {
      setSessionLoading(false);
      return;
    }

    let cancelled = false;

    const recover = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled && session?.user) {
          const profile = buildProfileFromSupabaseUser(session.user);
          // Consider AAL2 session as MFA-verified
          const aal = (session as any).aal ?? 'aal1';
          setUser({ ...profile, mfaVerified: aal === 'aal2' });
        }
      } catch (err) {
        console.error('[AuthContext] Session recovery error:', err);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    };

    recover();

    // Also listen for Supabase auth state changes (token refresh, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) {
        if (session?.user) {
          const profile = buildProfileFromSupabaseUser(session.user);
          const aal = (session as any).aal ?? 'aal1';
          setUser(prev => prev ? { ...prev, ...profile, mfaVerified: aal === 'aal2' } : profile);
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: UserProfile) => setUser(userData);

  const logout = async () => {
    if (IS_PRODUCTION) {
      try { await supabase.auth.signOut(); } catch { /* silent */ }
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, sessionLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    // Graceful fallback outside of provider tree
    return {
      user: null,
      login: () => {},
      logout: async () => {},
      sessionLoading: false,
    } as AuthContextType;
  }
  return ctx;
}
