/**
 * activity.tsx — Team Activity Feed Module
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides helpers for logging and retrieving team activity events.
 * Events are stored in KV as: activity:<tenantId>:<ISO-timestamp>-<random>
 *
 * Activity types cover the full social media workflow:
 *   content_created, content_edited, content_approved, content_rejected,
 *   content_published, content_scheduled, campaign_created, campaign_generated,
 *   account_connected, account_disconnected, user_invited, user_joined,
 *   comment_added, engagement_updated
 */

import * as kv from './kv_store.tsx';
import { sanitizeString } from './sanitize.tsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'content_created'
  | 'content_edited'
  | 'content_approved'
  | 'content_rejected'
  | 'content_published'
  | 'content_scheduled'
  | 'campaign_created'
  | 'campaign_generated'
  | 'account_connected'
  | 'account_disconnected'
  | 'user_invited'
  | 'user_joined'
  | 'comment_added'
  | 'engagement_updated';

export type ActivityEntityType = 'content' | 'campaign' | 'account' | 'user' | 'system';

export interface ActivityEvent {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole?: string;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId?: string;
  entityTitle?: string;
  platform?: string;
  details?: string;
  timestamp: string; // ISO 8601
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Log a new activity event to KV.
 * Key format: activity:<tenantId>:<ISO-timestamp>-<random12>
 * This ensures chronological ordering via prefix scan.
 */
export async function logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): Promise<ActivityEvent> {
  const id = generateId();
  const timestamp = new Date().toISOString();
  const full: ActivityEvent = {
    ...event,
    id,
    timestamp,
    userName: sanitizeString(event.userName),
    entityTitle: event.entityTitle ? sanitizeString(event.entityTitle) : undefined,
    details: event.details ? sanitizeString(event.details) : undefined,
  };
  const key = `activity:${event.tenantId}:${timestamp}-${id}`;
  await kv.set(key, full);
  return full;
}

/**
 * Fetch activity events for a tenant, sorted newest-first.
 * Supports optional limit (default 50, max 200) and cursor-based pagination.
 *
 * @param tenantId - Tenant to scope to
 * @param limit - Max events to return (1-200)
 * @param before - ISO timestamp cursor — only return events before this
 */
export async function getActivityFeed(
  tenantId: string,
  limit = 50,
  before?: string,
): Promise<{ events: ActivityEvent[]; hasMore: boolean }> {
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const raw: ActivityEvent[] = await kv.getByPrefix(`activity:${tenantId}:`);

  // Sort newest first
  raw.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Apply cursor
  let filtered = raw;
  if (before) {
    filtered = raw.filter(e => e.timestamp < before);
  }

  const events = filtered.slice(0, safeLimit);
  const hasMore = filtered.length > safeLimit;

  return { events, hasMore };
}
