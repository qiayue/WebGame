import type { Env, PageDetail, PageIndex, PageIndexEntry, PageType, SiteConfig } from '../types';
import { commitFiles, deleteFile, getFile, ghClient } from '../lib/github';
import { loadConfig } from '../lib/config';
import { readSession, signUploadToken, verifyUploadToken } from './auth';

// ---------------------------------------------------------------------------
// Admin API
//
// All endpoints (except token-only upload) require a valid session cookie
// AND a CSRF token header (the session cookie alone is insufficient for
// state-changing requests).
//
// Routes:
//   GET    /admin/api/site                       — read site config
//   PUT    /admin/api/site                       — save site config
//   GET    /admin/api/index                      — read content index
//   GET    /admin/api/page/:type/:lang/:slug     — read a page detail
//   PUT    /admin/api/page                       — save a page (body has all fields)
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

  // CSRF: any non-GET requires the X-CSRF-Token header. We use the session
  // cookie itself (the signed part is opaque to JS-side script but stored in
  // a same-origin httpOnly cookie; we expose a separate readable token).
  // Simplification: rely on SameSite=Strict + same-origin only. Still enforce
  // the header to prevent simple forms.
  if (method !== 'GET' && req.headers.get(CSRF_HEADER) !== '1') {
    return json({ error: 'csrf' }, 403);
  }

  try {
    // Upload endpoints
    if (path === '/upload-token' && method === 'POST') return await handleUploadToken(req, env);
    if (path === '/upload' && method === 'PUT') return await handleUpload(req, env);

    // Site config
    if (path === '/site' && method === 'GET') return await handleGetSite(env);
    if (path === '/site' && method === 'PUT') return await handleSaveSite(req, env);

    // Content index
    if (path === '/index' && method === 'GET') return await handleGetIndex(env);

    // Pages
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
// Site config
// ---------------------------------------------------------------------------

async function handleGetSite(env: Env): Promise<Response> {
  const c = ghClient(await loadConfig(env));
  const file = await getFile(c, 'content/site.json');
  if (!file) return json({ error: 'missing' }, 404);
  return new Response(file.text, { headers: { 'content-type': 'application/json' } });
}

async function handleSaveSite(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as SiteConfig;
  if (!body || typeof body !== 'object') return json({ error: 'bad-body' }, 400);
  const text = JSON.stringify(body, null, 2) + '\n';
  const c = ghClient(await loadConfig(env));
  await commitFiles(c, [{ path: 'content/site.json', text }], 'chore(content): update site config');
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Content index
// ---------------------------------------------------------------------------

async function handleGetIndex(env: Env): Promise<Response> {
  const c = ghClient(await loadConfig(env));
  const file = await getFile(c, 'content/index.json');
  if (!file) return json({ entries: [], generatedAt: new Date().toISOString() });
  return new Response(file.text, { headers: { 'content-type': 'application/json' } });
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

function pagePath(type: PageType, lang: string, slug: string): string {
  if (type === 'home') return `content/pages/home/${lang}.json`;
  const prefix = type === 'game' ? 'g' : type === 'guide' ? 'p' : 't';
  return `content/pages/${prefix}/${lang}/${slug}.json`;
}

async function handleGetPage(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<Response> {
  const c = ghClient(await loadConfig(env));
  const file = await getFile(c, pagePath(type, lang, slug));
  if (!file) return json({ error: 'not-found' }, 404);
  return new Response(file.text, { headers: { 'content-type': 'application/json' } });
}

async function handleSavePage(req: Request, env: Env): Promise<Response> {
  const page = (await req.json()) as PageDetail;
  if (!page || !page.type || !page.lang || !page.slug) {
    return json({ error: 'bad-body' }, 400);
  }
  page.updatedAt = new Date().toISOString();
  if (!page.publishedAt) page.publishedAt = page.updatedAt;

  const filePath = pagePath(page.type, page.lang, page.slug);
  const text = JSON.stringify(page, null, 2) + '\n';

  // Rebuild the index entry for this page.
  const c = ghClient(await loadConfig(env));
  const indexFile = await getFile(c, 'content/index.json');
  const index: PageIndex = indexFile
    ? (JSON.parse(indexFile.text) as PageIndex)
    : { generatedAt: new Date().toISOString(), entries: [] };

  const newEntry: PageIndexEntry = {
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
  const otherEntries = index.entries.filter(
    (e) => !(e.type === page.type && e.lang === page.lang && e.slug === page.slug),
  );
  const nextIndex: PageIndex = {
    generatedAt: new Date().toISOString(),
    entries: [...otherEntries, newEntry].sort((a, b) =>
      a.publishedAt < b.publishedAt ? 1 : -1,
    ),
  };

  // Also update the file registry shim (content/_page-files.ts) so the
  // Worker can find the new file at runtime.
  const registryText = buildPageFilesRegistry(nextIndex);

  await commitFiles(
    c,
    [
      { path: filePath, text },
      { path: 'content/index.json', text: JSON.stringify(nextIndex, null, 2) + '\n' },
      { path: 'content/_page-files.ts', text: registryText },
    ],
    `chore(content): update ${page.type} ${page.lang}/${page.slug}`,
  );

  return json({ ok: true });
}

async function handleDeletePage(
  env: Env,
  type: PageType,
  lang: string,
  slug: string,
): Promise<Response> {
  const c = ghClient(await loadConfig(env));
  const indexFile = await getFile(c, 'content/index.json');
  const index: PageIndex = indexFile
    ? (JSON.parse(indexFile.text) as PageIndex)
    : { generatedAt: new Date().toISOString(), entries: [] };
  const nextIndex: PageIndex = {
    generatedAt: new Date().toISOString(),
    entries: index.entries.filter(
      (e) => !(e.type === type && e.lang === lang && e.slug === slug),
    ),
  };

  const registryText = buildPageFilesRegistry(nextIndex);

  // GitHub API: we can DELETE via /contents, but to keep things atomic we
  // commit the index update and the registry update, leaving the file behind
  // is harmless (it's orphaned). Easiest robust thing: use DELETE for the
  // file separately.
  await commitFiles(
    c,
    [
      { path: 'content/index.json', text: JSON.stringify(nextIndex, null, 2) + '\n' },
      { path: 'content/_page-files.ts', text: registryText },
    ],
    `chore(content): delete ${type} ${lang}/${slug}`,
  );

  try {
    await deleteFile(c, pagePath(type, lang, slug));
  } catch {
    // Orphaned file — harmless, surfaces in the next save.
  }
  return json({ ok: true });
}

// ---------------------------------------------------------------------------
// Page file registry rebuild.
//
// The runtime resolves pages via the content/_page-files.ts module so the
// bundler can include them statically. After save/delete we regenerate it.
// ---------------------------------------------------------------------------

function buildPageFilesRegistry(index: PageIndex): string {
  const set = new Map<string, { key: string; importPath: string }>();
  for (const e of index.entries) {
    const importPath = relImportPath(e.type, e.lang, e.slug);
    const key = `${e.type}/${e.lang}/${e.slug}`;
    set.set(key, { key, importPath });
  }
  const entries = [...set.values()].sort((a, b) => a.key.localeCompare(b.key));
  const lines: string[] = [
    '// AUTO-GENERATED by the admin on save. Do not edit by hand.',
    '/* eslint-disable */',
  ];
  entries.forEach((e, i) => {
    lines.push(`import p${i} from './pages/${e.importPath}';`);
  });
  lines.push('');
  lines.push('const files: Record<string, unknown> = {');
  entries.forEach((e, i) => {
    lines.push(`  ${JSON.stringify(e.key)}: p${i},`);
  });
  lines.push('};');
  lines.push('');
  lines.push('export default files;');
  return lines.join('\n') + '\n';
}

function relImportPath(type: PageType, lang: string, slug: string): string {
  if (type === 'home') return `home/${lang}.json`;
  const prefix = type === 'game' ? 'g' : type === 'guide' ? 'p' : 't';
  return `${prefix}/${lang}/${slug}.json`;
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

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
