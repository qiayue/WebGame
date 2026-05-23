import type { Env } from './types';
import { loadIndex, loadPage, loadSite, loadUi } from './lib/store';
import { loadConfig } from './lib/config';
import { parsePath, redirectForDefaultLang } from './lib/url';
import { buildRobots, buildSitemap } from './lib/seo';
import { renderPage } from './renderer/page';
import { renderNotFound } from './renderer/notFound';
import { handleAdminApi } from './admin/api';
import { handleLogin, handleLogout } from './admin/login';
import { renderAdminShell } from './admin/ui';
import { handleSetupApi } from './setup/api';
import { renderSetupShell } from './setup/ui';

export async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  const origin = url.origin;

  // Static assets (CSS, JS, favicon).
  if (path.startsWith('/assets/') || path === '/favicon.ico') {
    return env.ASSETS.fetch(req);
  }

  // Setup wizard is always reachable.
  if (path === '/setup' || path === '/setup/') return renderSetupShell(env, req);
  if (path.startsWith('/setup/api/')) return handleSetupApi(req, env);

  // If the site isn't configured yet, redirect everything else to /setup.
  const config = await loadConfig(env);
  if (!config.setupCompleted) {
    return Response.redirect(origin + '/setup', 302);
  }

  // Robots / sitemap.
  if (path === '/robots.txt') {
    return new Response(buildRobots(origin), {
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
    });
  }
  if (path === '/sitemap.xml') {
    const [site, idx] = await Promise.all([loadSite(env), loadIndex(env)]);
    return new Response(buildSitemap(site, idx.entries, origin), {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=600' },
    });
  }

  // Admin.
  if (path === '/admin' || path === '/admin/') return renderAdminShell(env, req);
  if (path === '/admin/login') return handleLogin(req, env);
  if (path === '/admin/logout') return handleLogout(req, env);
  if (path.startsWith('/admin/api/')) return handleAdminApi(req, env);

  // Public site pages.
  const site = await loadSite(env);

  const redirectTarget = redirectForDefaultLang(site, path);
  if (redirectTarget !== null) {
    return Response.redirect(origin + redirectTarget + url.search, 301);
  }

  const parsed = parsePath(site, path);
  const [index, ui] = await Promise.all([
    loadIndex(env),
    loadUi(env, parsed?.lang ?? site.defaultLang),
  ]);

  if (!parsed) {
    return new Response(renderNotFound(site, ui, site.defaultLang, index), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const page = await loadPage(env, parsed.type, parsed.lang, parsed.slug);
  if (!page) {
    return new Response(renderNotFound(site, ui, parsed.lang, index), {
      status: 404,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const html = renderPage({ site, page, ui, origin, index });
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300',
    },
  });
}
