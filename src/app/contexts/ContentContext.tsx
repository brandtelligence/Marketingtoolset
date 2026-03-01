import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react';
import {
  postActivityEvent,
  fetchRecentApprovalEvents,
  type ActivityAction,
  type ActivityEntityType,
} from '../utils/apiClient';
import { socialMediaCalendar } from '../data/socialMediaCalendar';
import { toast } from 'sonner';
import { projectId } from '/utils/supabase/info';
import { IS_DEMO_MODE } from '../config/appConfig';
import { getAuthHeaders } from '../utils/authHeaders';
import { useAuth } from '../components/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'published' | 'rejected';

/** Optional engagement metrics logged against a published card. */
export interface EngagementData {
  likes?:     number;
  comments?:  number;
  shares?:    number;
  reach?:     number;
  /** ISO timestamp of the last manual update. */
  updatedAt?: string;
}

export interface AuditEntry {
  id: string;
  action:
    | 'created'
    | 'edited'
    | 'media_uploaded'
    | 'media_removed'
    | 'submitted_for_approval'
    | 'approved'
    | 'rejected'
    | 'scheduled'
    | 'published'
    | 'status_changed'
    | 'email_notification';
  performedBy: string; // display name
  performedByEmail: string;
  timestamp: Date;
  details?: string;
}

export interface ContentCard {
  id: string;
  projectId: string;
  platform: string;          // e.g. 'instagram'
  channel: string;           // e.g. 'social-media'

  // Content
  title: string;
  caption: string;
  hashtags: string[];

  // Media
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'music';
  mediaFileName?: string;

  // Scheduling
  scheduledDate?: string;    // YYYY-MM-DD
  scheduledTime?: string;    // HH:mm

  // Status
  status: ContentStatus;

  // Approvers — team member IDs from the project
  approvers: string[];       // e.g. ['tm1', 'tm5']
  approvedBy?: string;       // team member ID
  approvedByName?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: Date;
  rejectionReason?: string;

  // Creator
  createdBy: string;         // display name
  createdByEmail: string;
  createdAt: Date;
  lastEditedBy?: string;
  lastEditedAt?: Date;

  // Audit trail
  auditLog: AuditEntry[];

  // Optional calendar / mockup metadata (for posts imported from content calendar)
  postType?: string;
  visualDescription?: string;
  callToAction?: string;

  // Engagement metrics (published cards only — manually logged by staff)
  engagementData?: EngagementData;

  // AI Media Generator — prompt history (last 5 entries, newest first)
  aiPromptHistory?: AiPromptHistoryEntry[];
}

// ─── AI Prompt History ────────────────────────────────────────────────────────

export interface AiPromptHistoryEntry {
  id:          string;
  prompt:      string;
  tab:         'image' | 'video';
  style:       string;
  aspectRatio: string;
  generatedAt: string; // ISO string
}

// ─── Approval Event (for real-time notifications) ─────────────────────────────

