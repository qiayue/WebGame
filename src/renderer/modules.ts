import type {
  GameIframeModule,
  PageDetail,
  PageIndex,
  PageIndexEntry,
  PageListModule,
  PageModule,
  SeoContentModule,
  SiteConfig,
  UiStrings,
  VideoIframeModule,
} from '../types';
import { listPages, listRelated } from '../lib/content';
import { escapeAttr, escapeHtml, html, raw, type SafeHtml } from '../lib/html';
import { pagePath } from '../lib/url';

export interface RenderCtx {
  site: SiteConfig;
  page: PageDetail;
  ui: UiStrings;
  index: PageIndex;
}

export function renderModules(ctx: RenderCtx): SafeHtml {
  const parts: string[] = [];
  for (const m of ctx.page.modules) {
    parts.push(renderModule(m, ctx).value);
  }
  return raw(parts.join(''));
}

function renderModule(m: PageModule, ctx: RenderCtx): SafeHtml {
  switch (m.type) {
    case 'game-iframe':
      return renderGameIframe(m, ctx);
    case 'video-iframe':
      return renderVideoIframe(m, ctx);
    case 'page-list':
      return renderPageList(m, ctx);
    case 'seo-content':
      return renderSeoContent(m, ctx);
  }
}

// ---------------------------------------------------------------------------
// Game iframe — splash + click-to-play. The iframe URL is present in the
// rendered HTML (in a data attribute and noscript fallback) so crawlers can
// associate the page with the game URL.
// ---------------------------------------------------------------------------

function renderGameIframe(m: GameIframeModule, ctx: RenderCtx): SafeHtml {
  const ratio = m.ratio ?? '16:9';
  const ratioClass = ratioToClass(ratio);
  const cover = m.cover ?? ctx.page.cover ?? '';
  const label = m.playLabel ?? ctx.ui.playNow;
  const fullscreen = m.fullscreen !== false;
  const title = escapeAttr(ctx.page.title);

  return html`
    <section class="bg-slate-900">
      <div class="container-page py-4 sm:py-6">
        <div
          class="relative w-full overflow-hidden rounded-xl bg-black ${ratioClass}"
          data-game-frame
          data-src="${escapeAttr(m.url)}"
          data-title="${title}"
          data-loading-label="${escapeAttr(ctx.ui.loadingGame)}"
        >
          <div class="absolute inset-0 flex items-center justify-center" data-splash>
            ${cover
              ? html`<img src="${cover}" alt="${title}" loading="eager" decoding="async" class="absolute inset-0 h-full w-full object-cover"/>`
              : ''}
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
            <button
              type="button"
              data-play
              class="relative z-10 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-brand-700"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6V4z"/></svg>
              ${label}
            </button>
          </div>
          ${fullscreen
            ? html`<button type="button" data-fullscreen class="absolute right-3 top-3 z-20 hidden rounded-md bg-black/50 p-2 text-white hover:bg-black/70" aria-label="${escapeAttr(ctx.ui.fullscreen)}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>
              </button>`
            : ''}
        </div>
        <noscript>
          <iframe src="${escapeAttr(m.url)}" title="${title}" class="mt-3 h-[60vh] w-full rounded-xl border-0" allow="autoplay; fullscreen; gamepad *;" loading="lazy"></iframe>
        </noscript>
        <link rel="preconnect" href="${escapeAttr(safeOrigin(m.url))}"/>
      </div>
    </section>
  `;
}

function renderVideoIframe(m: VideoIframeModule, ctx: RenderCtx): SafeHtml {
  const ratio = m.ratio ?? '16:9';
  const ratioClass = ratioToClass(ratio);
  const cover = m.cover ?? ctx.page.cover ?? '';
  const label = ctx.ui.watchVideo;
  const title = escapeAttr(m.title ?? ctx.page.title);

  return html`
    <section class="bg-slate-900">
      <div class="container-page py-4 sm:py-6">
        <div
          class="relative w-full overflow-hidden rounded-xl bg-black ${ratioClass}"
          data-video-frame
          data-src="${escapeAttr(m.url)}"
          data-title="${title}"
        >
          <div class="absolute inset-0 flex items-center justify-center" data-splash>
            ${cover
              ? html`<img src="${cover}" alt="${title}" loading="eager" decoding="async" class="absolute inset-0 h-full w-full object-cover"/>`
              : ''}
            <div class="absolute inset-0 bg-black/40"></div>
            <button type="button" data-play class="relative z-10 inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-red-700">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4l10 6-10 6V4z"/></svg>
              ${label}
            </button>
          </div>
        </div>
        <noscript>
          <iframe src="${escapeAttr(m.url)}" title="${title}" class="mt-3 aspect-video w-full rounded-xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </noscript>
      </div>
    </section>
  `;
}

