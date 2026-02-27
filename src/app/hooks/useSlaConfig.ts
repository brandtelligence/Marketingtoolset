import { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { SLA_WARNING_HOURS, SLA_BREACH_HOURS } from '../utils/sla';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SlaConfig {
  warningHours: number;
  breachHours:  number;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// Shared across all hook instances — only one server fetch per page load.

const DEFAULT_CONFIG: SlaConfig = {
  warningHours: SLA_WARNING_HOURS,
  breachHours:  SLA_BREACH_HOURS,
};

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

// Per-tenant cache: tenantId → config
const _cache = new Map<string, SlaConfig>();
// Pending fetches: tenantId → Promise
const _pending = new Map<string, Promise<SlaConfig>>();

async function fetchConfig(tenantId: string): Promise<SlaConfig> {
  try {
    const res = await fetch(
      `${API_BASE}/sla/config?tenantId=${encodeURIComponent(tenantId)}`,
      { headers: { Authorization: `Bearer ${publicAnonKey}` } },
    );
    if (!res.ok) return DEFAULT_CONFIG;
    const body = await res.json();
    const cfg  = body.config;
    if (cfg && typeof cfg.warningHours === 'number' && typeof cfg.breachHours === 'number') {
      return { warningHours: cfg.warningHours, breachHours: cfg.breachHours };
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Loads and caches per-tenant SLA thresholds from the server.
 * Falls back to module-level constants while loading or when tenantId is absent.
 *
 * @param tenantId  Supabase tenant UUID. Pass undefined/empty for SUPER_ADMIN
 *                  (will return platform defaults without fetching).
 */
export function useSlaConfig(tenantId?: string) {
  const cached = tenantId ? _cache.get(tenantId) : undefined;

  const [config,    setConfig]    = useState<SlaConfig>(cached ?? DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(!cached && !!tenantId);
  const [isSaving,  setIsSaving]  = useState(false);

  useEffect(() => {
    if (!tenantId) return;

    // Already resolved
    const hit = _cache.get(tenantId);
    if (hit) { setConfig(hit); setIsLoading(false); return; }

    // Deduplicate in-flight requests
    let pending = _pending.get(tenantId);
    if (!pending) {
      pending = fetchConfig(tenantId).then(cfg => {
        _cache.set(tenantId, cfg);
        _pending.delete(tenantId);
        return cfg;
      });
      _pending.set(tenantId, pending);
    }

    let cancelled = false;
    pending.then(cfg => {
      if (!cancelled) {
        setConfig(cfg);
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [tenantId]);

  /**
   * Saves new SLA thresholds to the server and updates the local cache.
   * Returns true on success, false on failure.
   */
  const saveConfig = async (newConfig: SlaConfig, tid: string): Promise<boolean> => {
    if (!tid) return false;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/sla/config`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body:    JSON.stringify({ tenantId: tid, ...newConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Save failed');
      // Update both local state and module cache
      const saved: SlaConfig = data.config ?? newConfig;
      _cache.set(tid, saved);
      setConfig(saved);
      return true;
    } catch {
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    warningHours: config.warningHours,
    breachHours:  config.breachHours,
    isLoading,
    isSaving,
    saveConfig,
  };
}
