// ─── AI Content Engine ─────────────────────────────────────────────────────────
// Real AI generation is handled server-side via /ai/wizard-chat (GPT-4o).
// This module exports types, data arrays, and compact offline fallback stubs.

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
  /** If true, message is used for GPT-4o context but not rendered in the chat UI */
  hidden?: boolean;
}

export interface ContentRequest {
  projectName: string;
  projectDescription: string;
  channel: string;
  platforms: string[];
  actions: string[];
}

// ─── Marketing Channels ────────────────────────────────────────────────────────

export interface MarketingChannel {
  id: string;
  name: string;
  icon: string;
  description: string;
  active: boolean;
  color: string;
}

export const marketingChannels: MarketingChannel[] = [
  { id: 'social-media', name: 'Social Media', icon: '📱', description: 'Create and manage social media content across multiple platforms', active: true, color: 'from-purple-500 to-pink-500' },
  { id: 'seo', name: 'Search Engine Optimization (SEO)', icon: '🔍', description: 'Optimize content for search engine visibility and organic traffic', active: true, color: 'from-green-500 to-teal-500' },
  { id: 'sem', name: 'Search Engine Marketing (SEM)', icon: '💰', description: 'Paid search advertising campaigns on Google, Bing, and more', active: true, color: 'from-blue-500 to-cyan-500' },
  { id: 'email', name: 'Email Marketing', icon: '✉️', description: 'Email campaigns, newsletters, drip sequences, and automations', active: true, color: 'from-amber-500 to-orange-500' },
  { id: 'content', name: 'Content Marketing', icon: '📝', description: 'Blog posts, articles, whitepapers, case studies, and infographics', active: true, color: 'from-indigo-500 to-violet-500' },
  { id: 'display', name: 'Display Advertising', icon: '🖼️', description: 'Banner ads, rich media ads, and programmatic display campaigns', active: true, color: 'from-rose-500 to-red-500' },
  { id: 'affiliate', name: 'Affiliate Marketing', icon: '🤝', description: 'Partner and affiliate program management and content creation', active: true, color: 'from-emerald-500 to-green-500' },
  { id: 'video', name: 'Video Marketing', icon: '🎬', description: 'YouTube, Vimeo, and OTT platform video content strategy', active: true, color: 'from-red-500 to-pink-500' },
  { id: 'mobile', name: 'Mobile Marketing', icon: '📲', description: 'SMS, push notifications, in-app advertising, and mobile-first campaigns', active: true, color: 'from-sky-500 to-blue-500' },
  { id: 'programmatic', name: 'Programmatic Advertising', icon: '🤖', description: 'Automated ad buying across networks using DSPs and RTB', active: true, color: 'from-violet-500 to-purple-500' },
  { id: 'influencer', name: 'Influencer Marketing', icon: '⭐', description: 'Influencer partnerships, UGC campaigns, and brand ambassador programs', active: true, color: 'from-yellow-500 to-amber-500' },
];

// ─── Social Media Platforms ────────────────────────────────────────────────────

export interface SocialPlatform {
  id: string;
  name: string;
  color: string;
}

export const socialPlatforms: SocialPlatform[] = [
  { id: 'instagram', name: 'Instagram', color: 'from-purple-500 via-pink-500 to-orange-500' },
  { id: 'facebook', name: 'Facebook', color: 'from-blue-600 to-blue-500' },
  { id: 'twitter', name: 'X (Twitter)', color: 'from-gray-800 to-gray-600' },
  { id: 'linkedin', name: 'LinkedIn', color: 'from-blue-700 to-blue-600' },
  { id: 'tiktok', name: 'TikTok', color: 'from-gray-900 to-pink-500' },
  { id: 'youtube', name: 'YouTube', color: 'from-red-600 to-red-500' },
  { id: 'pinterest', name: 'Pinterest', color: 'from-red-500 to-red-400' },
  { id: 'snapchat', name: 'Snapchat', color: 'from-yellow-400 to-yellow-300' },
  { id: 'threads', name: 'Threads', color: 'from-gray-700 to-gray-500' },
  { id: 'reddit', name: 'Reddit', color: 'from-orange-600 to-orange-500' },
  { id: 'whatsapp', name: 'WhatsApp Business', color: 'from-green-600 to-green-500' },
  { id: 'telegram', name: 'Telegram', color: 'from-sky-500 to-sky-400' },
];

// ─── Content Actions ───────────────────────────────────────────────────────────

export interface ContentAction {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'planning' | 'creation';
}

