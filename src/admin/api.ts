import type { Env, PageDetail, PageType, SiteConfig } from '../types';
import {
  deletePageFromStore,
  loadIndex,
  loadPage,
  loadSite,
  savePage,
  saveSite,
} from '../lib/store';
import { readSession, signUploadToken, verifyUploadToken } from './auth';

// ---------------------------------------------------------------------------
// Admin API
//
// Edits write directly to the R2-backed content store. No git, no deploy —
// the site reflects the change within ~30 seconds (the R2 read cache TTL).
//
// All endpoints require a valid session cookie AND a CSRF token header.
//
// Routes:
//   GET    /admin/api/site                       — read site config
//   PUT    /admin/api/site                       — save site config
//   GET    /admin/api/index                      — read content index
//   GET    /admin/api/page/:type/:lang/:slug     — read a page detail
//   PUT    /admin/api/page                       — save a page
//   DELETE /admin/api/page/:type/:lang/:slug     — delete a page
//   POST   /admin/api/upload-token               — sign an upload token
//   PUT    /admin/api/upload?token=...           — upload bytes to R2
// ---------------------------------------------------------------------------

const CSRF_HEADER = 'x-csrf-token';

export async function handleAdminApi(req: Request, env: Env): Promise<Response> {
  const session = await readSession(env, req);
  if (!session) return json({ error: 'unauthorized' }, 401);

  const url = new URL(req.url);
  const method = req.method.toUpperCase();
  const path = url.pathname.replace(/^\/admin\/api/, '') || '/';

  if (method !== 'GET' && req.headers.get(CSRF_HEADER) !== '1') {
    return json({ error: 'csrf' }, 403);
  }

  try {
    if (path === '/upload-token' && method === 'POST') return await handleUploadToken(req, env);
    if (path === '/upload' && method === 'PUT') return await handleUpload(req, env);

    if (path === '/site' && method === 'GET') return await handleGetSite(env);
    if (path === '/site' && method === 'PUT') return await handleSaveSite(req, env);

    if (path === '/index' && method === 'GET') return await handleGetIndex(env);

    const pageMatch = /^\/page(?:\/(game|guide|tag|home)\/([a-z0-9-]+)\/([a-zA-Z0-9-_/]+))?$/.exec(
      path,
    );
    if (pageMatch && method === 'GET' && pageMatch[1]) {
      return await handleGetPage(env, pageMatch[1] as PageType, pageMatch[2]!, pageMatch[3]!);
    }
    if (path === '/page' && method === 'PUT') return await handleSavePage(req, env);
    if (pageMatch && method === 'DELETE' && pageMatch[1]) {
      return await handleDeletePage(env, pageMatch[1] as PageType, pageMatch[2]!, pageMatch[3]!);
    }

    return json({ error: 'not-found' }, 404);
  } catch (e: unknown) {
    console.error('admin api error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: 'internal', message }, 500);
  }
}

// ---------------------------------------------------------------------------

async function handleGetSite(env: Env): Promise<Response> {
  const site = await loadSite(env);
  return json(site);
}

async function handleSaveSite(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as SiteConfig;
  if (!body || typeof body !== 'object') return json({ error: 'bad-body' }, 400);
  await saveSite(env, body);
  return json({ ok: true });
}

async function handleGetIndex(env: Env): Promise<Response> {
  const index = await loadIndex(env);
  return json(index);
}

async function handleGetPage(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<Response> {
  const page = await loadPage(env, type, lang, slug);
  if (!page) return json({ error: 'not-found' }, 404);
  return json(page);
}

async function handleSavePage(req: Request, env: Env): Promise<Response> {
  const page = (await req.json()) as PageDetail;
  if (!page || !page.type || !page.lang || !page.slug) {
    return json({ error: 'bad-body' }, 400);
  }
  await savePage(env, page);
  return json({ ok: true });
}

async function handleDeletePage(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<Response> {
  await deletePageFromStore(env, type, lang, slug);
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Uploads (R2)
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

async function handleUploadToken(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { filename?: string; contentType?: string };
  if (!body.filename || !body.contentType) return json({ error: 'bad-body' }, 400);
  if (!ALLOWED_IMAGE_TYPES.has(body.contentType)) return json({ error: 'bad-type' }, 400);
  const safeName = sanitizeFilename(body.filename);
  const key = `covers/${Date.now()}-${cryptoRandom()}-${safeName}`;
  const exp = Math.floor(Date.now() / 1000) + 5 * 60;
  const token = await signUploadToken(env, key, body.contentType, exp);
  const { loadConfig } = await import('../lib/config');
  const config = await loadConfig(env);
  const publicUrl = (config.r2.publicBaseUrl || '').replace(/\/+$/, '') + '/' + key;
  return json({ token, key, publicUrl });
}

async function handleUpload(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  if (!token) return json({ error: 'no-token' }, 400);
  const verified = await verifyUploadToken(env, token);
  if (!verified) return json({ error: 'bad-token' }, 401);

  const ct = req.headers.get('content-type') ?? '';
  if (ct !== verified.contentType) return json({ error: 'bad-content-type' }, 400);

  const len = Number(req.headers.get('content-length') ?? '0');
  if (!len || len > MAX_UPLOAD_BYTES) return json({ error: 'too-large' }, 413);

  const buf = await req.arrayBuffer();
  if (buf.byteLength > MAX_UPLOAD_BYTES) return json({ error: 'too-large' }, 413);

  await env.R2_UPLOADS.put(verified.filename, buf, {
    httpMetadata: { contentType: verified.contentType, cacheControl: 'public, max-age=31536000, immutable' },
  });

  const { loadConfig } = await import('../lib/config');
  const config = await loadConfig(env);
  const publicUrl = (config.r2.publicBaseUrl || '').replace(/\/+$/, '') + '/' + verified.filename;
  return json({ ok: true, key: verified.filename, publicUrl });
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'file';
}

function cryptoRandom(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
