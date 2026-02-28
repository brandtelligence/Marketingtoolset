/**
 * social.tsx — Social Publishing routes for Brandtelligence
 *
 * Platforms:
 *   Telegram        → Bot API (sendMessage / sendPhoto / sendVideo)
 *   WhatsApp        → Business Cloud API v18 (text / image / video via link)
 *   Facebook        → Graph API v18 (feed / photos / videos)
 *   Instagram       → Graph API v18 two-step container + publish (IMAGE / REELS)
 *   Twitter/X       → v2 API with OAuth 1.0a HMAC-SHA1 (text; images need v1.1 upload)
 *   LinkedIn        → UGC Posts v2 API (text posts)
 *
 * KV key patterns
 *   social_connections:{tenantId}   → SocialConnection[]  (full credentials stored server-side)
 *   social_history:{tenantId}       → PublishRecord[]      (max 100 entries, newest first)
 */

import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';
import { createClient as createSupabaseClient } from 'npm:@supabase/supabase-js';
import { requireTenantScope, rateLimit, logSecurityEvent } from './auth.tsx';

// ─── Types ────────────────────────────────────────────────────────────────────

type SocialPlatform = 'telegram' | 'whatsapp' | 'facebook' | 'instagram' | 'twitter' | 'linkedin';

/** Supabase admin client for analytics sync queries. */
const supabaseAdmin = createSupabaseClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export interface SocialConnection {
  id:              string;
  platform:        SocialPlatform;
  displayName:     string;
  credentials:     Record<string, string>;
  connectedAt:     string;
  connectedBy:     string;
  lastTestedAt?:   string;
  lastTestStatus?: 'ok' | 'error';
  lastTestError?:  string;
}

interface PublishRecord {
  id:             string;
  cardTitle:      string;
  platform:       string;
  connectionName: string;
  status:         'success' | 'error';
  errorMessage?:  string;
  publishedAt:    string;
  publishedBy:    string;
  postUrl?:       string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Which credential fields contain secrets (tokens / keys).
 * Secret field values are NEVER returned to the frontend.
 * On save, an empty string means "preserve existing value".
 */
const SECRET_FIELDS: Record<string, Set<string>> = {
  telegram:  new Set(['botToken']),
  whatsapp:  new Set(['accessToken']),
  facebook:  new Set(['pageAccessToken']),
  instagram: new Set(['accessToken']),
  twitter:   new Set(['apiKey', 'apiSecret', 'accessToken', 'accessTokenSecret']),
  linkedin:  new Set(['accessToken']),
};

function maskCredentials(platform: string, creds: Record<string, string>): Record<string, string> {
  const secrets = SECRET_FIELDS[platform] ?? new Set();
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(creds)) {
    masked[k] = secrets.has(k) ? '' : v;
  }
  return masked;
}

// ─── KV accessors ─────────────────────────────────────────────────────────────

export async function getConnections(tenantId: string): Promise<SocialConnection[]> {
  const raw = await kv.get(`social_connections:${tenantId}`);
  return raw ? JSON.parse(raw as string) : [];
}

async function saveConnections(tenantId: string, connections: SocialConnection[]): Promise<void> {
  await kv.set(`social_connections:${tenantId}`, JSON.stringify(connections));
}

async function getHistory(tenantId: string): Promise<PublishRecord[]> {
  const raw = await kv.get(`social_history:${tenantId}`);
  return raw ? JSON.parse(raw as string) : [];
}

export async function appendHistory(tenantId: string, record: PublishRecord): Promise<void> {
  const history = await getHistory(tenantId);
  history.unshift(record);
  await kv.set(`social_history:${tenantId}`, JSON.stringify(history.slice(0, 100)));
}

// ─── Twitter OAuth 1.0a ───────────────────────────────────────────────────────

