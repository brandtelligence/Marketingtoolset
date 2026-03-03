/**
 * useSEO — Dynamic SEO metadata manager for React SPA pages.
 *
 * Imperatively writes/updates all SEO-relevant elements in <head> on every
 * route change and cleans up orphaned tags on unmount.
 *
 * Covers:
 *   • document.title
 *   • <meta name="description"> / "keywords" / "robots" / "author">
 *   • <link rel="canonical">
 *   • Open Graph (og:title, og:description, og:url, og:image, og:type, og:site_name)
 *   • Twitter Card (twitter:card, twitter:title, twitter:description, twitter:image)
 *   • JSON-LD structured data (<script type="application/ld+json">)
 *
 * Usage:
 *   useSEO({
 *     title:       'Page Title',
 *     description: 'Page description (150–160 chars).',
 *     schema:      { "@context": "https://schema.org", ... }
 *   });
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router';

// ── Site-wide constants ───────────────────────────────────────────────────────
const SITE_NAME    = 'Brandtelligence';
const SITE_URL     = 'https://brandtelligence.io';          // canonical base
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;           // 1200×630 OG fallback
const TWITTER_HANDLE = '@brandtelligence';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SEOSchema = Record<string, unknown> | Record<string, unknown>[];

export interface SEOConfig {
  /** Page-specific title — site suffix appended automatically: "{title} | Brandtelligence" */
  title: string;
  /** Meta description (aim for 150–160 characters) */
  description: string;
  /** Comma-separated keywords (optional; Google largely ignores, but Bing uses) */
  keywords?: string;
  /** Absolute or relative OG image URL (defaults to /og-image.jpg) */
  image?: string;
  /** Open Graph type (default: 'website') */
  type?: 'website' | 'article' | 'product';
  /** Set true only for private / utility pages that should not be indexed */
  noindex?: boolean;
  /** JSON-LD Schema.org object or array of objects */
  schema?: SEOSchema;
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Upsert a <meta> element identified by a key attribute. */
function setMeta(attrName: string, attrValue: string, content: string): void {
  const selector = `meta[${attrName}="${attrValue}"]`;
  let el = document.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Upsert or remove a <link rel="canonical"> element. */
function setCanonical(href: string): void {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Upsert a JSON-LD <script> by a stable ID. */
function setJsonLd(id: string, data: SEOSchema): void {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 0);
}

/** Remove a JSON-LD <script> by ID (cleanup). */
function removeJsonLd(id: string): void {
  document.getElementById(id)?.remove();
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSEO(config: SEOConfig): void {
  const location   = useLocation();
  const pathname   = location.pathname;
  const canonical  = `${SITE_URL}${pathname === '/' ? '' : pathname}`;
  const fullTitle  = `${config.title} | ${SITE_NAME}`;
  const ogImage    = config.image
    ? (config.image.startsWith('http') ? config.image : `${SITE_URL}${config.image}`)
    : DEFAULT_IMAGE;

  useEffect(() => {
    // ── 1. Document title ────────────────────────────────────────────────────
    document.title = fullTitle;

    // ── 2. Standard meta tags ────────────────────────────────────────────────
    setMeta('name', 'description', config.description);
    setMeta('name', 'robots',
      config.noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large');
    if (config.keywords) {
      setMeta('name', 'keywords', config.keywords);
    }
    setMeta('name', 'author', 'Brandtelligence Sdn Bhd');

    // ── 3. Canonical URL ─────────────────────────────────────────────────────
    setCanonical(canonical);

    // ── 4. Open Graph ────────────────────────────────────────────────────────
    setMeta('property', 'og:title',       fullTitle);
    setMeta('property', 'og:description', config.description);
    setMeta('property', 'og:url',         canonical);
    setMeta('property', 'og:image',       ogImage);
    setMeta('property', 'og:image:width',  '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:type',        config.type ?? 'website');
    setMeta('property', 'og:site_name',   SITE_NAME);
    setMeta('property', 'og:locale',      'en_GB');

    // ── 5. Twitter Card ──────────────────────────────────────────────────────
    setMeta('name', 'twitter:card',        'summary_large_image');
    setMeta('name', 'twitter:site',        TWITTER_HANDLE);
    setMeta('name', 'twitter:creator',     TWITTER_HANDLE);
    setMeta('name', 'twitter:title',       fullTitle);
    setMeta('name', 'twitter:description', config.description);
    setMeta('name', 'twitter:image',       ogImage);

    // ── 6. JSON-LD structured data ───────────────────────────────────────────
    const SCHEMA_ID = 'ld-json-page';
    if (config.schema) {
      setJsonLd(SCHEMA_ID, config.schema);
    } else {
      removeJsonLd(SCHEMA_ID);
    }

    // ── Cleanup: restore minimal state on unmount ────────────────────────────
    return () => {
      // We deliberately leave meta tags in place so fast navigations don't
      // flash blank values — the next useSEO call overwrites them.
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullTitle, canonical, config.description, config.keywords,
      config.noindex, config.image, config.type]);
}

// ── Shared schema builders (used across pages) ────────────────────────────────

/** Build a WebPage schema.org object. */
export function webPageSchema(opts: {
  name: string;
  description: string;
  url: string;
  breadcrumb?: Array<{ name: string; url: string }>;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context':   'https://schema.org',
    '@type':      'WebPage',
    name:         opts.name,
    description:  opts.description,
    url:          opts.url,
    inLanguage:   'en',
    isPartOf:     { '@id': `${SITE_URL}/#website` },
    publisher:    { '@id': `${SITE_URL}/#organization` },
  };
  if (opts.breadcrumb && opts.breadcrumb.length > 0) {
    schema['breadcrumb'] = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        ...opts.breadcrumb.map((crumb, i) => ({
          '@type': 'ListItem',
          position: i + 2,
          name: crumb.name,
          item: crumb.url,
        })),
      ],
    };
  }
  return schema;
}

/** Organization schema — injected sitewide from WebLayout. */
export const ORGANIZATION_SCHEMA: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  '@id':      `${SITE_URL}/#organization`,
  name:       'Brandtelligence',
  legalName:  'Brandtelligence Sdn Bhd',
  url:        SITE_URL,
  logo: {
    '@type':      'ImageObject',
    url:          `${SITE_URL}/logo.png`,
    width:        180,
    height:       40,
    caption:      'Brandtelligence',
  },
  description:
    'AI-powered marketing intelligence platform for ambitious brands and agencies. Unifies content creation, campaign analytics, landing pages, and client reporting in one multi-tenant platform.',
  foundingDate: '2022',
  foundingLocation: {
    '@type':   'Place',
    name:      'Kuala Lumpur, Malaysia',
    address: {
      '@type':         'PostalAddress',
      addressLocality: 'Kuala Lumpur',
      addressCountry:  'MY',
    },
  },
  contactPoint: [
    {
      '@type':         'ContactPoint',
      contactType:     'customer support',
      email:           'support@brandtelligence.io',
      availableLanguage: ['English'],
    },
    {
      '@type':       'ContactPoint',
      contactType:   'sales',
      email:         'sales@brandtelligence.io',
    },
  ],
  sameAs: [
    'https://twitter.com/brandtelligence',
    'https://www.linkedin.com/company/brandtelligence',
    'https://www.youtube.com/@brandtelligence',
  ],
  areaServed: 'Worldwide',
};

/** WebSite schema — injected sitewide from WebLayout. */
export const WEBSITE_SCHEMA: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type':    'WebSite',
  '@id':      `${SITE_URL}/#website`,
  name:       'Brandtelligence',
  url:        SITE_URL,
  description:
    'AI-powered marketing intelligence platform — AI content creation, campaign analytics, landing pages, CRM, and brand management in one platform.',
  publisher:  { '@id': `${SITE_URL}/#organization` },
  inLanguage: 'en',
  potentialAction: {
    '@type':       'SearchAction',
    target: {
      '@type':       'EntryPoint',
      urlTemplate:   `${SITE_URL}/blog?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};
