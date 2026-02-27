import { type ContentCard } from '../contexts/ContentContext';

// ─── SLA Configuration ────────────────────────────────────────────────────────

/** Hours of inactivity after submission before an amber ⏱ warning appears. */
export const SLA_WARNING_HOURS = 24;

/** Hours of inactivity after submission before the SLA is considered breached. */
export const SLA_BREACH_HOURS  = 48;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlaStatus = 'ok' | 'warning' | 'breached' | null;

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the SLA clock start time for a pending_approval card.
 * Priority: most recent `submitted_for_approval` audit entry → card.createdAt.
 */
export function getSlaStartTime(card: ContentCard): Date {
  const entries = card.auditLog
    .filter(e => e.action === 'submitted_for_approval')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return entries[0]?.timestamp ?? card.createdAt;
}

/**
 * Hours elapsed since the SLA clock started.
 * Returns `null` for cards that are not `pending_approval`.
 */
export function getSlaHoursElapsed(card: ContentCard): number | null {
  if (card.status !== 'pending_approval') return null;
  const start = getSlaStartTime(card);
  return (Date.now() - start.getTime()) / (1000 * 60 * 60);
}

/**
 * Returns null for non-pending cards; 'ok' / 'warning' / 'breached' for pending.
 */
export function getSlaStatus(card: ContentCard): SlaStatus {
  const hours = getSlaHoursElapsed(card);
  if (hours === null)              return null;
  if (hours >= SLA_BREACH_HOURS)  return 'breached';
  if (hours >= SLA_WARNING_HOURS) return 'warning';
  return 'ok';
}

/**
 * Remaining hours before the SLA breach threshold, clamped at 0.
 */
export function getSlaRemainingHours(card: ContentCard): number {
  const elapsed = getSlaHoursElapsed(card) ?? 0;
  return Math.max(0, SLA_BREACH_HOURS - elapsed);
}

// ─── Parameterised variants (per-tenant configurable thresholds) ──────────────

/**
 * Same as getSlaStatus but honours per-tenant threshold overrides.
 * Falls back to module-level constants when arguments are omitted.
 */
export function getSlaStatusWith(
  card: ContentCard,
  warnHours:   number = SLA_WARNING_HOURS,
  breachHours: number = SLA_BREACH_HOURS,
): SlaStatus {
  const hours = getSlaHoursElapsed(card);
  if (hours === null)          return null;
  if (hours >= breachHours)    return 'breached';
  if (hours >= warnHours)      return 'warning';
  return 'ok';
}

/**
 * Same as getSlaRemainingHours but against a configurable breach threshold.
 */
export function getSlaRemainingHoursWith(
  card: ContentCard,
  breachHours: number = SLA_BREACH_HOURS,
): number {
  const elapsed = getSlaHoursElapsed(card) ?? 0;
  return Math.max(0, breachHours - elapsed);
}

// ─── Formatters ───────────────────────────────────────────────────────────────

/**
 * Human-friendly duration string: "45m", "3h 12m", "1d 6h".
 */
export function formatSlaAge(hours: number): string {
  const totalMinutes = Math.floor(hours * 60);
  if (totalMinutes < 1)   return '< 1m';
  const days   = Math.floor(totalMinutes / (60 * 24));
  const remHrs = Math.floor((totalMinutes % (60 * 24)) / 60);
  const remMin = totalMinutes % 60;
  if (days > 0)   return `${days}d ${remHrs}h`;
  if (remHrs > 0) return `${remHrs}h ${remMin}m`;
  return `${remMin}m`;
}