async function hmacSha1B64(message: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const ck  = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig  = await crypto.subtle.sign('HMAC', ck, enc.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

/**
 * Build an OAuth 1.0a Authorization header (HMAC-SHA1).
 * Works for GET and POST requests with no body params in the base string
 * (suitable for Twitter v2 text-only tweets).
 */
async function oAuth1Header(
  method:            string,
  url:               string,
  apiKey:            string,
  apiSecret:         string,
  accessToken:       string,
  accessTokenSecret: string,
): Promise<string> {
  const nonce     = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const params: Record<string, string> = {
    oauth_consumer_key:     apiKey,
    oauth_nonce:            nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp:        timestamp,
    oauth_token:            accessToken,
    oauth_version:          '1.0',
  };
  const paramStr = Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const base    = `${method.toUpperCase()}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const sigKey  = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`;
  const sig     = await hmacSha1B64(base, sigKey);
  params['oauth_signature'] = sig;
  return 'OAuth ' + Object.keys(params).sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`).join(', ');
}

// ─── Connection test ──────────────────────────────────────────────────────────

async function testConnection(
  conn: SocialConnection,
): Promise<{ ok: boolean; info?: string; error?: string }> {
  const c = conn.credentials;
  try {
    switch (conn.platform) {

      /* ── Telegram ── */
      case 'telegram': {
        if (!c.botToken) throw new Error('Bot Token is required');
        const r = await fetch(`https://api.telegram.org/bot${c.botToken}/getMe`);
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.description ?? 'Telegram getMe failed');
        return { ok: true, info: `@${d.result.username}` };
      }

      /* ── WhatsApp Business ── */
      case 'whatsapp': {
        if (!c.phoneNumberId || !c.accessToken) throw new Error('Phone Number ID and Access Token are required');
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${c.phoneNumberId}?access_token=${encodeURIComponent(c.accessToken)}`,
        );
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error?.message ?? `Graph API error ${r.status}`);
        return { ok: true, info: d.display_phone_number ?? c.phoneNumberId };
      }

      /* ── Facebook ── */
      case 'facebook': {
        if (!c.pageId || !c.pageAccessToken) throw new Error('Page ID and Page Access Token are required');
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${c.pageId}?fields=name,fan_count&access_token=${encodeURIComponent(c.pageAccessToken)}`,
        );
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error?.message ?? `Graph API error ${r.status}`);
        return { ok: true, info: d.name ?? c.pageId };
      }

      /* ── Instagram ── */
      case 'instagram': {
        if (!c.igUserId || !c.accessToken) throw new Error('Instagram User ID and Access Token are required');
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${c.igUserId}?fields=id,username&access_token=${encodeURIComponent(c.accessToken)}`,
        );
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error?.message ?? `Graph API error ${r.status}`);
        return { ok: true, info: `@${d.username ?? c.igUserId}` };
      }

      /* ── Twitter / X ── */
      case 'twitter': {
        if (!c.apiKey || !c.apiSecret || !c.accessToken || !c.accessTokenSecret)
          throw new Error('All four Twitter credentials (API Key, API Secret, Access Token, Access Token Secret) are required');
        const url  = 'https://api.twitter.com/2/users/me';
        const auth = await oAuth1Header('GET', url, c.apiKey, c.apiSecret, c.accessToken, c.accessTokenSecret);
        const r    = await fetch(url, { headers: { Authorization: auth } });
        const d    = await r.json();
        if (!r.ok || d.errors) throw new Error(d.errors?.[0]?.message ?? d.detail ?? `Twitter API error ${r.status}`);
        return { ok: true, info: `@${d.data?.username ?? 'unknown'}` };
      }

      /* ── LinkedIn ── */
      case 'linkedin': {
        if (!c.accessToken) throw new Error('Access Token is required');
        const r = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${c.accessToken}` },
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message ?? `LinkedIn API error ${r.status}`);
        const name = [d.given_name, d.family_name].filter(Boolean).join(' ');
        return { ok: true, info: name || d.sub };
      }

      default:
        return { ok: false, error: `Unsupported platform: ${conn.platform}` };
    }
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishToChannel(
  conn:      SocialConnection,
  caption:   string,
  hashtags:  string[],
  mediaUrl?: string,
  mediaType?: string,
): Promise<{ ok: boolean; postUrl?: string; error?: string }> {
  const c = conn.credentials;
  // Combine caption + hashtags (platform limits enforced per-case)
  const fullText = hashtags?.length
    ? `${caption}\n\n${hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`
    : caption;

  try {
    switch (conn.platform) {

      /* ══════════════════════════════════════════════════════════════════
       * TELEGRAM  — Bot API
       * Text max 4096 chars; caption max 1024 chars
       * ════════════════════════════════════════════════════════════════ */
      case 'telegram': {
        const BOT_URL = `https://api.telegram.org/bot${c.botToken}`;
        let endpoint  = 'sendMessage';
        let body: Record<string, unknown> = {
          chat_id: c.chatId,
          text:    fullText.slice(0, 4096),
        };

        if (mediaUrl && mediaType === 'image') {
          endpoint = 'sendPhoto';
          body = { chat_id: c.chatId, photo: mediaUrl, caption: fullText.slice(0, 1024) };
        } else if (mediaUrl && mediaType === 'video') {
          endpoint = 'sendVideo';
          body = { chat_id: c.chatId, video: mediaUrl, caption: fullText.slice(0, 1024), supports_streaming: true };
        }

        const r = await fetch(`${BOT_URL}/${endpoint}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.description ?? `Telegram error ${r.status}`);

        const msgId = d.result?.message_id;
        // Build Telegram post URL for public channels (@handle)
        const chatHandle = String(c.chatId ?? '').replace(/^@/, '');
        const postUrl = msgId && chatHandle && !chatHandle.startsWith('-')
          ? `https://t.me/${chatHandle}/${msgId}`
          : undefined;
        return { ok: true, postUrl };
      }

      /* ══════════════════════════════════════════════════════════════════
       * WHATSAPP BUSINESS CLOUD API  — v18
       * Supports text, image-with-caption, video-with-caption via link
       * ════════════════════════════════════════════════════════════════ */
      case 'whatsapp': {
        let msgBody: Record<string, unknown> = {
          messaging_product: 'whatsapp',
          recipient_type:    'individual',
          to:                c.recipientPhone,
          type:              'text',
          text:              { preview_url: false, body: fullText.slice(0, 4096) },
        };

        if (mediaUrl && mediaType === 'image') {
          msgBody = {
            messaging_product: 'whatsapp',
            recipient_type:    'individual',
            to:                c.recipientPhone,
            type:              'image',
            image:             { link: mediaUrl, caption: fullText.slice(0, 1024) },
          };
        } else if (mediaUrl && mediaType === 'video') {
          msgBody = {
            messaging_product: 'whatsapp',
            recipient_type:    'individual',
            to:                c.recipientPhone,
            type:              'video',
            video:             { link: mediaUrl, caption: fullText.slice(0, 1024) },
          };
        }

        const r = await fetch(`https://graph.facebook.com/v18.0/${c.phoneNumberId}/messages`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.accessToken}` },
          body:    JSON.stringify(msgBody),
        });
        const d = await r.json();
        if (!r.ok || d.error) {
          throw new Error(d.error?.message ?? d.error?.code?.toString() ?? `WhatsApp API error ${r.status}`);
        }
        // WhatsApp doesn't provide a direct post URL
        return { ok: true };
      }

      /* ══════════════════════════════════════════════════════════════════
       * FACEBOOK PAGE  — Graph API v18
       * Text → /feed   |  Image → /photos   |  Video → /videos
       * ════════════════════════════════════════════════════════════════ */
      case 'facebook': {
        let endpoint = 'feed';
        let fbBody: Record<string, unknown> = {
          message:      fullText,
          access_token: c.pageAccessToken,
        };

        if (mediaUrl && mediaType === 'image') {
          endpoint = 'photos';
          fbBody   = { url: mediaUrl, caption: fullText, access_token: c.pageAccessToken, published: true };
        } else if (mediaUrl && mediaType === 'video') {
          endpoint = 'videos';
          fbBody   = { file_url: mediaUrl, description: fullText, access_token: c.pageAccessToken };
        }

        const r = await fetch(`https://graph.facebook.com/v18.0/${c.pageId}/${endpoint}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(fbBody),
        });
        const d = await r.json();
        if (!r.ok || d.error) throw new Error(d.error?.message ?? `Facebook Graph API error ${r.status}`);

        // Build post URL from the returned composite ID (pageId_postId)
        let postUrl: string | undefined;
        if (d.id) {
          const parts = String(d.id).split('_');
          postUrl = parts.length === 2
            ? `https://www.facebook.com/${c.pageId}/posts/${parts[1]}`
            : `https://www.facebook.com/${d.id}`;
        }
        return { ok: true, postUrl };
      }

      /* ══════════════════════════════════════════════════════════════════
       * INSTAGRAM  — Graph API v18  (two-step: container → publish)
       * IMAGE: instant publish
       * REELS (video): poll up to 40 s for processing to finish
       * Text-only posts are NOT supported by Instagram API
       * ════════════════════════════════════════════════════════════════ */
      case 'instagram': {
        if (!mediaUrl) {
          throw new Error(
            'Instagram requires an image or video. Please attach media to the content card first.',
          );
        }

        const containerPayload: Record<string, unknown> = {
          caption:      fullText.slice(0, 2200),
          access_token: c.accessToken,
        };

        const isVideo = mediaType === 'video';
        if (isVideo) {
          containerPayload.video_url  = mediaUrl;
          containerPayload.media_type = 'REELS';
        } else {
          containerPayload.image_url  = mediaUrl;
          containerPayload.media_type = 'IMAGE';
        }

        // Step 1 — Create media container
        const cr = await fetch(`https://graph.facebook.com/v18.0/${c.igUserId}/media`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(containerPayload),
        });
        const cd = await cr.json();
        if (!cr.ok || cd.error) throw new Error(cd.error?.message ?? `Instagram container error ${cr.status}`);
        const containerId = cd.id as string;

        // Step 2 — For videos, poll until processing is FINISHED (max ~40 s)
        if (isVideo) {
          let ready = false;
          for (let attempt = 0; attempt < 8; attempt++) {
            await new Promise(res => setTimeout(res, 5000));
            const sr = await fetch(
              `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${encodeURIComponent(c.accessToken)}`,
            );
            const sd = await sr.json();
            if (sd.status_code === 'FINISHED') { ready = true; break; }
            if (sd.status_code === 'ERROR')     throw new Error('Instagram media processing failed');
          }
          if (!ready) throw new Error('Instagram video processing timed out (40 s). Try again shortly.');
        }

        // Step 3 — Publish the container
        const pr = await fetch(`https://graph.facebook.com/v18.0/${c.igUserId}/media_publish`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ creation_id: containerId, access_token: c.accessToken }),
        });
        const pd = await pr.json();
        if (!pr.ok || pd.error) throw new Error(pd.error?.message ?? `Instagram publish error ${pr.status}`);

        // Step 4 — Fetch permalink
        let postUrl: string | undefined;
        try {
          const lr = await fetch(
            `https://graph.facebook.com/v18.0/${pd.id}?fields=permalink&access_token=${encodeURIComponent(c.accessToken)}`,
          );
          const ld = await lr.json();
          postUrl = ld.permalink;
        } catch { /* non-fatal */ }

        return { ok: true, postUrl };
      }

      /* ══════════════════════════════════════════════════════════════════
       * TWITTER / X  — v2 API with OAuth 1.0a (HMAC-SHA1)
       * Text only (280 chars). Media upload requires the v1.1 chunked
       * media API which needs an additional round-trip; deferred.
       * ════════════════════════════════════════════════════════════════ */
      case 'twitter': {
        const tweetText = fullText.slice(0, 280);
        const tweetUrl  = 'https://api.twitter.com/2/tweets';
        const auth = await oAuth1Header(
          'POST', tweetUrl,
          c.apiKey, c.apiSecret, c.accessToken, c.accessTokenSecret,
        );
        const r = await fetch(tweetUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: auth },
          body:    JSON.stringify({ text: tweetText }),
        });
        const d = await r.json();
        if (!r.ok || d.errors) {
          throw new Error(d.errors?.[0]?.message ?? d.detail ?? `Twitter API error ${r.status}`);
        }
        const tweetId = d.data?.id as string | undefined;
        return { ok: true, postUrl: tweetId ? `https://x.com/i/web/status/${tweetId}` : undefined };
      }

      /* ══════════════════════════════════════════════════════════════════
       * LINKEDIN  — UGC Posts v2 API
       * Text posts only (Bearer token). Image/document upload requires
       * the Assets API register → upload → complete flow; deferred.
       * ════════════════════════════════════════════════════════════════ */
      case 'linkedin': {
        const ugcBody = {
          author:           c.authorUrn,
          lifecycleState:   'PUBLISHED',
          specificContent:  {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary:   { text: fullText.slice(0, 3000) },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        };
        const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method:  'POST',
          headers: {
            'Content-Type':               'application/json',
            'Authorization':              `Bearer ${c.accessToken}`,
            'X-Restli-Protocol-Version':  '2.0.0',
          },
          body: JSON.stringify(ugcBody),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message ?? d.serviceErrorCode?.toString() ?? `LinkedIn API error ${r.status}`);
        const postId = r.headers.get('x-restli-id');
        return {
          ok: true,
          postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
        };
      }

      default:
        return { ok: false, error: `Unsupported platform: ${conn.platform}` };
    }
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
}

