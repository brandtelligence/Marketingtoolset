// ─── AI Content Engine (Mock) ──────────────────────────────────────────────────
// This module simulates AI-generated content for the social media content wizard.
// In production, these functions would call real AI APIs (e.g., OpenAI, Anthropic).

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
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
  { id: 'seo', name: 'Search Engine Optimization (SEO)', icon: '🔍', description: 'Optimize content for search engine visibility and organic traffic', active: false, color: 'from-green-500 to-teal-500' },
  { id: 'sem', name: 'Search Engine Marketing (SEM)', icon: '💰', description: 'Paid search advertising campaigns on Google, Bing, and more', active: false, color: 'from-blue-500 to-cyan-500' },
  { id: 'email', name: 'Email Marketing', icon: '✉️', description: 'Email campaigns, newsletters, drip sequences, and automations', active: false, color: 'from-amber-500 to-orange-500' },
  { id: 'content', name: 'Content Marketing', icon: '📝', description: 'Blog posts, articles, whitepapers, case studies, and infographics', active: false, color: 'from-indigo-500 to-violet-500' },
  { id: 'display', name: 'Display Advertising', icon: '🖼️', description: 'Banner ads, rich media ads, and programmatic display campaigns', active: false, color: 'from-rose-500 to-red-500' },
  { id: 'affiliate', name: 'Affiliate Marketing', icon: '🤝', description: 'Partner and affiliate program management and content creation', active: false, color: 'from-emerald-500 to-green-500' },
  { id: 'video', name: 'Video Marketing', icon: '🎬', description: 'YouTube, Vimeo, and OTT platform video content strategy', active: false, color: 'from-red-500 to-pink-500' },
  { id: 'mobile', name: 'Mobile Marketing', icon: '📲', description: 'SMS, push notifications, in-app advertising, and mobile-first campaigns', active: false, color: 'from-sky-500 to-blue-500' },
  { id: 'programmatic', name: 'Programmatic Advertising', icon: '🤖', description: 'Automated ad buying across networks using DSPs and RTB', active: false, color: 'from-violet-500 to-purple-500' },
  { id: 'influencer', name: 'Influencer Marketing', icon: '⭐', description: 'Influencer partnerships, UGC campaigns, and brand ambassador programs', active: false, color: 'from-yellow-500 to-amber-500' },
  { id: 'podcast', name: 'Podcast & Audio Marketing', icon: '🎙️', description: 'Podcast production, audio ads, and Spotify/Apple Music campaigns', active: false, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'webinar', name: 'Webinars & Virtual Events', icon: '🎥', description: 'Live webinars, virtual conferences, and online workshop content', active: false, color: 'from-teal-500 to-cyan-500' },
  { id: 'pr', name: 'Public Relations & Media', icon: '📰', description: 'Press releases, media outreach, and reputation management', active: false, color: 'from-slate-500 to-gray-500' },
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
  { id: 'video-creation', name: 'Video Creation', icon: '🎬', description: 'Short-form video scripts and storyboards (10–15 second royalty-free clips)', category: 'creation' },
  { id: 'voiceover', name: 'Voice Over Creation', icon: '🎤', description: 'Professional voice-over scripts for video content and audio ads', category: 'creation' },
  { id: 'animation', name: 'Animation', icon: '✨', description: 'Motion graphics concepts and animated content storyboards', category: 'creation' },
  { id: 'music', name: 'Music & Audio', icon: '🎶', description: 'Royalty-free background music and sound design (10–15 second clips, commercially licensed)', category: 'creation' },
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
} from '../../utils/apiClient';

export type {
  GenerateContentParams,
  GenerateContentResult,
  GenerationRecord,
  ContentGenUsageSummary,
} from '../../utils/apiClient';

// ─── AI Response Generator (Mock) ──────────────────────────────────────────────

let messageIdCounter = 0;
export function createMessageId(): string {
  return `msg_${++messageIdCounter}_${Date.now()}`;
}

function getPlatformNames(platforms: string[]): string {
  return platforms.map(id => socialPlatforms.find(p => p.id === id)?.name || id).join(', ');
}

