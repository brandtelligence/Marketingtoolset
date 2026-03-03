/**
 * webVitals.ts — Core Web Vitals reporter (Gate 4 instrumentation)
 * ─────────────────────────────────────────────────────────────────────────────
 * Collects LCP, FCP, CLS, INP (replaces FID in CWV v3), and TTFB via the
 * `web-vitals` library. Each metric is:
 *   • Logged to the browser DevTools Console (coloured ✅ / ⚠️ / ❌)
 *   • Persisted to localStorage['btl_cwv_readings'] so the Deployment
 *     Readiness tab can read them without a page reload and a SUPER_ADMIN
 *     can save them as an ISO 27001 audit record (Gate 4 evidence).
 *
 * Gate 4 targets (Google CWV 2024 / Google Search Console thresholds):
 *   LCP  ≤ 2500 ms  → good   |  > 4000 ms → poor
 *   FCP  ≤ 1800 ms  → good   |  > 3000 ms → poor
 *   CLS  ≤ 0.10     → good   |  > 0.25    → poor
 *   INP  ≤  200 ms  → good   |  >  500 ms → poor
 *   TTFB ≤  800 ms  → good   |  > 1800 ms → poor
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export type CwvMetricName = 'LCP' | 'FCP' | 'CLS' | 'INP' | 'TTFB';
export type CwvRating = 'good' | 'needs-improvement' | 'poor';

export interface CwvStoredReading {
  name:        CwvMetricName;
  value:       number;
  rating:      CwvRating;
  capturedAt:  string;   // ISO-8601
}

/** localStorage key for in-session CWV readings */
export const CWV_LS_KEY = 'btl_cwv_readings';

// [good_threshold, poor_threshold]
const THRESHOLDS: Record<CwvMetricName, [number, number]> = {
  LCP:  [2500, 4000],
  FCP:  [1800, 3000],
  CLS:  [0.1,  0.25],
  INP:  [200,  500],
  TTFB: [800,  1800],
};

const EMOJI: Record<CwvRating, string> = {
  'good':               '✅',
  'needs-improvement':  '⚠️',
  'poor':               '❌',
};

export function getCwvRating(name: CwvMetricName, value: number): CwvRating {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

export function formatCwvValue(name: CwvMetricName, value: number): string {
  if (name === 'CLS') return value.toFixed(4);
  return `${Math.round(value)} ms`;
}

/** Return all CWV readings stored for the current session. */
export function getLocalCwvReadings(): Record<CwvMetricName, CwvStoredReading> {
  try {
    const raw = localStorage.getItem(CWV_LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Clear in-session CWV readings (use when starting a fresh capture). */
export function clearLocalCwvReadings(): void {
  try { localStorage.removeItem(CWV_LS_KEY); } catch { /* noop */ }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function persistReading(name: CwvMetricName, value: number, rating: CwvRating): void {
  try {
    const existing = getLocalCwvReadings();
    existing[name] = { name, value, rating, capturedAt: new Date().toISOString() };
    localStorage.setItem(CWV_LS_KEY, JSON.stringify(existing));

    // Notify any listeners (e.g. CwvEvidenceCard) that readings have updated
    window.dispatchEvent(new CustomEvent('btl:cwv-updated', { detail: existing }));
  } catch {
    // Never crash the app over localStorage unavailability
  }
}

function handleMetric({ name, value }: { name: string; value: number }): void {
  const metricName = name as CwvMetricName;
  const rating     = getCwvRating(metricName, value);
  const formatted  = formatCwvValue(metricName, value);
  const emoji      = EMOJI[rating];

  // Console output (original Gate 4 instrumentation)
  const style = rating === 'good'
    ? 'color:#22c55e;font-weight:bold'
    : rating === 'needs-improvement'
    ? 'color:#f59e0b;font-weight:bold'
    : 'color:#ef4444;font-weight:bold';

  console.log(
    `%c[WebVitals] ${emoji} ${metricName}: ${formatted} (${rating})`,
    style,
  );

  // Persist for Gate 4 evidence card
  persistReading(metricName, value, rating);
}

/**
 * Start collecting Core Web Vitals.
 * Call once on app startup — measurements are dispatched lazily as the
 * browser collects them (LCP and CLS may arrive after user interaction).
 */
export function reportWebVitals(): void {
  try {
    onLCP(handleMetric);
    onFCP(handleMetric);
    onCLS(handleMetric);
    onINP(handleMetric);
    onTTFB(handleMetric);
    console.log(
      '%c[WebVitals] Instrumented — readings appear below as metrics fire (also saved to localStorage for Gate 4 evidence)',
      'color:#8b5cf6;font-style:italic',
    );
  } catch (err) {
    // Never let vitals reporting crash the app
    console.warn('[WebVitals] Failed to instrument:', err);
  }
}