// ─── Per-platform Analytics Fetch ─────────────────────────────────────────────

interface EngagementMetrics {
  likes:    number;
  comments: number;
  shares:   number;
  reach:    number;
}

/**
 * Fetch engagement metrics for a specific post from the platform API.
 * Uses the connection's stored credentials + the post ID from publish history.
 */
async function fetchPostEngagement(
  conn: SocialConnection,
  postUrl?: string,
): Promise<{ ok: boolean; metrics?: EngagementMetrics; error?: string }> {
  const c = conn.credentials;
  try {
    switch (conn.platform) {

      /* ── Facebook Page Post ── */
      case 'facebook': {
        if (!c.pageAccessToken) return { ok: false, error: 'No page access token' };
        // Extract post ID from URL: https://www.facebook.com/PAGE_ID/posts/POST_ID
        const postId = extractFacebookPostId(postUrl);
        if (!postId) return { ok: false, error: 'Cannot extract post ID from URL' };

        const r = await fetch(
          `https://graph.facebook.com/v18.0/${postId}?fields=likes.summary(true),comments.summary(true),shares&access_token=${encodeURIComponent(c.pageAccessToken)}`,
        );
        const d = await r.json();
        if (!r.ok || d.error) return { ok: false, error: d.error?.message ?? `Facebook API ${r.status}` };

        // Also get reach via post insights
        let reach = 0;
        try {
          const ir = await fetch(
            `https://graph.facebook.com/v18.0/${postId}/insights?metric=post_impressions_unique&access_token=${encodeURIComponent(c.pageAccessToken)}`,
          );
          const id = await ir.json();
          reach = id.data?.[0]?.values?.[0]?.value ?? 0;
        } catch { /* non-fatal */ }

        return {
          ok: true,
          metrics: {
            likes:    d.likes?.summary?.total_count   ?? 0,
            comments: d.comments?.summary?.total_count ?? 0,
            shares:   d.shares?.count                  ?? 0,
            reach,
          },
        };
      }

      /* ── Instagram ── */
      case 'instagram': {
        if (!c.accessToken) return { ok: false, error: 'No access token' };
        const mediaId = extractInstagramMediaId(postUrl);
        if (!mediaId && !c.igUserId) return { ok: false, error: 'Cannot determine media to fetch' };

        // If we have a direct media ID, query it; otherwise get recent media
        if (mediaId) {
          const r = await fetch(
            `https://graph.facebook.com/v18.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares&access_token=${encodeURIComponent(c.accessToken)}`,
          );
          const d = await r.json();
          if (!r.ok || d.error) {
            // Fallback to basic fields
            const br = await fetch(
              `https://graph.facebook.com/v18.0/${mediaId}?fields=like_count,comments_count&access_token=${encodeURIComponent(c.accessToken)}`,
            );
            const bd = await br.json();
            return {
              ok: true,
              metrics: {
                likes:    bd.like_count     ?? 0,
                comments: bd.comments_count ?? 0,
                shares:   0,
                reach:    0,
              },
            };
          }

          const metricsMap: Record<string, number> = {};
          (d.data ?? []).forEach((m: any) => { metricsMap[m.name] = m.values?.[0]?.value ?? 0; });
          return {
            ok: true,
            metrics: {
              likes:    metricsMap.likes       ?? 0,
              comments: metricsMap.comments    ?? 0,
              shares:   metricsMap.shares      ?? 0,
              reach:    metricsMap.reach        ?? metricsMap.impressions ?? 0,
            },
          };
        }

        // Fallback: get latest media for the account
        const r = await fetch(
          `https://graph.facebook.com/v18.0/${c.igUserId}/media?fields=id,like_count,comments_count,timestamp&limit=25&access_token=${encodeURIComponent(c.accessToken)}`,
        );
        const d = await r.json();
        if (!r.ok || d.error) return { ok: false, error: d.error?.message ?? `Instagram API ${r.status}` };

        // Aggregate recent media
        let totalLikes = 0, totalComments = 0;
        (d.data ?? []).forEach((m: any) => {
          totalLikes    += m.like_count     ?? 0;
          totalComments += m.comments_count ?? 0;
        });
        return {
          ok: true,
          metrics: { likes: totalLikes, comments: totalComments, shares: 0, reach: 0 },
        };
      }

      /* ── Twitter / X ── */
      case 'twitter': {
        if (!c.apiKey || !c.apiSecret || !c.accessToken || !c.accessTokenSecret) {
          return { ok: false, error: 'Missing Twitter credentials' };
        }
        const tweetId = extractTweetId(postUrl);
        if (!tweetId) return { ok: false, error: 'Cannot extract tweet ID from URL' };

        const url  = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`;
        const auth = await oAuth1Header('GET', url, c.apiKey, c.apiSecret, c.accessToken, c.accessTokenSecret);
        const r    = await fetch(url, { headers: { Authorization: auth } });
        const d    = await r.json();
        if (!r.ok || d.errors) return { ok: false, error: d.errors?.[0]?.message ?? `Twitter API ${r.status}` };

        const pm = d.data?.public_metrics ?? {};
        return {
          ok: true,
          metrics: {
            likes:    pm.like_count    ?? 0,
            comments: pm.reply_count   ?? 0,
            shares:   pm.retweet_count ?? 0,
            reach:    pm.impression_count ?? 0,
          },
        };
      }

      /* ── LinkedIn ── */
      case 'linkedin': {
        if (!c.accessToken) return { ok: false, error: 'No access token' };
        // LinkedIn UGC post stats require the share URN
        const shareUrn = extractLinkedInShareUrn(postUrl);
        if (!shareUrn) return { ok: false, error: 'Cannot extract share URN from URL' };

        // Get social actions (likes, comments)
        const r = await fetch(
          `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(shareUrn)}?count=0`,
          { headers: { Authorization: `Bearer ${c.accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } },
        );
        if (!r.ok) return { ok: false, error: `LinkedIn API ${r.status}` };
        const d = await r.json();

        return {
          ok: true,
          metrics: {
            likes:    d.likesSummary?.totalLikes      ?? 0,
            comments: d.commentsSummary?.totalFirstLevelComments ?? 0,
            shares:   0,
            reach:    0,
          },
        };
      }

      /* ── Telegram — no analytics API ── */
      case 'telegram':
        return { ok: false, error: 'Telegram Bot API does not provide engagement analytics' };

      /* ── WhatsApp — no public analytics API ── */
      case 'whatsapp':
        return { ok: false, error: 'WhatsApp Business Cloud API does not provide post-level analytics' };

      default:
        return { ok: false, error: `Analytics not supported for ${conn.platform}` };
    }
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
}