function getActionNames(actions: string[]): string {
  return actions.map(id => contentActions.find(a => a.id === id)?.name || id).join(', ');
}

export function generateInitialResponse(request: ContentRequest): string {
  const platformList = getPlatformNames(request.platforms);
  const actionList = getActionNames(request.actions);

  let response = `# 🚀 AI Content Studio — Ready!\n\n`;
  response += `I've analyzed your project **"${request.projectName}"** and I'm ready to create content for the following:\n\n`;
  response += `**Target Platforms:** ${platformList}\n`;
  response += `**Requested Actions:** ${actionList}\n\n`;
  response += `---\n\n`;

  // Generate content for each selected action
  for (const actionId of request.actions) {
    switch (actionId) {
      case 'calendar':
        response += generateCalendarContent(request);
        break;
      case 'content-plan':
        response += generateContentPlan(request);
        break;
      case 'copywriting':
        response += generateCopywriting(request);
        break;
      case 'image-creation':
        response += generateImageContent(request);
        break;
      case 'video-creation':
        response += generateVideoContent(request);
        break;
      case 'voiceover':
        response += generateVoiceoverContent(request);
        break;
      case 'animation':
        response += generateAnimationContent(request);
        break;
      case 'music':
        response += generateMusicContent(request);
        break;
      case 'research':
        response += generateResearchContent(request);
        break;
    }
  }

  response += `\n---\n\n`;
  response += `💡 **What would you like to adjust?** You can ask me to:\n`;
  response += `- Change the tone, style, or frequency of posts\n`;
  response += `- Add or remove platforms\n`;
  response += `- Modify content themes or topics\n`;
  response += `- Generate more variations\n`;
  response += `- Adjust for specific audience demographics\n`;
  response += `- Export in different formats\n`;

  return response;
}

function generateCalendarContent(req: ContentRequest): string {
  const platforms = req.platforms.map(id => socialPlatforms.find(p => p.id === id)?.name || id);
  let content = `## 📅 Social Media Calendar\n\n`;
  content += `**Project:** ${req.projectName}\n`;
  content += `**Period:** March 2026 (4 weeks)\n\n`;

  const weeks = ['Week 1 (Mar 2–8)', 'Week 2 (Mar 9–15)', 'Week 3 (Mar 16–22)', 'Week 4 (Mar 23–29)'];
  const themes = ['Brand Awareness & Introduction', 'Value Proposition & Features', 'Social Proof & Testimonials', 'Conversion & Call-to-Action'];
  const postTypes = ['Carousel Post', 'Reel / Short Video', 'Story Series', 'Static Image Post', 'Poll / Interactive', 'Behind-the-Scenes', 'User-Generated Content'];

  weeks.forEach((week, i) => {
    content += `### ${week} — *${themes[i]}*\n\n`;
    content += `| Day | Platform | Content Type | Status |\n`;
    content += `|-----|----------|-------------|--------|\n`;

    const days = ['Monday', 'Wednesday', 'Friday'];
    days.forEach((day, j) => {
      const platform = platforms[j % platforms.length];
      const postType = postTypes[(i * 3 + j) % postTypes.length];
      content += `| ${day} | ${platform} | ${postType} | 📝 Draft |\n`;
    });
    content += `\n`;
  });

  content += `**Total Posts:** ${weeks.length * 3} | **Platforms:** ${platforms.length} | **Posting Frequency:** 3x/week\n\n`;
  return content;
}