function ratioToClass(r: string): string {
  switch (r) {
    case '4:3':
      return 'aspect-[4/3]';
    case '1:1':
      return 'aspect-square';
    case '9:16':
      return 'aspect-[9/16] max-w-sm mx-auto';
    case '16:9':
    default:
      return 'aspect-video';
  }
}

function safeOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Page list
// ---------------------------------------------------------------------------

function renderPageList(m: PageListModule, ctx: RenderCtx): SafeHtml {
  const entries = resolveListEntries(m, ctx);
  if (entries.length === 0) return raw('');

  const layout = m.layout ?? 'grid';
  const heading = m.heading ?? defaultListHeading(m, ctx);

  const items = entries.map((e) => renderCard(e, ctx)).join('');
  const wrapperCls =
    layout === 'list'
      ? 'flex flex-col gap-3'
      : layout === 'carousel'
      ? 'flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4'
      : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4';

  return html`
    <section class="container-page py-8 sm:py-10">
      ${heading ? html`<h2 class="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 mb-4">${heading}</h2>` : ''}
      <div class="${wrapperCls}">
        ${raw(items)}
      </div>
    </section>
  `;
}

function defaultListHeading(m: PageListModule, ctx: RenderCtx): string {
  if (m.source === 'related') return ctx.ui.relatedGames;
  if (m.source === 'latest') return ctx.ui.latestGames;
  if (m.source === 'tag') return ctx.ui.taggedWith;
  return '';
}

function resolveListEntries(m: PageListModule, ctx: RenderCtx): PageIndexEntry[] {
  const { page, index } = ctx;
  const limit = m.limit ?? 12;
  switch (m.source) {
    case 'latest':
      return listPages(index, {
        lang: page.lang,
        type: m.filter?.type ?? 'game',
        limit,
        excludeSlug: page.slug,
        excludeType: page.type,
      });
    case 'related':
      return listRelated(index, page, { limit, type: m.filter?.type });
    case 'tag': {
      const tag = m.filter?.tag ?? page.tagSlug ?? (page.type === 'tag' ? page.slug : undefined);
      if (!tag) return [];
      return listPages(index, {
        lang: page.lang,
        type: m.filter?.type,
        tag,
        limit,
        excludeSlug: page.slug,
        excludeType: page.type,
      });
    }
    case 'manual': {
      if (!m.manual?.length) return [];
      const out: PageIndexEntry[] = [];
      const idx = listPages(index, { lang: page.lang, limit: 0 });
      const seen = new Map(idx.map((e) => [`${e.type}/${e.slug}`, e]));
      for (const ref of m.manual) {
        const e = seen.get(`${ref.type}/${ref.slug}`);
        if (e) out.push(e);
      }
      return limit > 0 ? out.slice(0, limit) : out;
    }
  }
}

function renderCard(e: PageIndexEntry, ctx: RenderCtx): string {
  const href = pagePath(ctx.site, e.type, e.lang, e.slug);
  const cover = e.cover ?? '';
  const title = e.title;
  return `<a href="${escapeAttr(href)}" class="group card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md snap-start min-w-[170px]">
    <div class="aspect-[4/3] bg-slate-100 overflow-hidden">
      ${cover ? `<img src="${escapeAttr(cover)}" alt="${escapeAttr(title)}" loading="lazy" decoding="async" class="h-full w-full object-cover transition group-hover:scale-105"/>` : ''}
    </div>
    <div class="p-3">
      <h3 class="text-sm font-medium text-slate-900 line-clamp-2">${escapeHtml(title)}</h3>
    </div>
  </a>`;
}

// ---------------------------------------------------------------------------
// SEO content
// ---------------------------------------------------------------------------

