import type { Env, PageDetail, PageIndex, PageType, SiteConfig, UiStrings } from '../types';

// ---------------------------------------------------------------------------
// Content store backed by R2.
//
// Everything readable on the public site (and editable in the admin) lives
// under the `content/` prefix in the R2 bucket. The Worker reads from R2
// with a short in-memory cache so the per-request overhead stays small.
//
// On first read of a missing key we lazily seed R2 from the bundled
// defaults (imported below). This means a brand-new deployment "just
// works" with the template's demo content, and admins can override any
// of it by saving in /admin.
// ---------------------------------------------------------------------------

import bundledSite from '../../content/site.json';
import bundledIndex from '../../content/index.json';
import bundledEn from '../../content/i18n/en.json';
import bundledZh from '../../content/i18n/zh.json';
import bundledPageFiles from '../../content/_page-files';

const SEEDS = {
  site: parseSeed<SiteConfig>(bundledSite),
  index: parseSeed<PageIndex>(bundledIndex),
  i18n: {
    en: parseSeed<UiStrings>(bundledEn),
    zh: parseSeed<UiStrings>(bundledZh),
  } as Record<string, UiStrings>,
  pages: Object.fromEntries(
    Object.entries(bundledPageFiles).map(([k, v]) => [k, parseSeed<PageDetail>(v)]),
  ) as Record<string, PageDetail>,
};

const CACHE_TTL_MS = 30_000;

interface Cached<T> { value: T; loadedAt: number }

class Cache<T> {
  private entries = new Map<string, Cached<T>>();
  get(key: string): T | undefined {
    const e = this.entries.get(key);
    if (!e) return undefined;
    if (Date.now() - e.loadedAt > CACHE_TTL_MS) {
      this.entries.delete(key);
      return undefined;
    }
    return e.value;
  }
  set(key: string, value: T): void {
    this.entries.set(key, { value, loadedAt: Date.now() });
  }
  invalidate(key: string): void { this.entries.delete(key); }
  clear(): void { this.entries.clear(); }
}

const siteCache = new Cache<SiteConfig>();
const indexCache = new Cache<PageIndex>();
const pageCache = new Cache<PageDetail | null>();
const i18nCache = new Cache<UiStrings>();

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

const KEY_SITE = 'content/site.json';
const KEY_INDEX = 'content/index.json';
const keyI18n = (lang: string) => `content/i18n/${lang}.json`;
const keyPage = (type: PageType, lang: string, slug: string) =>
  type === 'home' ? `content/pages/home/${lang}.json`
  : `content/pages/${typePrefix(type)}/${lang}/${slug}.json`;

function typePrefix(t: Exclude<PageType, 'home'>): string {
  return t === 'game' ? 'g' : t === 'guide' ? 'p' : 't';
}

export async function loadSite(env: Env): Promise<SiteConfig> {
  const cached = siteCache.get('site');
  if (cached) return cached;
  const value = await readOrSeed<SiteConfig>(env, KEY_SITE, SEEDS.site);
  siteCache.set('site', value);
  return value;
}

export async function loadIndex(env: Env): Promise<PageIndex> {
  const cached = indexCache.get('index');
  if (cached) return cached;
  const value = await readOrSeed<PageIndex>(env, KEY_INDEX, SEEDS.index);
  indexCache.set('index', value);
  return value;
}

export async function loadUi(env: Env, lang: string): Promise<UiStrings> {
  const cached = i18nCache.get(lang);
  if (cached) return cached;
  const seed = SEEDS.i18n[lang] ?? SEEDS.i18n.en!;
  const value = await readOrSeed<UiStrings>(env, keyI18n(lang), seed, { seedToR2: !!SEEDS.i18n[lang] });
  i18nCache.set(lang, value);
  return value;
}