function generateContentPlan(req: ContentRequest): string {
  let content = `## 📋 Social Media Content Plan\n\n`;
  content += `### Content Pillars\n\n`;
  content += `1. **Educational Content (40%)** — Tips, tutorials, how-tos related to ${req.projectName}\n`;
  content += `2. **Engagement Content (25%)** — Polls, Q&As, interactive stories, user challenges\n`;
  content += `3. **Promotional Content (20%)** — Product features, offers, launches, CTAs\n`;
  content += `4. **Community Content (15%)** — Behind-the-scenes, team spotlights, user testimonials\n\n`;

  content += `### Posting Strategy\n\n`;
  req.platforms.forEach(id => {
    const platform = socialPlatforms.find(p => p.id === id);
    if (!platform) return;
    const freq = id === 'tiktok' || id === 'instagram' ? '5–7x/week' : id === 'twitter' ? '3–5x/day' : '3–4x/week';
    const bestTime = id === 'linkedin' ? '8–10 AM (weekdays)' : id === 'instagram' ? '11 AM–1 PM, 7–9 PM' : '12–3 PM';
    content += `- **${platform.name}:** ${freq} | Best posting time: ${bestTime}\n`;
  });
  content += `\n`;

  content += `### Monthly Themes\n\n`;
  content += `| Month | Theme | Key Messages |\n`;
  content += `|-------|-------|-------------|\n`;
  content += `| March | Launch & Awareness | Introduce ${req.projectName}, build curiosity |\n`;
  content += `| April | Deep Dive & Education | Feature walkthroughs, tutorials |\n`;
  content += `| May | Social Proof & Growth | Testimonials, case studies, milestones |\n\n`;
  return content;
}

function generateCopywriting(req: ContentRequest): string {
  let content = `## ✍️ Copywriting & Captions\n\n`;

  const platforms = req.platforms.slice(0, 3);
  platforms.forEach(id => {
    const platform = socialPlatforms.find(p => p.id === id);
    if (!platform) return;

    content += `### ${platform.name} Captions\n\n`;

    if (id === 'instagram' || id === 'facebook') {
      content += `**Post 1 — Introduction**\n`;
      content += `> Meet ${req.projectName} — your new secret weapon for digital growth. 🚀\n>\n`;
      content += `> We're reimagining the way brands connect with their audience. From strategy to execution, we've got you covered.\n>\n`;
      content += `> 👉 Link in bio to learn more!\n>\n`;
      content += `> #DigitalMarketing #BrandStrategy #${req.projectName.replace(/\s/g, '')} #Innovation #MarketingTips\n\n`;

      content += `**Post 2 — Feature Highlight**\n`;
      content += `> Did you know? ${req.projectName} helps you:\n>\n`;
      content += `> ✅ Save 10+ hours per week\n`;
      content += `> ✅ Boost engagement by 3x\n`;
      content += `> ✅ Reach your target audience faster\n>\n`;
      content += `> Try it today — link in bio 🔗\n>\n`;
      content += `> #ProductLaunch #TechInnovation #GrowthHacking\n\n`;
    }

    if (id === 'twitter') {
      content += `**Tweet 1:**\n`;
      content += `> 🚀 Introducing ${req.projectName} — the smarter way to grow your brand online. Thread 🧵👇\n\n`;
      content += `**Tweet 2:**\n`;
      content += `> Hot take: Most brands waste 80% of their marketing budget on the wrong channels. ${req.projectName} fixes that. 📊\n\n`;
    }

    if (id === 'linkedin') {
      content += `**Article Post:**\n`;
      content += `> I'm excited to share a project our team has been building: ${req.projectName}.\n>\n`;
      content += `> ${req.projectDescription}\n>\n`;
      content += `> After months of development, we're seeing incredible results with our early adopters. Here's what we've learned about building products that matter...\n>\n`;
      content += `> [Read the full case study →]\n\n`;
    }

    if (id === 'tiktok') {
      content += `**Video Caption:**\n`;
      content += `> POV: You just discovered ${req.projectName} and your marketing game changed forever 🤯 #MarketingTips #DigitalMarketing #BrandGrowth #FYP\n\n`;
    }
  });

  return content;
}

function generateImageContent(req: ContentRequest): string {
  let content = `## 🎨 Image & Graphic Creation\n\n`;
  content += `### Generated Image Concepts\n\n`;

  const concepts = [
    { title: 'Hero Banner', desc: `Clean, modern hero image featuring ${req.projectName} branding with gradient purple-teal background, bold typography, and subtle tech patterns. 1080×1080px for social, 1200×628px for ads.`, style: 'Minimalist / Tech' },
    { title: 'Feature Carousel', desc: `5-slide carousel highlighting key features. Each slide uses branded colors with iconography and short benefit statements. Instagram carousel format (1080×1350px).`, style: 'Infographic / Educational' },
    { title: 'Quote Card', desc: `Testimonial graphic with customer photo, quote overlay, and brand watermark. Warm lighting, professional feel. Square format for Instagram/Facebook.`, style: 'Social Proof / Trust' },
    { title: 'Story Template', desc: `Interactive story template with poll/quiz elements, branded gradient background, and "Swipe Up" CTA. 1080×1920px vertical format.`, style: 'Interactive / Engagement' },
  ];

  concepts.forEach((c, i) => {
    content += `**${i + 1}. ${c.title}** *(${c.style})*\n`;
    content += `${c.desc}\n\n`;
  });

  content += `> 🎨 *All images are generated royalty-free and commercially licensed for your use.*\n\n`;
  return content;
}

