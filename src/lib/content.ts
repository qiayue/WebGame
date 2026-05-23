import type {
  Env,
  PageDetail,
  PageIndex,
  PageIndexEntry,
  PageType,
  SiteConfig,
  UiStrings,
} from '../types';
import { loadIndex, loadPage, loadSite, loadUi } from './store';

// ---------------------------------------------------------------------------
// Public content API
//
// Thin convenience layer over lib/store.ts. The store is the source of truth
// (R2-backed with a short in-memory cache). Everything queryable is built on
// the index, which is loaded once per request and passed to the helpers.
// ---------------------------------------------------------------------------

export { loadSite, loadIndex, loadPage, loadUi };

// A "snapshot" of the data a request typically needs. Bundled together so a
// route can load it in one Promise.all.
export interface ContentSnapshot {
  site: SiteConfig;
  index: PageIndex;
}

export async function loadSnapshot(env: Env): Promise<ContentSnapshot> {
  const [site, index] = await Promise.all([loadSite(env), loadIndex(env)]);
  return { site, index };
}

// ---------------------------------------------------------------------------
// Index queries — pure functions that operate on a passed-in index.
// ---------------------------------------------------------------------------

export interface ListQuery {
  type?: PageType | PageType[];
  tag?: string;
  lang: string;
  limit?: number;
  excludeSlug?: string;
  excludeType?: PageType;
}

export function listPages(index: PageIndex, q: ListQuery): PageIndexEntry[] {
  const types = q.type ? (Array.isArray(q.type) ? q.type : [q.type]) : null;

  let result = index.entries.filter((e) => {
    if (e.lang !== q.lang) return false;
    if (types && !types.includes(e.type)) return false;
    if (q.tag && !e.tags.includes(q.tag)) return false;
    if (q.excludeSlug && q.excludeType && e.slug === q.excludeSlug && e.type === q.excludeType) {
      return false;
    }
    return true;
  });

  result.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  if (q.limit && q.limit > 0) result = result.slice(0, q.limit);
  return result;
}

export function listRelated(
  index: PageIndex,
  page: Pick<PageDetail, 'type' | 'lang' | 'slug' | 'tags'>,
  opts: { limit?: number; type?: PageType | PageType[] } = {},
): PageIndexEntry[] {
  const limit = opts.limit ?? 8;
  const types = opts.type ? (Array.isArray(opts.type) ? opts.type : [opts.type]) : null;
  const tagSet = new Set(page.tags);

  return index.entries
    .filter((e) => {
      if (e.lang !== page.lang) return false;
      if (e.slug === page.slug && e.type === page.type) return false;
      if (types && !types.includes(e.type)) return false;
      return e.tags.some((t) => tagSet.has(t));
    })
    .map((e) => ({ entry: e, overlap: e.tags.filter((t) => tagSet.has(t)).length }))
    .sort((a, b) => {
      if (b.overlap !== a.overlap) return b.overlap - a.overlap;
      return a.entry.publishedAt < b.entry.publishedAt ? 1 : -1;
    })
    .slice(0, limit)
    .map((s) => s.entry);
}

export function findAlternates(
  index: PageIndex,
  key: string | undefined,
  currentLang: string,
): PageIndexEntry[] {
  if (!key) return [];
  return index.entries.filter((e) => e.alternateKey === key && e.lang !== currentLang);
}

// Re-export env for convenience
export type { Env };