export async function loadPage(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<PageDetail | null> {
  const cacheKey = `${type}/${lang}/${slug}`;
  const cached = pageCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const k = keyPage(type, lang, slug);
  const obj = await env.R2_UPLOADS.get(k);
  if (obj) {
    const value = JSON.parse(await obj.text()) as PageDetail;
    pageCache.set(cacheKey, value);
    return value;
  }

  // Fall back to bundled seed if present, and lazy-seed R2.
  const seed = SEEDS.pages[cacheKey];
  if (seed) {
    pageCache.set(cacheKey, seed);
    // fire and forget
    env.R2_UPLOADS.put(k, JSON.stringify(seed, null, 2), jsonMetadata());
    return seed;
  }

  pageCache.set(cacheKey, null);
  return null;
}

// ---------------------------------------------------------------------------
// Write paths (used by the admin)
// ---------------------------------------------------------------------------

export async function saveSite(env: Env, site: SiteConfig): Promise<void> {
  await env.R2_UPLOADS.put(KEY_SITE, JSON.stringify(site, null, 2), jsonMetadata());
  siteCache.invalidate('site');
}

export async function savePage(env: Env, page: PageDetail): Promise<void> {
  page.updatedAt = new Date().toISOString();
  if (!page.publishedAt) page.publishedAt = page.updatedAt;
  const k = keyPage(page.type, page.lang, page.slug);
  await env.R2_UPLOADS.put(k, JSON.stringify(page, null, 2), jsonMetadata());
  pageCache.invalidate(`${page.type}/${page.lang}/${page.slug}`);
  await updateIndexEntry(env, page);
}

export async function deletePageFromStore(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<void> {
  await env.R2_UPLOADS.delete(keyPage(type, lang, slug));
  pageCache.invalidate(`${type}/${lang}/${slug}`);
  await removeIndexEntry(env, type, lang, slug);
}

async function updateIndexEntry(env: Env, page: PageDetail): Promise<void> {
  const index = await loadIndex(env);
  const others = index.entries.filter(
    (e) => !(e.type === page.type && e.lang === page.lang && e.slug === page.slug),
  );
  const newEntry = {
    type: page.type,
    lang: page.lang,
    slug: page.slug,
    title: page.title,
    description: page.description,
    cover: page.cover,
    tags: page.tags ?? [],
    publishedAt: page.publishedAt,
    updatedAt: page.updatedAt,
    alternateKey: page.alternateKey,
  };
  const next: PageIndex = {
    generatedAt: new Date().toISOString(),
    entries: [...others, newEntry].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1)),
  };
  await env.R2_UPLOADS.put(KEY_INDEX, JSON.stringify(next, null, 2), jsonMetadata());
  indexCache.invalidate('index');
}

async function removeIndexEntry(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<void> {
  const index = await loadIndex(env);
  const next: PageIndex = {
    generatedAt: new Date().toISOString(),
    entries: index.entries.filter(
      (e) => !(e.type === type && e.lang === lang && e.slug === slug),
    ),
  };
  await env.R2_UPLOADS.put(KEY_INDEX, JSON.stringify(next, null, 2), jsonMetadata());
  indexCache.invalidate('index');
}

// Force a cache reset (used after multi-write operations in admin).
export function invalidateAllCaches(): void {
  siteCache.clear();
  indexCache.clear();
  pageCache.clear();
  i18nCache.clear();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readOrSeed<T>(
  env: Env,
  key: string,
  seed: T,
  opts: { seedToR2?: boolean } = { seedToR2: true },
): Promise<T> {
  try {
    const obj = await env.R2_UPLOADS.get(key);
    if (obj) return JSON.parse(await obj.text()) as T;
  } catch {
    // fall through to seed
  }
  if (opts.seedToR2) {
    // Lazy seed; ignore errors (don't block read).
    env.R2_UPLOADS.put(key, JSON.stringify(seed, null, 2), jsonMetadata()).catch(() => {});
  }
  return seed;
}

function jsonMetadata(): R2PutOptions {
  return {
    httpMetadata: {
      contentType: 'application/json; charset=utf-8',
      cacheControl: 'no-store',
    },
  };
}

function parseSeed<T>(raw: unknown): T {
  if (typeof raw === 'string') return JSON.parse(raw) as T;
  return raw as T;
}