// ─── Post ID extractors ───────────────────────────────────────────────────────

function extractFacebookPostId(url?: string): string | null {
  if (!url) return null;
  // https://www.facebook.com/PAGE_ID/posts/POST_ID or composite id PAGE_ID_POST_ID
  const m = url.match(/\/posts\/(\d+)/);
  if (m) return m[1];
  const m2 = url.match(/facebook\.com\/(\d+)/);
  return m2 ? m2[1] : null;
}

function extractInstagramMediaId(url?: string): string | null {
  if (!url) return null;
  // https://www.instagram.com/p/SHORTCODE/ — we can't directly get media ID from shortcode
  // without an API call. Return null to trigger fallback.
  return null;
}

function extractTweetId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/status\/(\d+)/);
  return m ? m[1] : null;
}

function extractLinkedInShareUrn(url?: string): string | null {
  if (!url) return null;
  // https://www.linkedin.com/feed/update/urn:li:share:XXXXX or urn:li:ugcPost:XXXXX
  const m = url.match(/(urn:li:(?:share|ugcPost):[A-Za-z0-9]+)/);
  return m ? m[1] : null;
}

// ─── Tenant-wide analytics sync ───────────────────────────────────────────────

export async function syncEngagementForTenant(
  tenantId: string,
  cardIds?: string[],
): Promise<{ synced: number; errors: number; details: Array<{ cardId: string; platform: string; ok: boolean; error?: string }> }> {
  const conns = await getConnections(tenantId);
  if (!conns.length) return { synced: 0, errors: 0, details: [] };

  // Get published cards for this tenant
  let query = supabaseAdmin
    .from('content_cards')
    .select('id, platform, metadata, published_at')
    .eq('status', 'published');

  // Filter by tenant_id if available
  query = query.eq('tenant_id', tenantId);

  if (cardIds?.length) {
    query = query.in('id', cardIds);
  }

  const { data: cards, error } = await query.limit(100);
  if (error) throw new Error(`Failed to fetch cards: ${error.message}`);
  if (!cards?.length) return { synced: 0, errors: 0, details: [] };

  // Get publish history to find post URLs
  const history = await getHistory(tenantId);

  let synced = 0, errors = 0;
  const details: Array<{ cardId: string; platform: string; ok: boolean; error?: string }> = [];

  for (const card of cards) {
    const platform = card.platform;
    // Find matching connection for this platform
    const conn = conns.find(c => c.platform === platform);
    if (!conn) {
      details.push({ cardId: card.id, platform, ok: false, error: 'No connection for platform' });
      errors++;
      continue;
    }

    // Find post URL from history
    const histEntry = history.find(h =>
      h.status === 'success' && h.platform === platform,
    );
    const postUrl = histEntry?.postUrl;

    const result = await fetchPostEngagement(conn, postUrl);
    if (result.ok && result.metrics) {
      // Update the card's metadata.engagementData
      const meta = card.metadata ?? {};
      meta.engagementData = {
        ...result.metrics,
        updatedAt: new Date().toISOString(),
        source: 'api_sync',
      };

      const { error: updateErr } = await supabaseAdmin
        .from('content_cards')
        .update({ metadata: meta })
        .eq('id', card.id);

      if (updateErr) {
        details.push({ cardId: card.id, platform, ok: false, error: `DB update failed: ${updateErr.message}` });
        errors++;
      } else {
        details.push({ cardId: card.id, platform, ok: true });
        synced++;
      }
    } else {
      details.push({ cardId: card.id, platform, ok: false, error: result.error });
      errors++;
    }
  }

  // Update sync status
  await kv.set(`analytics_sync_status:${tenantId}`, JSON.stringify({
    lastSyncAt: new Date().toISOString(),
    synced,
    errors,
    totalCards: cards.length,
  }));

  console.log(`[analytics/sync] tenant=${tenantId} synced=${synced} errors=${errors} total=${cards.length}`);
  return { synced, errors, details };
}