export const contentActions: ContentAction[] = [
  { id: 'calendar', name: 'Social Media Calendar', icon: '📅', description: 'Generate a structured posting calendar with dates, times, and platform-specific scheduling', category: 'planning' },
  { id: 'content-plan', name: 'Social Media Content Plan', icon: '📋', description: 'Strategic content plan with themes, topics, messaging pillars, and posting frequency', category: 'planning' },
  { id: 'copywriting', name: 'Copywriting & Captions', icon: '✍️', description: 'Platform-optimized captions, hashtags, CTAs, and ad copy', category: 'creation' },
  { id: 'image-creation', name: 'Image & Graphic Creation', icon: '🎨', description: 'AI-generated images, infographics, carousels, and branded graphics', category: 'creation' },
  { id: 'video-creation', name: 'Video Creation', icon: '🎬', description: 'Short-form video scripts and storyboards (10-15 second royalty-free clips)', category: 'creation' },
  { id: 'voiceover', name: 'Voice Over Creation', icon: '🎤', description: 'Professional voice-over scripts for video content and audio ads', category: 'creation' },
  { id: 'animation', name: 'Animation', icon: '✨', description: 'Motion graphics concepts and animated content storyboards', category: 'creation' },
  { id: 'music', name: 'Music & Audio', icon: '🎶', description: 'Royalty-free background music and sound design (10-15 second clips, commercially licensed)', category: 'creation' },
  { id: 'research', name: 'Internet Research & Trends', icon: '🌐', description: 'Web scraping, trend analysis, competitor insights, and audience research', category: 'planning' },
];

// ─── Real API Bridge ───────────────────────────────────────────────────────────
//
// Use generateContent() from apiClient.ts for real GPT-4o calls.
// This wrapper is imported by CreateContentWizard and any future UI that
// needs to call the server — keeping OpenAI calls server-side (key is safe).

export {
  generateContent,
  fetchContentHistory,
  deleteContentHistory,
  fetchContentGenUsage,
  generateImage,
  refineContent,
  wizardChat,
} from '../../utils/apiClient';

export type {
  GenerateContentParams,
  GenerateContentResult,
  GenerationRecord,
  ContentGenUsageSummary,
  GenerateImageParams,
  GenerateImageResult,
  RefineContentParams,
  RefineContentResult,
  WizardChatParams,
  WizardChatResult,
} from '../../utils/apiClient';

// ─── Unique message IDs ───────────────────────────────────────────────────────

let messageIdCounter = 0;
export function createMessageId(): string {
  return `msg_${++messageIdCounter}_${Date.now()}`;
}

// ─── Offline Fallback Generators ──────────────────────────────────────────────
//
// These compact stubs are used ONLY when the real GPT-4o /ai/wizard-chat
// endpoint is unreachable (network error, quota exceeded, etc.).
// The full AI-generated content is produced server-side; these just ensure
// the wizard remains usable in degraded mode.

export function generateInitialResponse(request: ContentRequest): string {
  const channelName = marketingChannels.find(c => c.id === request.channel)?.name || request.channel;
  const platformList = request.platforms.map(id => socialPlatforms.find(p => p.id === id)?.name || id).join(', ');
  const actionList = request.actions.map(id => contentActions.find(a => a.id === id)?.name || id).join(', ');

  return [
    `# AI Content Studio — Offline Preview`,
    ``,
    `> The live AI service is temporarily unavailable. Below is a placeholder so you can continue working.`,
    ``,
    `**Project:** ${request.projectName}`,
    `**Channel:** ${channelName}`,
    request.platforms.length > 0 ? `**Platforms:** ${platformList}` : null,
    `**Actions:** ${actionList}`,
    ``,
    `---`,
    ``,
    `Once connectivity is restored, click **Regenerate** or send a message to get full AI-generated content.`,
  ].filter(Boolean).join('\n');
}

export function generateChatResponse(userMessage: string, context: ContentRequest): string {
  const channelName = marketingChannels.find(c => c.id === context.channel)?.name || context.channel;
  return [
    `**Offline mode** — I received your message but the AI service is currently unavailable.`,
    ``,
    `Your request: *"${userMessage.slice(0, 120)}${userMessage.length > 120 ? '...' : ''}"*`,
    ``,
    `I'll process this for **${context.projectName}** (${channelName}) once connectivity is restored.`,
    `You can continue chatting — all messages will be sent to GPT-4o when the connection resumes.`,
  ].join('\n');
}