function generateVideoContent(req: ContentRequest): string {
  let content = `## 🎬 Video Creation (10–15s Clips)\n\n`;
  content += `### Video Concepts\n\n`;

  const videos = [
    {
      title: 'Product Teaser',
      duration: '12 seconds',
      script: `[0–3s] Dynamic logo reveal with particle effects\n[3–8s] Quick feature showcase — 3 key benefits flash on screen\n[8–12s] CTA: "Try ${req.projectName} Today" with website URL`,
    },
    {
      title: 'Before vs After',
      duration: '15 seconds',
      script: `[0–5s] Split screen — left: "Without ${req.projectName}" (cluttered, slow)\n[5–10s] Right side reveals: "With ${req.projectName}" (clean, fast)\n[10–15s] Logo + tagline + CTA overlay`,
    },
    {
      title: 'Quick Tips Reel',
      duration: '14 seconds',
      script: `[0–2s] Hook: "3 things you didn't know about digital marketing"\n[2–5s] Tip 1 with motion graphics\n[5–9s] Tip 2 with screen recording\n[9–12s] Tip 3 with testimonial clip\n[12–14s] Follow for more + CTA`,
    },
  ];

  videos.forEach((v, i) => {
    content += `**${i + 1}. ${v.title}** *(${v.duration})*\n`;
    content += `\`\`\`\n${v.script}\n\`\`\`\n\n`;
  });

  content += `> 🎬 *All video clips are royalty-free, commercially licensed, 10–15 seconds.*\n\n`;
  return content;
}

function generateVoiceoverContent(req: ContentRequest): string {
  let content = `## 🎤 Voice Over Scripts\n\n`;

  const scripts = [
    { title: 'Product Introduction (12s)', voice: 'Professional, warm, confident', text: `Introducing ${req.projectName} — the smarter way to grow your brand. Built for teams who demand results. Start your journey today.` },
    { title: 'Feature Highlight (10s)', voice: 'Energetic, conversational', text: `Did you know ${req.projectName} can save you 10 hours a week? Smart automation meets beautiful design. Try it free.` },
    { title: 'Testimonial Overlay (15s)', voice: 'Authentic, relatable', text: `"Since switching to ${req.projectName}, our engagement has tripled. The team loves it, and our clients can see the difference." — Happy customer` },
  ];

  scripts.forEach((s, i) => {
    content += `### Script ${i + 1}: ${s.title}\n`;
    content += `**Voice Style:** ${s.voice}\n\n`;
    content += `> "${s.text}"\n\n`;
  });

  content += `> 🎤 *Voice overs generated with natural AI voices, royalty-free for commercial use.*\n\n`;
  return content;
}

function generateAnimationContent(req: ContentRequest): string {
  let content = `## ✨ Animation Concepts\n\n`;

  const animations = [
    { title: 'Logo Animation', duration: '5s', desc: `${req.projectName} logo assembles from particles/geometric shapes with gradient glow effect. Subtle bounce on final reveal.` },
    { title: 'Data Visualization', duration: '10s', desc: `Animated bar chart showing growth metrics, with numbers counting up. Clean white background with branded accent colors.` },
    { title: 'Feature Walkthrough', duration: '15s', desc: `Screen recording style animation showing ${req.projectName} UI with highlighted interactions, cursor movements, and tooltip callouts.` },
  ];

  animations.forEach((a, i) => {
    content += `**${i + 1}. ${a.title}** *(${a.duration})*\n`;
    content += `${a.desc}\n\n`;
  });

  content += `> ✨ *All animations delivered in MP4/GIF format, optimized for social media.*\n\n`;
  return content;
}