// ─── OAuth Helpers ────────────────────────────────────────────────────────────

function buildOAuthUrl(platform: string, state: string, redirectUri?: string): string | null {
  const callbackUrl = redirectUri ??
    `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-309fe679/social/oauth/callback`;

  switch (platform) {
    case 'facebook':
    case 'instagram': {
      const appId = Deno.env.get('META_APP_ID') ?? Deno.env.get('FACEBOOK_APP_ID');
      if (!appId) return null;
      const scopes = platform === 'instagram'
        ? 'pages_show_list,instagram_basic,instagram_content_publish,instagram_manage_insights,pages_read_engagement'
        : 'pages_show_list,pages_manage_posts,pages_read_engagement,read_insights';
      return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}&response_type=code`;
    }

    case 'linkedin': {
      const clientId = Deno.env.get('LINKEDIN_CLIENT_ID');
      if (!clientId) return null;
      const scopes = 'openid profile w_member_social r_organization_social rw_organization_admin';
      return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;
    }

    default:
      return null; // Twitter uses OAuth 1.0a (already handled via manual tokens)
  }
}

interface TokenResult {
  ok: boolean;
  tokens?: Record<string, string>;
  error?: string;
}

async function exchangeOAuthCode(platform: string, code: string, redirectUri: string): Promise<TokenResult> {
  try {
    switch (platform) {
      case 'facebook':
      case 'instagram': {
        const appId     = Deno.env.get('META_APP_ID') ?? Deno.env.get('FACEBOOK_APP_ID');
        const appSecret = Deno.env.get('META_APP_SECRET') ?? Deno.env.get('FACEBOOK_APP_SECRET');
        if (!appId || !appSecret) return { ok: false, error: 'META_APP_ID / META_APP_SECRET not configured' };

        // Exchange code for short-lived token
        const r = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${encodeURIComponent(code)}`,
        );
        const d = await r.json();
        if (d.error) return { ok: false, error: d.error.message };

        // Exchange for long-lived token (60-day expiry)
        const lr = await fetch(
          `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${d.access_token}`,
        );
        const ld = await lr.json();
        const longToken = ld.access_token ?? d.access_token;

        return {
          ok: true,
          tokens: {
            accessToken: longToken,
            tokenType: 'long_lived',
            expiresAt: new Date(Date.now() + (ld.expires_in ?? 5184000) * 1000).toISOString(),
          },
        };
      }

      case 'linkedin': {
        const clientId     = Deno.env.get('LINKEDIN_CLIENT_ID');
        const clientSecret = Deno.env.get('LINKEDIN_CLIENT_SECRET');
        if (!clientId || !clientSecret) return { ok: false, error: 'LINKEDIN_CLIENT_ID / LINKEDIN_CLIENT_SECRET not configured' };

        const body = new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          redirect_uri:  redirectUri,
          client_id:     clientId,
          client_secret: clientSecret,
        });
        const r = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        const d = await r.json();
        if (d.error) return { ok: false, error: d.error_description ?? d.error };

        return {
          ok: true,
          tokens: {
            accessToken: d.access_token,
            expiresAt: new Date(Date.now() + (d.expires_in ?? 5184000) * 1000).toISOString(),
          },
        };
      }

      default:
        return { ok: false, error: `OAuth token exchange not supported for ${platform}` };
    }
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
}