function renderSeoContent(m: SeoContentModule, ctx: RenderCtx): SafeHtml {
  switch (m.variant) {
    case 'intro':
      return html`
        <section class="container-page py-8 sm:py-10">
          ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4">${m.heading}</h2>` : ''}
          <div class="prose-seo prose">${raw(renderMarkdownLite(m.body))}</div>
        </section>
      `;
    case 'rich-text':
      return html`
        <section class="container-page py-8 sm:py-10">
          <div class="prose-seo prose">${raw(renderMarkdownLite(m.body))}</div>
        </section>
      `;
    case 'features-grid':
      return html`
        <section class="container-page py-8 sm:py-10">
          ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">${m.heading}</h2>` : ''}
          ${m.intro ? html`<p class="text-slate-600 max-w-2xl mb-6">${m.intro}</p>` : ''}
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            ${raw(
              m.items
                .map(
                  (it) => `<div class="card p-5">
                    ${it.icon ? `<div class="text-3xl mb-3">${escapeHtml(it.icon)}</div>` : ''}
                    <h3 class="font-semibold text-slate-900 mb-1">${escapeHtml(it.title)}</h3>
                    <p class="text-slate-600 text-sm leading-relaxed">${escapeHtml(it.body)}</p>
                  </div>`,
                )
                .join(''),
            )}
          </div>
        </section>
      `;
    case 'steps':
      return html`
        <section class="container-page py-8 sm:py-10">
          ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">${m.heading}</h2>` : ''}
          ${m.intro ? html`<p class="text-slate-600 max-w-2xl mb-6">${m.intro}</p>` : ''}
          <ol class="space-y-4">
            ${raw(
              m.items
                .map(
                  (it, i) => `<li class="flex gap-4">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold">${i + 1}</div>
                    <div>
                      <h3 class="font-semibold text-slate-900">${escapeHtml(it.title)}</h3>
                      <p class="text-slate-600 mt-1">${escapeHtml(it.body)}</p>
                    </div>
                  </li>`,
                )
                .join(''),
            )}
          </ol>
        </section>
      `;
    case 'screenshots':
      return html`
        <section class="container-page py-8 sm:py-10">
          ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4">${m.heading}</h2>` : ''}
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            ${raw(
              m.images
                .map(
                  (img) => `<figure class="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img src="${escapeAttr(img.url)}" alt="${escapeAttr(img.alt)}" loading="lazy" decoding="async" class="aspect-video w-full object-cover"/>
                    ${img.caption ? `<figcaption class="px-2 py-1 text-xs text-slate-500">${escapeHtml(img.caption)}</figcaption>` : ''}
                  </figure>`,
                )
                .join(''),
            )}
          </div>
        </section>
      `;
    case 'pros-cons':
      return html`
        <section class="container-page py-8 sm:py-10">
          ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4">${m.heading}</h2>` : ''}
          <div class="grid sm:grid-cols-2 gap-4">
            <div class="card p-5">
              <h3 class="font-semibold text-emerald-700 mb-3">${ctx.ui.pros}</h3>
              <ul class="space-y-2 text-slate-700">
                ${raw(m.pros.map((p) => `<li class="flex gap-2"><span class="text-emerald-500">✓</span><span>${escapeHtml(p)}</span></li>`).join(''))}
              </ul>
            </div>
            <div class="card p-5">
              <h3 class="font-semibold text-rose-700 mb-3">${ctx.ui.cons}</h3>
              <ul class="space-y-2 text-slate-700">
                ${raw(m.cons.map((p) => `<li class="flex gap-2"><span class="text-rose-500">✗</span><span>${escapeHtml(p)}</span></li>`).join(''))}
              </ul>
            </div>
          </div>
        </section>
      `;
    case 'faq':
      return html`
        <section class="container-page py-8 sm:py-10">
          <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-4">${m.heading ?? ctx.ui.faq}</h2>
          <div class="space-y-2">
            ${raw(
              m.items
                .map(
                  (it) => `<details class="card p-4 group">
                    <summary class="flex cursor-pointer items-center justify-between gap-3 font-medium text-slate-900">
                      <span>${escapeHtml(it.q)}</span>
                      <svg class="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor"><path d="M5 7l5 6 5-6H5z"/></svg>
                    </summary>
                    <div class="prose-seo prose mt-3 text-slate-700">${renderMarkdownLite(it.a)}</div>
                  </details>`,
                )
                .join(''),
            )}
          </div>
        </section>
      `;
    case 'text-image': {
      const order = m.reverse ? 'md:flex-row-reverse' : 'md:flex-row';
      return html`
        <section class="container-page py-8 sm:py-10">
          <div class="flex flex-col ${order} gap-6 md:gap-10 items-center">
            <div class="md:w-1/2">
              ${m.heading ? html`<h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">${m.heading}</h2>` : ''}
              <div class="prose-seo prose">${raw(renderMarkdownLite(m.body))}</div>
            </div>
            <div class="md:w-1/2">
              <img src="${escapeAttr(m.image.url)}" alt="${escapeAttr(m.image.alt)}" loading="lazy" decoding="async" class="w-full rounded-xl border border-slate-200 shadow-sm"/>
            </div>
          </div>
        </section>
      `;
    }
  }
}

// ---------------------------------------------------------------------------
// Tiny, conservative Markdown renderer — supports headings, bold, italic,
// inline code, links, and paragraph/line breaks. Output is sanitized.
// ---------------------------------------------------------------------------

function renderMarkdownLite(src: string): string {
  const escaped = escapeHtml(src);
  const lines = escaped.split('\n');
  const out: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(' '))}</p>`);
      paragraph = [];
    }
  };

  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flush();
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) {
      flush();
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      const level = h[1]!.length;
      out.push(`<h${level}>${inline(h[2]!)}</h${level}>`);
      continue;
    }
    const li = /^[-*]\s+(.*)$/.exec(trimmed);
    if (li) {
      flush();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(li[1]!)}</li>`);
      continue;
    }
    paragraph.push(trimmed);
  }
  flush();
  if (inList) out.push('</ul>');
  return out.join('');
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_m, text, url) =>
        `<a href="${url.replace(/"/g, '&quot;')}" rel="noopener" target="_blank">${text}</a>`,
    );
}
