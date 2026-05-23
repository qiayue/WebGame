// ---------------------------------------------------------------------------
// Worker bindings & env
// ---------------------------------------------------------------------------

export interface Env {
  ASSETS: Fetcher;
  R2_UPLOADS: R2Bucket;

  // All of the following are OPTIONAL — they exist only as a fallback for
  // power users who prefer to manage configuration via `wrangler secret`.
  // The normal path is the /setup wizard, which writes config to R2.
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  R2_UPLOAD_SECRET?: string;
  R2_PUBLIC_BASE_URL?: string;
}

// ---------------------------------------------------------------------------
// Site / global config
// ---------------------------------------------------------------------------

export interface SiteConfig {
  name: string;
  description: string;
  defaultLang: string;
  languages: LanguageConfig[];
  menu: MenuItem[];
  footer: FooterConfig;
  adsense?: {
    clientId: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
  };
  social?: Record<string, string>;
}

export interface LanguageConfig {
  code: string;       // e.g. "en", "zh", "ja"
  label: string;      // e.g. "English"
  htmlLang: string;   // e.g. "en", "zh-CN"
}

export interface MenuItem {
  label: string;
  url: string;
  lang: string;       // which language this menu item belongs to
}

export interface FooterConfig {
  copyright?: string;
  links: { label: string; url: string; lang: string }[];
}

// ---------------------------------------------------------------------------
// Page (the universal content model)
// ---------------------------------------------------------------------------

export type PageType = 'game' | 'guide' | 'tag' | 'home';

export interface PageAlternate {
  lang: string;
  slug: string;       // slug only; resolver builds the full URL
}

export interface PageIndexEntry {
  type: PageType;
  lang: string;
  slug: string;
  title: string;
  description?: string;
  cover?: string;
  tags: string[];
  publishedAt: string;     // ISO date
  updatedAt: string;
  alternateKey?: string;   // pages sharing this key are translations of each other
}

export interface PageIndex {
  generatedAt: string;
  entries: PageIndexEntry[];
}

export interface PageDetail {
  type: PageType;
  lang: string;
  slug: string;
  title: string;
  description?: string;
  cover?: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  alternateKey?: string;
  // For tag pages: the tag slug this page aggregates. Defaults to page.slug.
  tagSlug?: string;
  modules: PageModule[];
}

// ---------------------------------------------------------------------------
// Modules (the four building blocks)
// ---------------------------------------------------------------------------

export type PageModule =
  | GameIframeModule
  | VideoIframeModule
  | PageListModule
  | SeoContentModule;

export interface GameIframeModule {
  type: 'game-iframe';
  url: string;
  cover?: string;           // override page.cover for the splash
  ratio?: '16:9' | '4:3' | '1:1' | '9:16';
  playLabel?: string;       // optional override of i18n
  fullscreen?: boolean;     // show fullscreen button (default true)
}

export interface VideoIframeModule {
  type: 'video-iframe';
  url: string;              // YouTube embed URL
  cover?: string;
  ratio?: '16:9' | '4:3' | '1:1' | '9:16';
  title?: string;
}

export interface PageListModule {
  type: 'page-list';
  heading?: string;
  source: 'latest' | 'related' | 'tag' | 'manual';
  filter?: {
    type?: PageType | PageType[];
    tag?: string;            // for source: 'tag'
  };
  manual?: { type: PageType; slug: string }[]; // for source: 'manual'
  limit?: number;
  layout?: 'grid' | 'list' | 'carousel';
}

export type SeoContentModule =
  | { type: 'seo-content'; variant: 'intro'; heading?: string; body: string }
  | { type: 'seo-content'; variant: 'rich-text'; body: string }
  | {
      type: 'seo-content';
      variant: 'features-grid';
      heading?: string;
      intro?: string;
      items: { icon?: string; title: string; body: string }[];
    }
  | {
      type: 'seo-content';
      variant: 'steps';
      heading?: string;
      intro?: string;
      items: { title: string; body: string }[];
    }
  | {
      type: 'seo-content';
      variant: 'screenshots';
      heading?: string;
      images: { url: string; alt: string; caption?: string }[];
    }
  | {
      type: 'seo-content';
      variant: 'pros-cons';
      heading?: string;
      pros: string[];
      cons: string[];
    }
  | {
      type: 'seo-content';
      variant: 'faq';
      heading?: string;
      items: { q: string; a: string }[];
    }
  | {
      type: 'seo-content';
      variant: 'text-image';
      heading?: string;
      body: string;
      image: { url: string; alt: string };
      reverse?: boolean;
    };

// ---------------------------------------------------------------------------
// I18n (UI strings)
// ---------------------------------------------------------------------------

export interface UiStrings {
  playNow: string;
  loadingGame: string;
  fullscreen: string;
  watchVideo: string;
  relatedGames: string;
  latestGames: string;
  relatedGuides: string;
  taggedWith: string;
  faq: string;
  pros: string;
  cons: string;
  language: string;
  home: string;
  searchPlaceholder?: string;
  poweredBy: string;
}