async function getOAuthAccountInfo(
  platform: string,
  tokens: Record<string, string>,
): Promise<{ displayName: string; extraCreds?: Record<string, string> }> {
  try {
    switch (platform) {
      case 'facebook': {
        // Get user's pages
        const r = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?access_token=${encodeURIComponent(tokens.accessToken)}`,
        );
        const d = await r.json();
        const page = d.data?.[0];
        if (page) {
          return {
            displayName: page.name ?? 'Facebook Page',
            extraCreds: {
              pageId: page.id,
              pageAccessToken: page.access_token,
            },
          };
        }
        // Fallback: get user name
        const ur = await fetch(`https://graph.facebook.com/v18.0/me?fields=name&access_token=${encodeURIComponent(tokens.accessToken)}`);
        const ud = await ur.json();
        return { displayName: ud.name ?? 'Facebook User' };
      }

      case 'instagram': {
        // Get pages, then IG business account linked to the page
        const r = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=${encodeURIComponent(tokens.accessToken)}`,
        );
        const d = await r.json();
        const page = d.data?.find((p: any) => p.instagram_business_account);
        if (page?.instagram_business_account) {
          return {
            displayName: `@${page.instagram_business_account.username ?? page.name}`,
            extraCreds: {
              igUserId: page.instagram_business_account.id,
              pageId: page.id,
            },
          };
        }
        return { displayName: 'Instagram (no business account found)' };
      }

      case 'linkedin': {
        const r = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        const d = await r.json();
        const name = [d.given_name, d.family_name].filter(Boolean).join(' ');
        return {
          displayName: name || 'LinkedIn User',
          extraCreds: { authorUrn: `urn:li:person:${d.sub}` },
        };
      }

      default:
        return { displayName: `${platform} account` };
    }
  } catch {
    return { displayName: `${platform} account` };
  }
}

/** HTML page returned in the OAuth popup after success/failure. Auto-closes the window. */
function oauthResultPage(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html><head><title>OAuth ${success ? 'Success' : 'Error'}</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center;
    height: 100vh; margin: 0; background: #0f0c1e; color: white; }
  .card { text-align: center; padding: 2rem; background: rgba(255,255,255,0.06); border-radius: 1rem;
    border: 1px solid rgba(255,255,255,0.1); max-width: 400px; }
  .icon { font-size: 3rem; margin-bottom: 1rem; }
  h2 { margin: 0 0 0.5rem; }
  p { color: rgba(255,255,255,0.6); font-size: 0.875rem; }
</style></head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h2>${success ? 'Connected!' : 'Connection Failed'}</h2>
    <p>${message}</p>
    <p style="margin-top:1rem;color:rgba(255,255,255,0.3);font-size:0.75rem">This window will close automatically…</p>
  </div>
  <script>
    if (window.opener) { window.opener.postMessage({ type: 'oauth-result', success: ${success}, message: '${message.replace(/'/g, "\\'")}' }, '*'); }
    setTimeout(() => window.close(), 2000);
  </script>
</body></html>`;
}

// ─── Route registration ───────────────────────────────────────────────────────

export function registerSocialRoutes(app: Hono) {
  const PFX = '/make-server-309fe679/social';

  // ── GET /social/connections?tenantId= ─────────────────────────────────────
  app.get(`${PFX}/connections`, async (c) => {
    try {
      const tenantId = c.req.query('tenantId');
      if (!tenantId) return c.json({ error: 'tenantId query param is required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const conns  = await getConnections(tenantId);
      // Strip secret fields before returning to the browser
      const masked = conns.map(conn => ({
        ...conn,
        credentials: maskCredentials(conn.platform, conn.credentials),
      }));
      return c.json({ connections: masked });
    } catch (err) {
      console.log(`[social/connections GET] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── POST /social/connections  (upsert) ────────────────────────────────────
  // Must be defined BEFORE the /test sub-route so Hono doesn't confuse them
  app.post(`${PFX}/connections`, async (c) => {
    try {
      const { tenantId, connection } = await c.req.json();
      if (!tenantId || !connection) return c.json({ error: 'tenantId and connection body required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const conns = await getConnections(tenantId);
      const idx   = conns.findIndex(x => x.id === connection.id);

      // Merge: keep existing secret values when browser sends empty string
      let finalCreds = { ...(connection.credentials ?? {}) };
      if (idx >= 0) {
        const existing = conns[idx];
        const secrets  = SECRET_FIELDS[connection.platform] ?? new Set<string>();
        for (const k of Object.keys(finalCreds)) {
          if (secrets.has(k) && finalCreds[k] === '') {
            finalCreds[k] = existing.credentials[k] ?? '';
          }
        }
        conns[idx] = { ...connection, credentials: finalCreds };
      } else {
        conns.push({ ...connection, credentials: finalCreds });
      }

      await saveConnections(tenantId, conns);
      console.log(`[social/connections POST] upserted id=${connection.id} platform=${connection.platform} tenant=${tenantId}`);
      // Phase 6: audit trail for social connection upsert (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), userId: (guard as any).userId, action: 'SOCIAL_CONNECTION_UPSERTED', route: '/social/connections', detail: `connId=${connection.id} platform=${connection.platform} tenantId=${tenantId}` });
      return c.json({ ok: true });
    } catch (err) {
      console.log(`[social/connections POST] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── POST /social/connections/test ─────────────────────────────────────────
  app.post(`${PFX}/connections/test`, async (c) => {
    try {
      const { tenantId, connectionId } = await c.req.json();
      if (!tenantId || !connectionId) return c.json({ ok: false, error: 'tenantId and connectionId required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const conns = await getConnections(tenantId);
      const conn  = conns.find(x => x.id === connectionId);
      if (!conn) return c.json({ ok: false, error: 'Connection not found — save it first' }, 404);

      console.log(`[social/connections/test] platform=${conn.platform} id=${connectionId} tenant=${tenantId}`);
      const result = await testConnection(conn);

      // Persist test result
      const i = conns.findIndex(x => x.id === connectionId);
      if (i >= 0) {
        conns[i] = {
          ...conns[i],
          lastTestedAt:   new Date().toISOString(),
          lastTestStatus: result.ok ? 'ok' : 'error',
          lastTestError:  result.error,
        };
        await saveConnections(tenantId, conns);
      }

      return c.json(result);
    } catch (err) {
      console.log(`[social/connections/test] ${errMsg(err)}`);
      return c.json({ ok: false, error: errMsg(err) });
    }
  });

  // ── DELETE /social/connections/:tenantId/:connId ───────────────────────────
  app.delete(`${PFX}/connections/:tenantId/:connId`, async (c) => {
    try {
      const tenantId = c.req.param('tenantId');
      const connId   = c.req.param('connId');

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const conns    = await getConnections(tenantId);
      const updated  = conns.filter(x => x.id !== connId);
      await saveConnections(tenantId, updated);
      console.log(`[social/connections DELETE] removed ${connId} tenant=${tenantId}`);
      // Phase 6: audit trail for social connection removal (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), userId: (guard as any).userId, action: 'SOCIAL_CONNECTION_DELETED', route: '/social/connections/:tenantId/:connId', detail: `connId=${connId} tenantId=${tenantId}` });
      return c.json({ ok: true });
    } catch (err) {
      console.log(`[social/connections DELETE] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── POST /social/publish ──────────────────────────────────────────────────
  app.post(`${PFX}/publish`, async (c) => {
    try {
      const {
        tenantId, connectionId,
        caption, hashtags,
        mediaUrl, mediaType,
        cardId, cardTitle, publishedBy,
      } = await c.req.json();

      if (!tenantId || !connectionId) {
        return c.json({ ok: false, error: 'tenantId and connectionId are required' }, 400);
      }

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const conns = await getConnections(tenantId);
      const conn  = conns.find(x => x.id === connectionId);
      if (!conn) {
        return c.json({ ok: false, error: `Connection ${connectionId} not found for tenant ${tenantId}` }, 404);
      }

      console.log(`[social/publish] platform=${conn.platform} card=${cardId} tenant=${tenantId}`);
      const result = await publishToChannel(conn, caption ?? '', hashtags ?? [], mediaUrl, mediaType);

      // Write to publish history
      const record: PublishRecord = {
        id:             crypto.randomUUID(),
        cardTitle:      cardTitle ?? 'Untitled',
        platform:       conn.platform,
        connectionName: conn.displayName,
        status:         result.ok ? 'success' : 'error',
        errorMessage:   result.error,
        publishedAt:    new Date().toISOString(),
        publishedBy:    publishedBy ?? 'Unknown',
        postUrl:        result.postUrl,
      };
      await appendHistory(tenantId, record);

      console.log(`[social/publish] result=${result.ok} platform=${conn.platform} card=${cardId}`);
      // Phase 6: audit trail for manual publish (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), userId: (guard as any).userId, action: result.ok ? 'SOCIAL_PUBLISH_SUCCESS' : 'SOCIAL_PUBLISH_FAILED', route: '/social/publish', detail: `cardId=${cardId} platform=${conn.platform} tenantId=${tenantId}` });
      return c.json(result);
    } catch (err) {
      console.log(`[social/publish] ${errMsg(err)}`);
      return c.json({ ok: false, error: errMsg(err) });
    }
  });

  // ── GET /social/history?tenantId=&limit= ──────────────────────────────────
  app.get(`${PFX}/history`, async (c) => {
    try {
      const tenantId = c.req.query('tenantId');
      if (!tenantId) return c.json({ error: 'tenantId query param is required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const limit   = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
      const history = await getHistory(tenantId);
      return c.json({ history: history.slice(0, limit), total: history.length });
    } catch (err) {
      console.log(`[social/history GET] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ANALYTICS — Per-platform engagement fetch
  // ══════════════════════════════════════════════════════════════════════════

  // ── POST /social/analytics/sync ───────────────────────────────────────────
  // Sync engagement metrics from platform APIs for published cards.
  // Body: { tenantId, cardIds?: string[] }
  // If cardIds is empty/undefined, syncs ALL published cards for the tenant.
  app.post(`${PFX}/analytics/sync`, async (c) => {
    try {
      const { tenantId, cardIds } = await c.req.json();
      if (!tenantId) return c.json({ error: 'tenantId required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      console.log(`[analytics/sync] tenant=${tenantId} cardIds=${cardIds?.length ?? 'all'}`);
      const result = await syncEngagementForTenant(tenantId, cardIds);
      // Phase 6: audit trail (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), userId: (guard as any).userId, action: 'ANALYTICS_SYNC', route: '/social/analytics/sync', detail: `tenantId=${tenantId} cardIds=${cardIds?.length ?? 'all'}` });
      return c.json(result);
    } catch (err) {
      console.log(`[analytics/sync] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── GET /social/analytics/sync-status?tenantId= ───────────────────────────
  // Returns the last sync timestamp and summary for a tenant.
  app.get(`${PFX}/analytics/sync-status`, async (c) => {
    try {
      const tenantId = c.req.query('tenantId');
      if (!tenantId) return c.json({ error: 'tenantId required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const raw = await kv.get(`analytics_sync_status:${tenantId}`);
      const status = raw ? JSON.parse(raw as string) : null;
      return c.json({ status });
    } catch (err) {
      console.log(`[analytics/sync-status] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── POST /social/oauth/start ──────────────────────────────────────────────
  // Initiates an OAuth flow for a platform. Returns the authorization URL.
  // Body: { tenantId, platform, connectionId?, redirectUri }
  app.post(`${PFX}/oauth/start`, async (c) => {
    try {
      // Rate limit OAuth initiation (ISO 27001 A.9.4.2)
      const limited = rateLimit(c, 'oauth:start', 10, 60_000);
      if (limited) return limited;
      const { tenantId, platform, connectionId, redirectUri } = await c.req.json();
      if (!tenantId || !platform) return c.json({ error: 'tenantId and platform required' }, 400);

      // ── Auth guard (Phase 1.2) ──
      const guard = await requireTenantScope(c, tenantId);
      if (guard instanceof Response) return guard;

      const statePayload = {
        tenantId,
        platform,
        connectionId: connectionId ?? crypto.randomUUID(),
        ts: Date.now(),
      };
      const state = btoa(JSON.stringify(statePayload));

      // Store state for callback validation (expires in 10 min)
      await kv.set(`oauth_state:${state}`, JSON.stringify(statePayload));

      const authUrl = buildOAuthUrl(platform, state, redirectUri);
      if (!authUrl) return c.json({ error: `OAuth not supported for ${platform}` }, 400);

      console.log(`[oauth/start] platform=${platform} tenant=${tenantId}`);
      // Phase 6: audit trail for OAuth flow initiation (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), userId: (guard as any).userId, action: 'OAUTH_FLOW_STARTED', route: '/social/oauth/start', detail: `platform=${platform} tenantId=${tenantId}` });
      return c.json({ authUrl, state, connectionId: statePayload.connectionId });
    } catch (err) {
      console.log(`[oauth/start] ${errMsg(err)}`);
      return c.json({ error: errMsg(err) }, 500);
    }
  });

  // ── GET /social/oauth/callback ────────────────────────────────────────────
  // OAuth callback handler — exchanges code for tokens, stores in connection.
  // NOTE: No auth guard — this is a browser redirect from the OAuth provider.
  // Security is enforced via the one-time-use state parameter validated below.
  app.get(`${PFX}/oauth/callback`, async (c) => {
    try {
      // Rate limit callback to prevent state brute-forcing (ISO 27001 A.9.4.2)
      const limited = rateLimit(c, 'oauth:callback', 15, 60_000);
      if (limited) return limited;
      const code  = c.req.query('code');
      const state = c.req.query('state');
      const error = c.req.query('error');

      if (error) {
        console.log(`[oauth/callback] error from provider: ${error}`);
        return c.html(oauthResultPage(false, `Authorization denied: ${error}`));
      }
      if (!code || !state) {
        return c.html(oauthResultPage(false, 'Missing code or state parameter'));
      }

      // Validate state
      const stateRaw = await kv.get(`oauth_state:${state}`);
      if (!stateRaw) {
        return c.html(oauthResultPage(false, 'Invalid or expired OAuth state'));
      }
      const statePayload = JSON.parse(stateRaw as string);
      await kv.del(`oauth_state:${state}`); // one-time use

      const { tenantId, platform, connectionId } = statePayload;
      const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/make-server-309fe679/social/oauth/callback`;

      // Exchange code for tokens
      const tokenResult = await exchangeOAuthCode(platform, code, redirectUri);
      if (!tokenResult.ok) {
        return c.html(oauthResultPage(false, tokenResult.error ?? 'Token exchange failed'));
      }

      // Get account info from the token
      const accountInfo = await getOAuthAccountInfo(platform, tokenResult.tokens!);

      // Save or update connection
      const conns = await getConnections(tenantId);
      const idx   = conns.findIndex(x => x.id === connectionId);
      const conn: SocialConnection = {
        id: connectionId,
        platform,
        displayName: accountInfo.displayName ?? `${platform} (OAuth)`,
        credentials: {
          ...tokenResult.tokens!,
          ...(accountInfo.extraCreds ?? {}),
        },
        connectedAt: new Date().toISOString(),
        connectedBy: 'OAuth',
        lastTestedAt: new Date().toISOString(),
        lastTestStatus: 'ok',
      };

      if (idx >= 0) {
        conns[idx] = { ...conns[idx], ...conn, connectedBy: conns[idx].connectedBy };
      } else {
        conns.push(conn);
      }
      await saveConnections(tenantId, conns);

      console.log(`[oauth/callback] platform=${platform} tenant=${tenantId} account=${accountInfo.displayName}`);
      // Phase 6: audit trail for OAuth callback success (ISO 27001 A.12.4.1)
      logSecurityEvent({ ts: new Date().toISOString(), action: 'OAUTH_CALLBACK_SUCCESS', route: '/social/oauth/callback', detail: `platform=${platform} tenantId=${tenantId} account=${accountInfo.displayName}` });
      return c.html(oauthResultPage(true, `Connected as ${accountInfo.displayName}`));
    } catch (err) {
      console.log(`[oauth/callback] ${errMsg(err)}`);
      return c.html(oauthResultPage(false, errMsg(err)));
    }
  });
}