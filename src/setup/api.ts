import type { Env } from '../types';
import {
  hashPassword,
  invalidateConfigCache,
  loadConfig,
  randomSecret,
  saveConfig,
  type RuntimeConfig,
} from '../lib/config';
import { ghClient, testConnection } from '../lib/github';
import { readSession, createSessionCookie } from '../admin/auth';

// ---------------------------------------------------------------------------
// /setup/* endpoints.
//
// While `config.setupCompleted` is false, all setup endpoints are unauthed —
// the first visitor finishes setup. Once setup is complete, the wizard
// requires an authenticated admin session to re-enter (e.g. to rotate the
// GitHub token).
// ---------------------------------------------------------------------------

export async function handleSetupApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/setup\/api/, '') || '/';
  const method = req.method.toUpperCase();

  const config = await loadConfig(env);
  const isBootstrap = !config.setupCompleted;

  // Auth rules:
  //   - /status: always open (the SPA reads it on load).
  //   - /password: open ONLY if no admin password has ever been set;
  //     otherwise require a valid session.
  //   - everything else: requires a valid session (which is auto-issued
  //     when the password is first set).
  const isStatus = path === '/status';
  const isFirstPasswordSet = path === '/password' && !config.adminPasswordHash;
  if (!isStatus && !isFirstPasswordSet) {
    const session = await readSession(env, req);
    if (!session) return json({ error: 'unauthorized' }, 401);
  }

  try {
    if (path === '/status' && method === 'GET') return await handleStatus(env);
    if (path === '/password' && method === 'POST') return await handleSetPassword(req, env, config, isBootstrap);
    if (path === '/github' && method === 'POST') return await handleSetGithub(req, env, config);
    if (path === '/github/test' && method === 'POST') return await handleTestGithub(req, env);
    if (path === '/r2' && method === 'POST') return await handleSetR2(req, env, config);
    if (path === '/r2/test' && method === 'POST') return await handleTestR2(req, env);
    if (path === '/finish' && method === 'POST') return await handleFinish(req, env, config);
    return json({ error: 'not-found' }, 404);
  } catch (e) {
    console.error('setup api error:', e);
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: 'internal', message }, 500);
  }
}

// ---------------------------------------------------------------------------

async function handleStatus(env: Env): Promise<Response> {
  const c = await loadConfig(env);
  return json({
    setupCompleted: c.setupCompleted,
    hasPassword: !!c.adminPasswordHash,
    hasGithub: !!c.github.token && !!c.github.repo,
    hasR2Public: !!c.r2.publicBaseUrl,
    github: { repo: c.github.repo, branch: c.github.branch },
    r2: { publicBaseUrl: c.r2.publicBaseUrl },
  });
}

async function handleSetPassword(
  req: Request,
  env: Env,
  config: RuntimeConfig,
  isBootstrap: boolean,
): Promise<Response> {
  const body = (await req.json()) as { password?: string };
  const pw = body.password ?? '';
  if (pw.length < 8) return json({ error: 'password too short (min 8 chars)' }, 400);

  const next: RuntimeConfig = {
    ...config,
    adminPasswordHash: await hashPassword(pw),
    sessionSecret: config.sessionSecret || randomSecret(32),
    uploadSecret: config.uploadSecret || randomSecret(32),
  };
  await saveConfig(env, next);

  // On first-time setup, issue a session immediately so the rest of the
  // wizard is authenticated.
  if (isBootstrap) {
    invalidateConfigCache();
    const secure = new URL(req.url).protocol === 'https:';
    const cookie = await createSessionCookie(env, { secure });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'Set-Cookie': cookie },
    });
  }
  return json({ ok: true });
}

async function handleSetGithub(
  req: Request,
  env: Env,
  config: RuntimeConfig,
): Promise<Response> {
  const body = (await req.json()) as { repo?: string; branch?: string; token?: string };
  const repo = (body.repo ?? '').trim();
  const branch = (body.branch ?? 'main').trim();
  const token = (body.token ?? '').trim();
  if (!repo.includes('/')) return json({ error: 'repo must look like owner/name' }, 400);
  if (!token) return json({ error: 'token is required' }, 400);

  const test = await testConnection({ repo, branch, token });
  if (!test.ok) return json({ error: test.error }, 400);

  const next: RuntimeConfig = {
    ...config,
    github: { repo, branch, token },
  };
  await saveConfig(env, next);
  return json({ ok: true });
}

async function handleTestGithub(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { repo?: string; branch?: string; token?: string };
  const result = await testConnection({
    repo: (body.repo ?? '').trim(),
    branch: (body.branch ?? 'main').trim(),
    token: (body.token ?? '').trim(),
  });
  return json(result);
}

async function handleSetR2(req: Request, env: Env, config: RuntimeConfig): Promise<Response> {
  const body = (await req.json()) as { publicBaseUrl?: string };
  const url = (body.publicBaseUrl ?? '').trim().replace(/\/+$/, '');
  if (!url) return json({ error: 'publicBaseUrl is required' }, 400);
  try {
    new URL(url);
  } catch {
    return json({ error: 'publicBaseUrl is not a valid URL' }, 400);
  }
  const next: RuntimeConfig = { ...config, r2: { publicBaseUrl: url } };
  await saveConfig(env, next);
  return json({ ok: true });
}

async function handleTestR2(req: Request, env: Env): Promise<Response> {
  const body = (await req.json()) as { publicBaseUrl?: string };
  const baseUrl = (body.publicBaseUrl ?? '').trim().replace(/\/+$/, '');
  if (!baseUrl) return json({ ok: false, error: 'publicBaseUrl is required' }, 400);

  const key = `_health/setup-${Date.now()}.txt`;
  const probe = `webgame-template-setup-probe ${Date.now()}`;
  await env.R2_UPLOADS.put(key, probe, {
    httpMetadata: { contentType: 'text/plain', cacheControl: 'no-store' },
  });

  let publicReachable = false;
  let fetchError: string | undefined;
  try {
    const res = await fetch(`${baseUrl}/${key}`, { cf: { cacheTtl: 0 } });
    if (res.ok) {
      const text = await res.text();
      publicReachable = text.trim() === probe;
    } else {
      fetchError = `HTTP ${res.status}`;
    }
  } catch (e) {
    fetchError = e instanceof Error ? e.message : String(e);
  } finally {
    try { await env.R2_UPLOADS.delete(key); } catch { /* ignore */ }
  }

  if (publicReachable) return json({ ok: true });
  return json({
    ok: false,
    error:
      'The R2 bucket accepted the upload, but the file could not be fetched from the public URL. ' +
      (fetchError ? `Reason: ${fetchError}. ` : '') +
      'Double-check that public access is enabled (custom domain or r2.dev) and the URL is correct.',
  });
}

async function handleFinish(_req: Request, env: Env, config: RuntimeConfig): Promise<Response> {
  if (!config.adminPasswordHash) return json({ error: 'password not set' }, 400);
  if (!config.github.token || !config.github.repo) return json({ error: 'github not set' }, 400);
  if (!config.r2.publicBaseUrl) return json({ error: 'r2 public url not set' }, 400);
  const next: RuntimeConfig = { ...config, setupCompleted: true };
  await saveConfig(env, next);
  return json({ ok: true });
}

// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