function generateMusicContent(req: ContentRequest): string {
  let content = `## 🎶 Music & Audio\n\n`;
  content += `### Curated Tracks (10–15s clips, royalty-free, commercially licensed)\n\n`;

  const tracks = [
    { title: 'Upbeat Corporate', bpm: '120 BPM', mood: 'Confident, professional, forward-moving', instruments: 'Piano, light percussion, synth pads', use: 'Product demos, feature showcases' },
    { title: 'Inspiring Tech', bpm: '110 BPM', mood: 'Innovative, hopeful, clean', instruments: 'Electronic beats, ambient textures, strings', use: 'Brand videos, testimonials' },
    { title: 'Social Energy', bpm: '130 BPM', mood: 'Fun, trendy, attention-grabbing', instruments: 'Trap beats, bass drops, vocal chops', use: 'TikTok/Reels, short-form content' },
    { title: 'Ambient Chill', bpm: '85 BPM', mood: 'Relaxed, thoughtful, sophisticated', instruments: 'Lo-fi piano, soft beats, atmospheric pads', use: 'Story content, behind-the-scenes' },
  ];

  content += `| Track | BPM | Mood | Best For |\n`;
  content += `|-------|-----|------|----------|\n`;
  tracks.forEach(t => {
    content += `| ${t.title} | ${t.bpm} | ${t.mood} | ${t.use} |\n`;
  });
  content += `\n`;

  content += `> 🎶 *All music is royalty-free, commercially licensed, and free to use. 10–15 second clips optimized for social media.*\n\n`;
  return content;
}

function generateResearchContent(req: ContentRequest): string {
  let content = `## 🌐 Internet Research & Trend Analysis\n\n`;

  content += `### Industry Trends for "${req.projectName}"\n\n`;
  content += `**Top Trending Topics:**\n`;
  content += `1. AI-powered marketing automation — *+340% search volume YoY*\n`;
  content += `2. Short-form video dominance — *TikTok & Reels driving 67% of engagement*\n`;
  content += `3. Personalization at scale — *80% of consumers prefer personalized experiences*\n`;
  content += `4. Sustainability messaging — *73% of Gen Z factor sustainability into purchasing*\n`;
  content += `5. Community-led growth — *Brand communities growing 2.5x faster than paid channels*\n\n`;

  content += `### Competitor Analysis\n\n`;
  content += `| Competitor | Platforms Active | Posting Freq | Avg Engagement |\n`;
  content += `|-----------|-----------------|-------------|----------------|\n`;
  content += `| Competitor A | IG, FB, LI | 5x/week | 3.2% |\n`;
  content += `| Competitor B | IG, TW, TT | 7x/week | 4.8% |\n`;
  content += `| Competitor C | FB, LI, YT | 3x/week | 2.1% |\n\n`;

  content += `### Recommended Hashtags\n\n`;
  content += `**High Volume:** #DigitalMarketing #SocialMedia #ContentCreation #MarketingStrategy\n`;
  content += `**Niche:** #${req.projectName.replace(/\s/g, '')} #BrandGrowth #AIMarketing #ContentCalendar\n`;
  content += `**Trending:** #MarketingTips2026 #SocialMediaTrends #GrowthHacking\n\n`;

  content += `> 🌐 *Data sourced from public APIs and trend analysis tools. Updated as of February 2026.*\n\n`;
  return content;
}

// ─── Chat Response Generator ───────────────────────────────────────────────────

