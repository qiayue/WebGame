import type { PageIndex, SiteConfig, UiStrings } from '../types';
import { renderLayout } from './layout';
import { html, raw } from '../lib/html';
import { pagePath } from '../lib/url';

export function renderNotFound(
  site: SiteConfig,
  ui: UiStrings,
  lang: string,
  index: PageIndex,
): string {
  const homeHref = pagePath(site, 'home', lang, 'home');
  const fakePage = {
    type: 'home' as const,
    lang,
    slug: 'home',
    title: 'Not Found',
    tags: [],
    publishedAt: '',
    updatedAt: '',
    modules: [],
  };
  const body = html`
    <section class="container-page py-20 text-center">
      <p class="text-7xl font-bold text-brand-600">404</p>
      <h1 class="mt-4 text-3xl font-bold text-slate-900">Page not found</h1>
      <p class="mt-2 text-slate-600">The page you're looking for doesn't exist.</p>
      <a class="btn-primary mt-6" href="${homeHref}">${ui.home}</a>
    </section>
  `;
  return renderLayout({
    site,
    page: fakePage,
    ui,
    origin: '',
    head: raw('<title>404 — Not Found</title><meta name="robots" content="noindex"/>'),
    body,
    index,
  });
}
