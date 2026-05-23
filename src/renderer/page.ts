import type { PageDetail, PageIndex, SiteConfig, UiStrings } from '../types';
import { html, raw } from '../lib/html';
import { renderMeta, renderJsonLd } from '../lib/seo';
import { renderLayout } from './layout';
import { renderModules } from './modules';
import { pagePath } from '../lib/url';

export interface RenderPageInput {
  site: SiteConfig;
  page: PageDetail;
  ui: UiStrings;
  origin: string;
  index: PageIndex;
}

export function renderPage(input: RenderPageInput): string {
  const { site, page, ui, origin, index } = input;

  const head = html`
    ${renderMeta({ site, page, origin, index })}
    ${renderJsonLd({ site, page, origin, index })}
    ${renderBreadcrumbJsonLd(input)}
  `;

  const breadcrumb = renderBreadcrumb(input);
  const header = renderPageHeader(input);
  const body = html`
    ${header}
    ${breadcrumb}
    ${renderModules({ site, page, ui, index })}
  `;

  return renderLayout({ site, page, ui, origin, head, body, index });
}

function renderPageHeader(input: RenderPageInput) {
  const { page } = input;
  // The h1 is intentionally placed in a small banner above modules so it
  // always appears in the rendered HTML, regardless of which modules are
  // configured. The game iframe module is rendered separately above this
  // for game pages — but the h1 always exists for SEO.
  if (page.type === 'home') {
    return html``;
  }
  return html`
    <section class="container-page pt-6 sm:pt-8">
      <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
        ${page.title}
      </h1>
      ${page.description
        ? html`<p class="mt-2 text-slate-600 max-w-3xl">${page.description}</p>`
        : ''}
      ${page.tags?.length
        ? html`<div class="mt-3 flex flex-wrap gap-2">
            ${raw(
              page.tags
                .map(
                  (t) =>
                    `<a href="${escAttr(pagePath(input.site, 'tag', page.lang, t))}" class="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 hover:bg-brand-100">#${escText(t)}</a>`,
                )
                .join(''),
            )}
          </div>`
        : ''}
    </section>
  `;
}

function renderBreadcrumb(input: RenderPageInput) {
  const { site, page } = input;
  if (page.type === 'home') return html``;
  const homeHref = pagePath(site, 'home', page.lang, 'home');
  return html`
    <nav class="container-page pt-3 text-xs text-slate-500" aria-label="Breadcrumb">
      <ol class="flex flex-wrap items-center gap-1">
        <li><a class="hover:text-slate-700" href="${homeHref}">${input.ui.home}</a></li>
        <li aria-hidden="true">›</li>
        <li class="text-slate-700">${page.title}</li>
      </ol>
    </nav>
  `;
}

function renderBreadcrumbJsonLd(input: RenderPageInput) {
  const { site, page, origin } = input;
  if (page.type === 'home') return raw('');
  const homeUrl = origin + pagePath(site, 'home', page.lang, 'home');
  const selfUrl = origin + pagePath(site, page.type, page.lang, page.slug);
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: input.ui.home, item: homeUrl },
      { '@type': 'ListItem', position: 2, name: page.title, item: selfUrl },
    ],
  };
  return raw(
    `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
  );
}

function escText(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(input: unknown): string {
  return escText(input).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