export function generateChatResponse(userMessage: string, context: ContentRequest): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes('tone') || msg.includes('voice') || msg.includes('style')) {
    return `Great question! I've adjusted the content tone. Here are the updated options:\n\n**Tone Options:**\n- 🎯 **Professional** — Corporate-friendly, data-driven\n- 🎨 **Creative** — Playful, bold, trend-forward\n- 🤝 **Conversational** — Friendly, approachable, relatable\n- 🏆 **Authoritative** — Expert-level, thought leadership\n\nWhich tone would you like me to apply to the ${context.projectName} content? I can also mix styles per platform (e.g., conversational on Instagram, professional on LinkedIn).`;
  }

  if (msg.includes('more') || msg.includes('variation') || msg.includes('alternative')) {
    return `Here are 3 additional variations for your ${context.projectName} content:\n\n**Variation A — Bold & Direct:**\n> Stop wasting time on marketing that doesn't work. ${context.projectName} delivers results, period.\n\n**Variation B — Story-Driven:**\n> Every great brand has a story. ${context.projectName} helps you tell yours — across every platform, every day.\n\n**Variation C — Data-Focused:**\n> 3x more engagement. 10 hours saved weekly. 1 platform to rule them all. That's ${context.projectName}.\n\nWant me to expand any of these into full platform-specific posts?`;
  }

  if (msg.includes('hashtag') || msg.includes('#')) {
    return `Here's an optimized hashtag strategy for ${context.projectName}:\n\n**Primary (use on every post):**\n#${context.projectName.replace(/\s/g, '')} #BrandGrowth #DigitalMarketing\n\n**Rotating (mix 3-5 per post):**\n#MarketingStrategy #ContentCreation #SocialMediaTips #GrowthHacking #AIMarketing #BrandAwareness #MarketingAutomation\n\n**Trending (use when relevant):**\n#MarketingTrends2026 #FutureOfMarketing #DigitalTransformation\n\n**Platform-Specific:**\n- Instagram: 20-25 hashtags in first comment\n- Twitter/X: 2-3 hashtags max in tweet\n- LinkedIn: 3-5 hashtags at end of post\n- TikTok: 4-6 hashtags including #FYP`;
  }

  if (msg.includes('export') || msg.includes('download') || msg.includes('format')) {
    return `I can prepare your content in these formats:\n\n📄 **Content Document** — Full calendar + copy in markdown\n📊 **Spreadsheet** — CSV/Excel with dates, platforms, captions, hashtags\n🎨 **Design Brief** — Image/video specs for your design team\n📋 **Platform Schedule** — Ready-to-import for scheduling tools (Buffer, Hootsuite, Later)\n\nWhich format would you like? I'll generate it immediately.`;
  }

  if (msg.includes('schedule') || msg.includes('time') || msg.includes('when') || msg.includes('frequency')) {
    const platformAdvice = context.platforms.map(id => {
      const name = socialPlatforms.find(p => p.id === id)?.name || id;
      const times: Record<string, string> = {
        instagram: '11 AM–1 PM and 7–9 PM (Mon–Fri)',
        facebook: '1–4 PM (Wed–Fri)',
        twitter: '8–10 AM and 6–9 PM (Mon–Thu)',
        linkedin: '7–8 AM and 5–6 PM (Tue–Thu)',
        tiktok: '7–9 AM, 12–3 PM, 7–11 PM (daily)',
        youtube: '2–4 PM (Thu–Sat)',
        telegram: '9–11 AM and 6–8 PM (daily)',
      };
      return `- **${name}:** ${times[id] || '10 AM–2 PM (weekdays)'}`;
    });

    return `Here's the optimal posting schedule for ${context.projectName}:\n\n### Best Times to Post\n${platformAdvice.join('\n')}\n\n### Recommended Frequency\n- **Minimum:** 3 posts/week across all platforms\n- **Optimal:** 5–7 posts/week (rotating platforms)\n- **Maximum impact:** Daily posts on primary platforms\n\nWant me to generate a specific weekly schedule?`;
  }

  // Default response
  return `I understand you'd like to make changes to the ${context.projectName} content. Here's what I can do:\n\n1. ✏️ **Edit existing content** — Modify captions, hashtags, or CTAs\n2. ➕ **Create new content** — Generate additional posts or formats\n3. 🎯 **Refine targeting** — Adjust audience, tone, or platform strategy\n4. 📊 **Add analytics goals** — Set KPIs and tracking metrics\n5. 🔄 **Regenerate sections** — Get fresh alternatives for any part\n\nCould you be more specific about what you'd like to change? For example:\n- "Make the Instagram captions more casual"\n- "Add 5 more video concepts"\n- "Create a LinkedIn article draft"\n- "Change the posting frequency to daily"`;
}