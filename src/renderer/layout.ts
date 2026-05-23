import type { PageDetail, PageIndex, SiteConfig, UiStrings } from '../types';
import { findAlternates } from '../lib/content';
import { html, raw, type SafeHtml } from '../lib/html';
import { pagePath } from '../lib/url';

export interface LayoutProps {
  site: SiteConfig;
  page: PageDetail;
  ui: UiStrings;
  origin: string;
  head: SafeHtml;
  body: SafeHtml;
  index: PageIndex;
}

export function renderLayout(p: LayoutProps): string {
  const { site, page, ui, head, body } = p;
  const htmlLang =
    site.languages.find((l) => l.code === page.lang)?.htmlLang ?? page.lang;

  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="generator" content="webgame-template"/>
<link rel="stylesheet" href="/assets/app.css"/>
${head.value}
${site.adsense?.clientId
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      site.adsense.clientId,
    )}" crossorigin="anonymous"></script>`
  : ''}
${site.analytics?.googleAnalyticsId
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      site.analytics.googleAnalyticsId,
    )}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${encodeURIComponent(
      site.analytics.googleAnalyticsId,
    )}');</script>`
  : ''}
</head>
<body class="min-h-screen flex flex-col">
${renderHeader(p).value}
<main class="flex-1">${body.value}</main>
${renderFooter(p).value}
<script src="/assets/play.js" defer></script>
</body>
</html>`;
}

function renderHeader(p: LayoutProps): SafeHtml {
  const { site, page, ui } = p;
  const homeHref = pagePath(site, 'home', page.lang, 'home');
  const menu = site.menu.filter((m) => m.lang === page.lang);
  const langSwitch = renderLangSwitcher(p);

  return html`
    <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div class="container-page flex h-14 items-center gap-4">
        <a href="${homeHref}" class="flex items-center gap-2 font-semibold text-slate-900">
          <span class="inline-block h-6 w-6 rounded-md bg-brand-600"></span>
          <span>${site.name}</span>
        </a>
        <nav class="hidden md:flex items-center gap-1 ml-4">
          ${raw(
            menu
              .map(
                (m) =>
                  `<a class="btn-ghost" href="${escAttr(m.url)}">${escText(m.label)}</a>`,
              )
              .join(''),
          )}
        </nav>
        <div class="ml-auto flex items-center gap-2">
          ${langSwitch}
        </div>
      </div>
    </header>
  `;
}

function renderLangSwitcher(p: LayoutProps): SafeHtml {
  const { site, page } = p;
  // Languages available for this specific page (including current).
  const currentEntry = {
    type: page.type,
    lang: page.lang,
    slug: page.slug,
  };
  const others = findAlternates(p.index, page.alternateKey, page.lang);
  const all = [currentEntry, ...others.map((o) => ({ type: o.type, lang: o.lang, slug: o.slug }))];

  if (all.length <= 1) return raw('');

  const items = all
    .map((e) => {
      const lang = site.languages.find((l) => l.code === e.lang);
      const label = lang?.label ?? e.lang;
      const href = pagePath(site, e.type, e.lang, e.slug);
      const active = e.lang === page.lang;
      return `<a href="${escAttr(href)}" class="px-2 py-1 text-sm rounded hover:bg-slate-100 ${active ? 'font-semibold text-brand-700' : 'text-slate-600'}">${escText(label)}</a>`;
    })
    .join('');

  return raw(
    `<div class="flex items-center gap-1 border-l border-slate-200 pl-2">${items}</div>`,
  );
}

function renderFooter(p: LayoutProps): SafeHtml {
  const { site, page, ui } = p;
  const links = site.footer.links.filter((l) => l.lang === page.lang);
  return html`
    <footer class="border-t border-slate-200 bg-white">
      <div class="container-page py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="text-sm text-slate-500">
          ${site.footer.copyright ?? `© ${new Date().getFullYear()} ${site.name}`}
        </div>
        <nav class="flex flex-wrap gap-3 text-sm">
          ${raw(
            links
              .map(
                (l) =>
                  `<a class="text-slate-600 hover:text-slate-900" href="${escAttr(l.url)}">${escText(l.label)}</a>`,
              )
              .join(''),
          )}
        </nav>
      </div>
    </footer>
  `;
}

function escText(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(input: unknown): string {
  return escText(input).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
