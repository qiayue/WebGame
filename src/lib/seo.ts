import type { PageDetail, PageIndex, PageIndexEntry, PageModule, SiteConfig } from '../types';
import { findAlternates } from './content';
import { escapeAttr, escapeHtml, html, raw, type SafeHtml } from './html';
import { pagePath } from './url';

export interface SeoInput {
  site: SiteConfig;
  page: PageDetail;
  origin: string;
  index: PageIndex;
}

export function renderMeta({ site, page, origin, index }: SeoInput): SafeHtml {
  const title = page.title;
  const description = page.description ?? site.description;
  const canonical = origin + pagePath(site, page.type, page.lang, page.slug);
  const ogImage = page.cover ?? '';

  const alts = findAlternates(index, page.alternateKey, page.lang);
  const alternateLinks = alts
    .map((a) => {
      const href = origin + pagePath(site, a.type, a.lang, a.slug);
      const lang = site.languages.find((l) => l.code === a.lang);
      const hreflang = escapeAttr(lang?.htmlLang ?? a.lang);
      return `<link rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}"/>`;
    })
    .join('');

  // Self hreflang
  const selfLang = site.languages.find((l) => l.code === page.lang);
  const selfHreflang = selfLang?.htmlLang ?? page.lang;
  const xDefault =
    page.lang === site.defaultLang
      ? `<link rel="alternate" hreflang="x-default" href="${escapeAttr(canonical)}"/>`
      : '';

  return html`
    <title>${title}</title>
    <meta name="description" content="${description}"/>
    <link rel="canonical" href="${canonical}"/>
    <link rel="alternate" hreflang="${selfHreflang}" href="${canonical}"/>
    ${raw(alternateLinks)}
    ${raw(xDefault)}
    <meta property="og:type" content="website"/>
    <meta property="og:title" content="${title}"/>
    <meta property="og:description" content="${description}"/>
    <meta property="og:url" content="${canonical}"/>
    ${ogImage ? html`<meta property="og:image" content="${ogImage}"/>` : ''}
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${title}"/>
    <meta name="twitter:description" content="${description}"/>
    ${ogImage ? html`<meta name="twitter:image" content="${ogImage}"/>` : ''}
  `;
}

// ---------------------------------------------------------------------------
// JSON-LD structured data
// ---------------------------------------------------------------------------

export function renderJsonLd(input: SeoInput): SafeHtml {
  const { site, page, origin } = input;
  const url = origin + pagePath(site, page.type, page.lang, page.slug);

  const blocks: object[] = [];

  // Base: WebPage / VideoGame / Article
  if (page.type === 'game') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: page.title,
      description: page.description ?? site.description,
      url,
      image: page.cover,
      inLanguage: page.lang,
      genre: page.tags,
      datePublished: page.publishedAt,
      dateModified: page.updatedAt,
    });
  } else if (page.type === 'guide') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.title,
      description: page.description ?? site.description,
      url,
      image: page.cover,
      inLanguage: page.lang,
      datePublished: page.publishedAt,
      dateModified: page.updatedAt,
    });
  } else {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: page.title,
      description: page.description ?? site.description,
      url,
      inLanguage: page.lang,
    });
  }

  // FAQ structured data, scanned from modules
  const faq = collectFaq(page.modules);
  if (faq.length > 0) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return raw(
    blocks
      .map(
        (b) =>
          `<script type="application/ld+json">${JSON.stringify(b).replace(/</g, '\\u003c')}</script>`,
      )
      .join(''),
  );
}

function collectFaq(modules: PageModule[]): { q: string; a: string }[] {
  const items: { q: string; a: string }[] = [];
  for (const m of modules) {
    if (m.type === 'seo-content' && m.variant === 'faq') {
      items.push(...m.items);
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Sitemap & robots
// ---------------------------------------------------------------------------

export function buildSitemap(
  site: SiteConfig,
  entries: PageIndexEntry[],
  origin: string,
): string {
  const urls = entries
    .map((e) => {
      const loc = origin + pagePath(site, e.type, e.lang, e.slug);
      const lastmod = e.updatedAt;
      return `<url><loc>${escapeHtml(loc)}</loc><lastmod>${escapeHtml(lastmod)}</lastmod></url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function buildRobots(origin: string): string {
  return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\n\nSitemap: ${origin}/sitemap.xml\n`;
}