export interface ApprovalEvent {
  id: string;
  cardId: string;
  cardTitle: string;
  platform: string;
  action: 'approved' | 'rejected' | 'submitted_for_approval' | 'reverted_to_draft';
  performedBy: string;
  performedByEmail: string;
  reason?: string;
  timestamp: string; // ISO string for JSON serialization
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let auditIdCounter = 0;
function createAuditId() {
  return `audit_${++auditIdCounter}_${Date.now()}`;
}

/** Always returns a spec-compliant UUID so Postgres uuid columns never reject it. */
export function createCardId() {
  return crypto.randomUUID();
}

/**
 * Converts any stable string seed into a deterministic, spec-compliant UUID v4.
 * Used for mock/calendar cards so their IDs never change across page reloads
 * (keeping Postgres upsert deduplication intact) yet always satisfy the uuid column type.
 */
function deterministicUuid(seed: string): string {
  // Double djb2 hash → 128 bits
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')).padEnd(32, '0');
  // Set version = 4 and variant = 10xx
  const v = '4';
  const vnt = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${v}${hex.slice(13,16)}-${vnt}${hex.slice(17,20)}-${hex.slice(20,32)}`;
}

// ─── API Helper ───────────────────────────────────────────────────────────────

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-309fe679`;

async function apiFetch(path: string, options: RequestInit = {}) {
  // Only set Content-Type: application/json when there's a body (POST/PUT/PATCH).
  // Omitting it on GET avoids triggering an unnecessary CORS preflight.
  const hasBody = !!options.body;
  const authHeaders = await getAuthHeaders(hasBody);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API ${options.method || 'GET'} ${path} failed (${res.status}): ${errorBody}`);
  }
  return res.json();
}

// UUID guard — Postgres uuid columns reject anything that isn't a well-formed UUID.
// Applied client-side so the payload is safe even if a cached Edge Function build runs.
const _UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function toUuidOrNull(v: unknown): string | null {
  return typeof v === 'string' && _UUID_RE.test(v) ? v : null;
}

// Serialize dates in a card for JSON storage
function serializeCard(card: ContentCard): any {
  return {
    ...card,
    // --- UUID column guards ---
    // content_cards.created_by is a uuid column; ContentCard.createdBy stores a
    // display name ("Sarah Chen") which Postgres rejects. Send null for the uuid
    // column and pass the name via createdByName so the server writes it to the
    // text column created_by_name instead.
    createdByName: card.createdBy,            // → created_by_name (text)
    createdBy: toUuidOrNull(card.createdBy),  // → created_by      (uuid)
    // content_cards.approved_by is a uuid column; ContentCard.approvedBy stores
    // a mock team-member ID ("tm1") which is not a valid UUID.
    approvedBy: toUuidOrNull(card.approvedBy ?? null), // → approved_by (uuid)
    // --- Date serialisation ---
    approvedAt: card.approvedAt ? (card.approvedAt instanceof Date ? card.approvedAt.toISOString() : card.approvedAt) : undefined,
    rejectedAt: card.rejectedAt ? (card.rejectedAt instanceof Date ? card.rejectedAt.toISOString() : card.rejectedAt) : undefined,
    createdAt: card.createdAt instanceof Date ? card.createdAt.toISOString() : card.createdAt,
    lastEditedAt: card.lastEditedAt ? (card.lastEditedAt instanceof Date ? card.lastEditedAt.toISOString() : card.lastEditedAt) : undefined,
    auditLog: card.auditLog.map(e => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? e.timestamp.toISOString() : e.timestamp,
    })),
  };
}

// Deserialize dates from JSON back to Date objects
function deserializeCard(raw: any): ContentCard {
  return {
    ...raw,
    approvedAt: raw.approvedAt ? new Date(raw.approvedAt) : undefined,
    rejectedAt: raw.rejectedAt ? new Date(raw.rejectedAt) : undefined,
    createdAt: new Date(raw.createdAt),
    lastEditedAt: raw.lastEditedAt ? new Date(raw.lastEditedAt) : undefined,
    auditLog: (raw.auditLog || []).map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    })),
  };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

// Platform name normaliser: Calendar uses title-case ('Instagram'), ContentCard uses lower-case ('instagram')
const platformToLower: Record<string, string> = {
  Instagram: 'instagram', Facebook: 'facebook', LinkedIn: 'linkedin',
  Twitter: 'twitter', TikTok: 'tiktok',
};

/** Convert a static SocialPost from the calendar data file into a ContentCard */
function calendarPostToCard(post: (typeof socialMediaCalendar)[number]): ContentCard {
  // Parse "09:00 AM" → "09:00" (24-h)
  const timeParts = post.time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  let time24 = post.time;
  if (timeParts) {
    let hours = parseInt(timeParts[1], 10);
    const mins = timeParts[2];
    const ampm = timeParts[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    time24 = `${String(hours).padStart(2, '0')}:${mins}`;
  }

  // Build a safe title without toLocaleDateString at module scope
  const dateParts = post.date.split('-');
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthIdx = parseInt(dateParts[1], 10) - 1;
  const dayNum = parseInt(dateParts[2], 10);
  const dateLabel = `${monthNames[monthIdx] || dateParts[1]} ${dayNum}`;

  return {
    id: deterministicUuid(`cal_${post.id}`),
    projectId: '1', // all calendar posts belong to the vCard SaaS project
    platform: platformToLower[post.platform] || post.platform.toLowerCase(),
    channel: 'social-media',
    title: `${post.platform} ${post.postType} — ${dateLabel}`,
    caption: post.caption,
    hashtags: post.hashtags.map(tag => tag.replace(/^#/, '')),
    scheduledDate: post.date,
    scheduledTime: time24,
    status: 'scheduled',
    approvers: ['tm1'],
    approvedBy: 'tm1',
    approvedByName: 'Sarah Chen',
    approvedAt: new Date('2026-02-25T08:00:00'),
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-18T10:00:00'),
    auditLog: [
      { id: `cal_a1_${post.id}`, action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-18T10:00:00'), details: 'Imported from content calendar' },
      { id: `cal_a2_${post.id}`, action: 'approved', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-25T08:00:00'), details: 'Bulk-approved calendar content' },
      { id: `cal_a3_${post.id}`, action: 'scheduled', performedBy: 'System', performedByEmail: 'system', timestamp: new Date('2026-02-25T08:00:01'), details: `Auto-scheduled for ${post.date} at ${post.time}` },
    ],
    postType: post.postType,
    visualDescription: post.visualDescription,
    callToAction: post.callToAction,
  };
}

// Build the initial card list lazily to avoid module-scope errors
function buildInitialCards(): ContentCard[] {
  try {
    const calendarCards = socialMediaCalendar.map(calendarPostToCard);
    return [...calendarCards, ...manualMockCards];
  } catch (err) {
    console.error('[ContentContext] Failed to convert calendar data:', err);
    return [...manualMockCards];
  }
}

// Manually-authored content cards (these may overlap dates with calendar cards — that's fine)
const manualMockCards: ContentCard[] = [
  {
    id: deterministicUuid('cc_1'),
    projectId: '1',
    platform: 'instagram',
    channel: 'social-media',
    title: 'vCard Launch Announcement',
    caption: 'Meet vCard SaaS — your new digital business card platform. Create, share, and manage your professional identity with NFC technology and real-time analytics.\n\nLink in bio to learn more!\n\n#DigitalBusinessCard #vCard #Networking #TechInnovation #SaaS',
    hashtags: ['DigitalBusinessCard', 'vCard', 'Networking', 'TechInnovation', 'SaaS'],
    mediaUrl: 'https://images.unsplash.com/photo-1726607962647-84ec2451d553?w=800&h=450&fit=crop',
    mediaType: 'image',
    scheduledDate: '2026-03-02',
    scheduledTime: '11:00',
    status: 'approved',
    approvers: ['tm1', 'tm5', 'tm6'],
    approvedBy: 'tm5',
    approvedByName: 'Lisa Anderson',
    approvedAt: new Date('2026-02-22T14:30:00'),
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-20T09:15:00'),
    lastEditedBy: 'Sarah Chen',
    lastEditedAt: new Date('2026-02-21T11:00:00'),
    auditLog: [
      { id: 'a1', action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-20T09:15:00'), details: 'Content card created via AI Content Studio' },
      { id: 'a2', action: 'edited', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-21T11:00:00'), details: 'Updated caption and hashtags' },
      { id: 'a3', action: 'media_uploaded', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-21T11:05:00'), details: 'Uploaded hero banner image' },
      { id: 'a4', action: 'submitted_for_approval', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-21T15:00:00'), details: 'Submitted to Lisa Anderson, James Wright, Sarah Chen for approval' },
      { id: 'a5', action: 'approved', performedBy: 'Lisa Anderson', performedByEmail: 'lisa.anderson@brandtelligence.my', timestamp: new Date('2026-02-22T14:30:00'), details: 'Approved — Looks great, ready to publish!' },
    ],
  },
  {
    id: deterministicUuid('cc_2'),
    projectId: '1',
    platform: 'facebook',
    channel: 'social-media',
    title: 'Feature Highlight: NFC Sharing',
    caption: 'Did you know? vCard SaaS lets you share your business card instantly with a simple NFC tap.\n\nNo more fumbling with paper cards. Just tap, connect, and grow your network.\n\nTry it today: link in bio',
    hashtags: ['NFC', 'BusinessCard', 'Digital', 'Networking'],
    mediaUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=450&fit=crop',
    mediaType: 'image',
    scheduledDate: '2026-03-04',
    scheduledTime: '14:00',
    status: 'pending_approval',
    approvers: ['tm1', 'tm6'],
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-21T10:30:00'),
    auditLog: [
      { id: 'a6', action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-21T10:30:00'), details: 'Content card created via AI Content Studio' },
      { id: 'a7', action: 'submitted_for_approval', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-22T09:00:00'), details: 'Submitted to Sarah Chen, James Wright for approval' },
    ],
  },
  {
    id: deterministicUuid('cc_3'),
    projectId: '1',
    platform: 'linkedin',
    channel: 'social-media',
    title: 'Case Study: Digital Transformation',
    caption: "I'm excited to share a project our team has been building: vCard SaaS.\n\nA comprehensive platform enabling professionals to create, share, and manage digital business cards with NFC technology, QR codes, and real-time analytics.\n\nAfter months of development, we're seeing incredible results with our early adopters. Here's what we've learned about building products that matter...\n\n[Read the full case study]",
    hashtags: ['DigitalTransformation', 'SaaS', 'CaseStudy', 'ThoughtLeadership'],
    status: 'draft',
    approvers: [],
    createdBy: 'Marcus Johnson',
    createdByEmail: 'marcus.johnson@brandtelligence.my',
    createdAt: new Date('2026-02-23T16:45:00'),
    auditLog: [
      { id: 'a8', action: 'created', performedBy: 'Marcus Johnson', performedByEmail: 'marcus.johnson@brandtelligence.my', timestamp: new Date('2026-02-23T16:45:00'), details: 'Content card created manually' },
    ],
  },
  {
    id: deterministicUuid('cc_4'),
    projectId: '1',
    platform: 'tiktok',
    channel: 'social-media',
    title: 'POV: You Discover vCard',
    caption: 'POV: You just discovered vCard SaaS and your networking game changed forever\n\n#MarketingTips #DigitalMarketing #BrandGrowth #FYP #vCard',
    hashtags: ['MarketingTips', 'DigitalMarketing', 'BrandGrowth', 'FYP', 'vCard'],
    mediaType: 'video',
    scheduledDate: '2026-03-05',
    scheduledTime: '19:00',
    status: 'rejected',
    approvers: ['tm5', 'tm6'],
    rejectedBy: 'tm6',
    rejectedByName: 'James Wright',
    rejectedAt: new Date('2026-02-23T11:20:00'),
    rejectionReason: 'Video concept needs more brand alignment. Please revise the opening hook and add our logo animation.',
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-22T14:00:00'),
    auditLog: [
      { id: 'a9', action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-22T14:00:00'), details: 'Content card created via AI Content Studio' },
      { id: 'a10', action: 'submitted_for_approval', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-22T16:00:00'), details: 'Submitted to Lisa Anderson, James Wright for approval' },
      { id: 'a11', action: 'rejected', performedBy: 'James Wright', performedByEmail: 'james.wright@brandtelligence.my', timestamp: new Date('2026-02-23T11:20:00'), details: 'Video concept needs more brand alignment. Please revise the opening hook and add our logo animation.' },
    ],
  },
  {
    id: deterministicUuid('cc_5'),
    projectId: '1',
    platform: 'twitter',
    channel: 'social-media',
    title: 'Product Launch Thread',
    caption: 'Introducing vCard SaaS — the smarter way to grow your professional network.\n\nThread incoming...',
    hashtags: ['vCard', 'Launch', 'SaaS'],
    scheduledDate: '2026-03-01',
    scheduledTime: '09:00',
    status: 'scheduled',
    approvers: ['tm1'],
    approvedBy: 'tm1',
    approvedByName: 'Sarah Chen',
    approvedAt: new Date('2026-02-24T10:00:00'),
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-20T11:00:00'),
    auditLog: [
      { id: 'a12', action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-20T11:00:00') },
      { id: 'a13', action: 'submitted_for_approval', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-23T09:00:00') },
      { id: 'a14', action: 'approved', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-24T10:00:00'), details: 'Auto-approved by project lead' },
      { id: 'a15', action: 'scheduled', performedBy: 'System', performedByEmail: 'system', timestamp: new Date('2026-02-24T10:00:01'), details: 'Auto-scheduled for Mar 1, 2026 at 09:00 on X (Twitter)' },
    ],
  },
  // ── Due TODAY (Feb 27 2026) — demonstrates the "Due Today" publish badge ──
  {
    id: deterministicUuid('cc_6'),
    projectId: '1',
    platform: 'instagram',
    channel: 'social-media',
    title: 'Community Spotlight: Your vCard Stories',
    caption: "We love hearing how you're using vCard SaaS to grow your network! 🌟\n\nThis week's spotlight: connect, share, and grow — all from one tap.\n\nShare your vCard story in the comments below! 👇\n\n#CommunitySpotlight #vCard #Networking #DigitalCard",
    hashtags: ['CommunitySpotlight', 'vCard', 'Networking', 'DigitalCard'],
    mediaUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop',
    mediaType: 'image',
    scheduledDate: '2026-02-27',
    scheduledTime: '10:00',
    status: 'scheduled',
    approvers: ['tm1', 'tm5'],
    approvedBy: 'tm5',
    approvedByName: 'Lisa Anderson',
    approvedAt: new Date('2026-02-26T09:00:00'),
    createdBy: 'Sarah Chen',
    createdByEmail: 'sarah.chen@brandtelligence.my',
    createdAt: new Date('2026-02-24T14:00:00'),
    lastEditedBy: 'Sarah Chen',
    lastEditedAt: new Date('2026-02-25T10:30:00'),
    auditLog: [
      { id: 'a16', action: 'created', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-24T14:00:00'), details: 'Content card created via AI Content Studio' },
      { id: 'a17', action: 'edited', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-25T10:30:00'), details: 'Caption polished and hashtags refined' },
      { id: 'a18', action: 'submitted_for_approval', performedBy: 'Sarah Chen', performedByEmail: 'sarah.chen@brandtelligence.my', timestamp: new Date('2026-02-25T11:00:00'), details: 'Submitted to Lisa Anderson, Sarah Chen for approval' },
      { id: 'a19', action: 'approved', performedBy: 'Lisa Anderson', performedByEmail: 'lisa.anderson@brandtelligence.my', timestamp: new Date('2026-02-26T09:00:00'), details: 'Great community content — approved!' },
      { id: 'a20', action: 'scheduled', performedBy: 'System', performedByEmail: 'system', timestamp: new Date('2026-02-26T09:00:01'), details: 'Auto-scheduled for Feb 27, 2026 at 10:00 on Instagram' },
    ],
  },
  // ── OVERDUE (Feb 25 2026) — demonstrates the "Overdue" publish badge ──
  {
    id: deterministicUuid('cc_7'),
    projectId: '1',
    platform: 'facebook',
    channel: 'social-media',
    title: 'vCard Analytics Dashboard — Live Preview',
    caption: "Data-driven networking is here. 📊\n\nWith vCard SaaS's new analytics dashboard, you can see:\n• Who viewed your digital card\n• When they viewed it\n• What links they clicked\n• Where they're located\n\nKnowledge is power. Turn every connection into an insight.",
    hashtags: ['Analytics', 'vCard', 'DataDriven', 'BusinessGrowth', 'SmartNetworking'],
    mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=450&fit=crop',
    mediaType: 'image',
    scheduledDate: '2026-02-25',
    scheduledTime: '14:00',
    status: 'scheduled',
    approvers: ['tm1', 'tm6'],
    approvedBy: 'tm6',
    approvedByName: 'James Wright',
    approvedAt: new Date('2026-02-24T16:00:00'),
    createdBy: 'Marcus Johnson',
    createdByEmail: 'marcus.johnson@brandtelligence.my',
    createdAt: new Date('2026-02-22T09:00:00'),
    auditLog: [
      { id: 'a21', action: 'created', performedBy: 'Marcus Johnson', performedByEmail: 'marcus.johnson@brandtelligence.my', timestamp: new Date('2026-02-22T09:00:00'), details: 'Content card created manually' },
      { id: 'a22', action: 'submitted_for_approval', performedBy: 'Marcus Johnson', performedByEmail: 'marcus.johnson@brandtelligence.my', timestamp: new Date('2026-02-23T10:00:00'), details: 'Submitted to Sarah Chen, James Wright for approval' },
      { id: 'a23', action: 'approved', performedBy: 'James Wright', performedByEmail: 'james.wright@brandtelligence.my', timestamp: new Date('2026-02-24T16:00:00'), details: 'Dashboard content looks professional and accurate.' },
      { id: 'a24', action: 'scheduled', performedBy: 'System', performedByEmail: 'system', timestamp: new Date('2026-02-24T16:00:01'), details: 'Auto-scheduled for Feb 25, 2026 at 14:00 on Facebook' },
    ],
  },
];

// Combine calendar and manual cards
const mockCards: ContentCard[] = buildInitialCards();

// ─── Context ──────────────────────────────────────────────────────────────────

interface ContentContextType {
  cards: ContentCard[];
  getCardsByProject: (projectId: string) => ContentCard[];
  addCard: (card: ContentCard) => void;
  addCards: (cards: ContentCard[]) => void;
  updateCard: (card: ContentCard) => void;
  deleteCard: (cardId: string) => void;
  addAuditEntry: (cardId: string, entry: Omit<AuditEntry, 'id'>) => void;
  logApprovalEvent: (event: ApprovalEvent) => void;
  recentEvents: ApprovalEvent[];
  isLoading: boolean;
  isSynced: boolean;
  /** Re-fetch all cards from the server (e.g. after an analytics sync). */
  refreshCards: () => Promise<void>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: ReactNode }) {
  // Demo mode: start with mock cards in memory (no server sync).
  // Production mode: start empty, load exclusively from Supabase.
  const [cards, setCards] = useState<ContentCard[]>(IS_DEMO_MODE ? mockCards : []);
  const [recentEvents, setRecentEvents] = useState<ApprovalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(IS_DEMO_MODE);
  const initialLoadDone = useRef(false);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auth state — needed so we only fetch from Supabase once the user is
  // authenticated (unauthenticated requests would 401 and cause CORS / fetch errors).
  const { user, sessionLoading } = useAuth();

  // ── Activity Feed integration (fire-and-forget) ──
  // Maps content mutations to activity events for the Team Activity Feed.
  // Failures are silently logged — activity tracking must never block content ops.
  const emitActivity = useCallback((
    action: ActivityAction,
    card: ContentCard | null,
    opts?: { details?: string; entityType?: ActivityEntityType },
  ) => {
    if (!user) return;
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    postActivityEvent({
      action,
      entityType: opts?.entityType ?? 'content',
      userName,
      userAvatar: user.profileImage || undefined,
      userRole: user.role ?? 'EMPLOYEE',
      entityId: card?.id,
      entityTitle: card?.title,
      platform: card?.platform,
      details: opts?.details,
    }).catch(err => {
      console.error('[ContentContext] Activity event failed (non-blocking):', err);
    });
  }, [user]);

  // Keep a ref to current cards so updateCard can detect status changes
  // without needing `cards` in its dependency array (avoids re-creating the callback).
  const cardsRef = useRef<ContentCard[]>(cards);
  useEffect(() => { cardsRef.current = cards; }, [cards]);

  // ── Load cards from Supabase when auth resolves ──
  useEffect(() => {
    // Demo mode: mock cards are already in state — skip server fetch entirely.
    if (IS_DEMO_MODE) {
      if (isLoading) {
        setIsLoading(false);
        console.log(`[ContentContext] Demo mode — using ${mockCards.length} local mock cards (nothing pushed to Supabase)`);
      }
      return;
    }

    // Wait until the auth provider has resolved its session state.
    if (sessionLoading) return;

    // No authenticated user → stay empty (don't fire an unauthenticated fetch
    // that would 401 and potentially fail at the CORS preflight level).
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Guard against duplicate fetches on re-renders.
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // Production mode: fetch from server, never seed mock data.
    // Pass tenantId so the server can scope the query (required for non-SUPER_ADMIN).
    const tenantParam = user.tenantId ? `?tenantId=${encodeURIComponent(user.tenantId)}` : '';
    (async () => {
      try {
        const data = await apiFetch(`/content-cards${tenantParam}`);
        if (data.initialized && data.cards && data.cards.length > 0) {
          const deserialized = data.cards.map(deserializeCard);
          setCards(deserialized);
          setIsSynced(true);
          console.log(`[ContentContext] Loaded ${deserialized.length} cards from Supabase`);
        } else if (user.tenantId) {
          // No cards found for this tenant — attempt self-healing backfill
          // in case orphaned rows exist with tenant_id = null (Phase 2 fix).
          console.log('[ContentContext] No tenant-scoped cards found — attempting backfill…');
          try {
            const bf = await apiFetch('/content-cards/backfill-tenant', { method: 'POST' });
            if (bf.updated > 0) {
              console.log(`[ContentContext] Backfill assigned ${bf.updated} orphaned cards to tenant ${user.tenantId}`);
              // Re-fetch after backfill
              const retry = await apiFetch(`/content-cards${tenantParam}`);
              if (retry.cards?.length > 0) {
                setCards(retry.cards.map(deserializeCard));
                setIsSynced(true);
              } else {
                setCards([]);
                setIsSynced(true);
              }
            } else {
              console.log('[ContentContext] No orphaned cards found — starting with empty board');
              setCards([]);
              setIsSynced(true);
            }
          } catch (bfErr) {
            console.warn('[ContentContext] Backfill attempt failed (non-fatal):', bfErr);
            setCards([]);
            setIsSynced(true);
          }
        } else {
          // No tenantId (SUPER_ADMIN) — start with empty board
          console.log('[ContentContext] No server data found — starting with empty board');
          setCards([]);
          setIsSynced(true);
        }
      } catch (error) {
        console.error('[ContentContext] Failed to load from Supabase:', error);
        // Production: remain with empty array — do NOT fall back to mock data
        setCards([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user, sessionLoading]);

  // ── Load recent approval events so the approval bell is populated after reload ──
  useEffect(() => {
    if (IS_DEMO_MODE || !user?.tenantId || isLoading) return;
    fetchRecentApprovalEvents(user.tenantId, 20).then(serverEvents => {
      if (serverEvents.length > 0) {
        const mapped: ApprovalEvent[] = serverEvents.map(e => ({
          id: e.id,
          cardId: e.cardId,
          cardTitle: e.cardTitle,
          platform: e.platform,
          action: e.eventType as ApprovalEvent['action'],
          performedBy: e.performedBy,
          performedByEmail: e.performedByEmail,
          reason: e.reason,
          timestamp: e.createdAt,
        }));
        setRecentEvents(prev => {
          // Merge server events with any in-session events, dedup by id
          const ids = new Set(prev.map(e => e.id));
          const newOnes = mapped.filter(e => !ids.has(e.id));
          return [...prev, ...newOnes].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ).slice(0, 50);
        });
        console.log(`[ContentContext] Loaded ${serverEvents.length} recent approval events`);
      }
    }).catch(err => {
      console.warn('[ContentContext] Approval events load failed (non-fatal):', err);
    });
  }, [user?.tenantId, isLoading]);

  // ── Sync helpers ──
  const syncAllCards = async (cardsToSync: ContentCard[]) => {
    if (IS_DEMO_MODE) return; // Demo mode: no server to sync to
    try {
      // Belt-and-suspenders: inject tenantId so cards always carry tenant scope
      const tid = user?.tenantId ?? null;
      const serialized = cardsToSync.map(c => ({ ...serializeCard(c), tenantId: tid }));
      await apiFetch('/content-cards/sync', {
        method: 'POST',
        body: JSON.stringify({ cards: serialized }),
      });
      setIsSynced(true);
    } catch (error) {
      console.error('[ContentContext] Sync failed:', error);
      setIsSynced(false);
    }
  };

  const persistCard = async (card: ContentCard) => {
    if (IS_DEMO_MODE) return; // Demo mode: keep cards local-only
    try {
      const tid = user?.tenantId ?? null;
      await apiFetch('/content-cards', {
        method: 'POST',
        body: JSON.stringify({ card: { ...serializeCard(card), tenantId: tid } }),
      });
    } catch (error) {
      console.error(`[ContentContext] Failed to persist card ${card.id}:`, error);
    }
  };

  const deleteCardFromServer = async (cardId: string) => {
    if (IS_DEMO_MODE) return; // Demo mode: no server-side deletion
    try {
      await apiFetch(`/content-cards/${cardId}`, { method: 'DELETE' });
    } catch (error) {
      console.error(`[ContentContext] Failed to delete card ${cardId} from server:`, error);
    }
  };

  // Debounced full sync after batch operations
  const debouncedSync = useCallback((updatedCards: ContentCard[]) => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => syncAllCards(updatedCards), 2000);
  }, []);

  const getCardsByProject = useCallback(
    (projectId: string) => cards.filter(c => c.projectId === projectId),
    [cards]
  );

  const addCard = useCallback((card: ContentCard) => {
    setCards(prev => {
      const updated = [card, ...prev];
      persistCard(card); // fire-and-forget
      return updated;
    });
    // Activity Feed: content_created
    emitActivity('content_created', card);
  }, [emitActivity]);

  const addCards = useCallback((newCards: ContentCard[]) => {
    setCards(prev => {
      const updated = [...newCards, ...prev];
      // Persist all new cards
      newCards.forEach(card => persistCard(card));
      return updated;
    });
    // Activity Feed: campaign_generated (batch creation is typically from AI calendar)
    if (newCards.length > 0) {
      const firstCard = newCards[0];
      emitActivity('campaign_generated', firstCard, {
        entityType: 'campaign',
        details: `AI generated ${newCards.length} post${newCards.length > 1 ? 's' : ''} across ${new Set(newCards.map(c => c.platform)).size} platform(s)`,
      });
    }
  }, [emitActivity]);

  // ── Status-change detection map for Activity Feed ──
  const STATUS_TO_ACTIVITY: Partial<Record<ContentStatus, ActivityAction>> = {
    approved:  'content_approved',
    rejected:  'content_rejected',
    scheduled: 'content_scheduled',
    published: 'content_published',
  };

  const updateCard = useCallback((updated: ContentCard) => {
    setCards(prev => {
      // Detect status transition for Activity Feed
      const oldCard = cardsRef.current.find(c => c.id === updated.id);
      if (oldCard && oldCard.status !== updated.status) {
        const activityAction = STATUS_TO_ACTIVITY[updated.status];
        if (activityAction) {
          emitActivity(activityAction, updated, {
            details: `Status changed from ${oldCard.status} to ${updated.status}`,
          });
        }
      } else if (oldCard && oldCard.status === updated.status) {
        // Content was edited (same status, different content)
        const captionChanged = oldCard.caption !== updated.caption;
        const titleChanged = oldCard.title !== updated.title;
        const mediaChanged = oldCard.mediaUrl !== updated.mediaUrl;
        if (captionChanged || titleChanged || mediaChanged) {
          emitActivity('content_edited', updated);
        }
      }

      const newCards = prev.map(c => (c.id === updated.id ? updated : c));
      persistCard(updated); // fire-and-forget
      return newCards;
    });
  }, [emitActivity]);

  const deleteCard = useCallback((cardId: string) => {
    setCards(prev => {
      const updated = prev.filter(c => c.id !== cardId);
      deleteCardFromServer(cardId); // fire-and-forget
      return updated;
    });
  }, []);

  const addAuditEntry = useCallback((cardId: string, entry: Omit<AuditEntry, 'id'>) => {
    setCards(prev => {
      const newCards = prev.map(c => {
        if (c.id !== cardId) return c;
        const updated = { ...c, auditLog: [...c.auditLog, { ...entry, id: createAuditId() }] };
        persistCard(updated); // fire-and-forget
        return updated;
      });
      return newCards;
    });
  }, []);

  // ── Approval event logging ──
  const logApprovalEvent = useCallback((event: ApprovalEvent) => {
    setRecentEvents(prev => [event, ...prev].slice(0, 50));

    // Persist to server
    if (!IS_DEMO_MODE) {
      apiFetch('/approval-events', {
        method: 'POST',
        body: JSON.stringify({ event }),
      }).catch(error => {
        console.error('[ContentContext] Failed to log approval event:', error);
      });
    }

    // Activity Feed: map approval actions → activity actions
    // (updateCard also detects status changes, but logApprovalEvent carries
    //  richer context like rejection reasons and the performer's name.)
    const APPROVAL_TO_ACTIVITY: Record<string, ActivityAction | null> = {
      approved: 'content_approved',
      rejected: 'content_rejected',
      submitted_for_approval: null, // no direct ActivityAction; skip
      reverted_to_draft: null,      // handled as content_edited via updateCard
    };
    const activityAction = APPROVAL_TO_ACTIVITY[event.action];
    if (activityAction) {
      // Build a lightweight card-like object for the emitter
      const cardStub: ContentCard = {
        id: event.cardId,
        title: event.cardTitle,
        platform: event.platform,
        // Minimal required fields (not used by emitActivity beyond id/title/platform)
        projectId: '', channel: '', caption: '', hashtags: [],
        status: event.action === 'approved' ? 'approved' : 'rejected',
        approvers: [], createdBy: event.performedBy,
        createdByEmail: event.performedByEmail,
        createdAt: new Date(), auditLog: [],
      };
      emitActivity(activityAction, cardStub, {
        details: event.reason || `${event.performedBy} ${event.action} "${event.cardTitle}"`,
      });
    }

    // Show real-time toast
    const actionEmojis: Record<string, string> = {
      approved: '✅',
      rejected: '❌',
      submitted_for_approval: '📤',
      reverted_to_draft: '🔄',
    };
    const actionLabels: Record<string, string> = {
      approved: 'approved',
      rejected: 'rejected',
      submitted_for_approval: 'submitted for approval',
      reverted_to_draft: 'reverted to draft',
    };

    const emoji = actionEmojis[event.action] || '📋';
    const label = actionLabels[event.action] || event.action;

    toast(`${emoji} Content ${label}`, {
      description: `"${event.cardTitle}" on ${event.platform} — by ${event.performedBy}`,
      duration: 5000,
    });
  }, [emitActivity]);

  // ── Re-fetch cards from the server ──
  const refreshCards = useCallback(async () => {
    // Demo mode: no server to refresh from — keep local mock cards
    if (IS_DEMO_MODE) {
      console.log('[ContentContext] Demo mode — refreshCards is a no-op');
      return;
    }

    // Guard: don't fetch if no authenticated user
    if (!user) {
      console.log('[ContentContext] refreshCards skipped — no authenticated user');
      return;
    }

    try {
      const tenantParam = user.tenantId ? `?tenantId=${encodeURIComponent(user.tenantId)}` : '';
      const data = await apiFetch(`/content-cards${tenantParam}`);
      if (data.initialized && data.cards && data.cards.length > 0) {
        const deserialized = data.cards.map(deserializeCard);
        setCards(deserialized);
        setIsSynced(true);
        console.log(`[ContentContext] Refreshed ${deserialized.length} cards from Supabase`);
      } else {
        // Server has no data — keep current state, don't seed mock data
        console.log('[ContentContext] No server data on refresh — keeping current cards');
      }
    } catch (error) {
      console.error('[ContentContext] Failed to refresh from Supabase:', error);
    }
  }, [user]);

  return (
    <ContentContext.Provider value={{
      cards, getCardsByProject, addCard, addCards, updateCard, deleteCard,
      addAuditEntry, logApprovalEvent, recentEvents, isLoading, isSynced,
      refreshCards,
    }}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextType {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    // Return a safe no-op fallback so components can render outside the provider
    // (e.g. Figma preview iframe, React Router error boundaries)
    return {
      cards: [],
      getCardsByProject: () => [],
      addCard: () => {},
      addCards: () => {},
      updateCard: () => {},
      deleteCard: () => {},
      addAuditEntry: () => {},
      logApprovalEvent: () => {},
      recentEvents: [],
      isLoading: false,
      isSynced: false,
      refreshCards: () => Promise.resolve(),
    };
  }
  return ctx;
}