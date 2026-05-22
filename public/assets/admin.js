/* webgame-template admin SPA (vanilla JS, no build step). */
(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // i18n
  //
  // The active locale is stored in a cookie (`wg_admin_lang`) and applied on
  // every render. No URL-based routing — this is admin UI, not SEO.
  // -------------------------------------------------------------------------
  var LANG_COOKIE = 'wg_admin_lang';
  var LOCALES = {
    en: {
      appTitle: 'webgame-template admin',
      pages: 'Pages',
      siteSettings: 'Site Settings',
      viewSite: 'View site →',
      signOut: 'Sign out',
      newPageBtn: '+ New Page',
      newPageItem: function (type) { return 'New ' + type + ' page'; },
      loading: 'Loading…',
      noPagesYet: 'No pages yet. Use "New Page" to create your first page.',
      loadFailed: 'Failed to load: ',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: function (title) { return 'Delete "' + title + '"? This commits to GitHub.'; },
      deleted: 'Deleted',
      deleteFailed: 'Delete failed: ',
      updated: 'updated',
      back: '← Back',
      saveCommit: 'Save & Commit',
      editingHeader: function (type) { return 'Edit ' + type + ' page'; },
      newHeader: function (type) { return 'New ' + type + ' page'; },
      loadFailedShort: 'Load failed: ',
      fType: 'Type',
      fLanguage: 'Language',
      fSlug: 'Slug',
      slugHint: function (slug) { return 'used in the URL, e.g. /g/' + slug; },
      fTitle: 'Title',
      fDescription: 'Description',
      fCover: 'Cover image',
      fTags: 'Tags',
      fAlternateKey: 'Alternate key',
      alternateKeyHint: 'Pages sharing this key are translations of each other.',
      modules: 'Modules',
      addModule: '+ Add module',
      noModulesYet: 'No modules yet. Add modules to compose this page.',
      moveUp: 'Move up',
      moveDown: 'Move down',
      remove: 'Remove',
      confirmRemoveModule: 'Remove this module?',
      fIframeUrl: 'Iframe URL',
      iframeYoutubeHint: 'YouTube embed URL (https://www.youtube.com/embed/...)',
      iframeGameHint: 'Full iframe URL of the game.',
      fAspect: 'Aspect ratio',
      fCoverOptional: 'Cover image (optional)',
      fHeading: 'Heading',
      fSource: 'Source',
      fTag: 'Tag',
      fFilterType: 'Filter type',
      fLimit: 'Limit',
      fLayout: 'Layout',
      fBody: 'Body (Markdown)',
      fIntro: 'Intro',
      itemsLabel: 'Items',
      qaLabel: 'Q & A',
      addItem: '+ Add item',
      addImage: '+ Add image',
      images: 'Images',
      fImage: 'Image',
      fAltText: 'Alt text',
      fCaption: 'Caption',
      fProsLines: 'Pros (one per line)',
      fConsLines: 'Cons (one per line)',
      fImageAlt: 'Image alt',
      fReverseLayout: 'Reverse layout',
      titleSlugRequired: 'Title and slug are required',
      savedRedeploy: 'Saved and committed to GitHub. Cloudflare redeploys automatically if you set up the GitHub Actions workflow (see README).',
      saveFailed: 'Save failed: ',
      saving: 'Saving…',
      loadingLanguages: 'Loading languages…',
      fSiteName: 'Site name',
      fSiteDescription: 'Site description',
      fDefaultLang: 'Default language',
      defaultLangHint: 'Code of the language served at the site root (e.g. "en").',
      languages: 'Languages',
      addLanguage: '+ Add language',
      fAdsense: 'AdSense client ID (auto ads)',
      adsenseHint: 'e.g. ca-pub-1234567890123456. Leave empty to disable.',
      fGa: 'Google Analytics ID',
      gaHint: 'e.g. G-XXXXXXX. Leave empty to disable.',
      headerMenu: 'Header menu',
      addMenuItem: '+ Add menu item',
      footer: 'Footer',
      fCopyright: 'Copyright',
      links: 'Links',
      addFooterLink: '+ Add footer link',
      noImage: 'No image',
      urlOrUpload: 'https://... or upload below',
      uploading: 'Uploading…',
      uploaded: 'Uploaded',
      uploadFailed: 'Upload failed: ',
      saved: 'Saved',
      unsavedChanges: 'You have unsaved changes. Discard them?',
      failed: 'Failed: ',
      unknownModule: 'Unknown module',
      any: '(any)',
      langSwitcher: 'Language',
      modGameIframe: 'Game iframe',
      modVideoIframe: 'Video iframe',
      modPageList: 'Page list',
      modSeoIntro: 'SEO: intro',
      modSeoRichText: 'SEO: rich text',
      modSeoFeaturesGrid: 'SEO: features grid',
      modSeoSteps: 'SEO: steps',
      modSeoScreenshots: 'SEO: screenshots',
      modSeoProsCons: 'SEO: pros / cons',
      modSeoFaq: 'SEO: FAQ',
      modSeoTextImage: 'SEO: text + image',
      phLangCode: 'code (e.g. en)',
      phLangLabel: 'label (English)',
      phHtmlLang: 'html lang (en)',
      phLang: 'lang',
      phLabel: 'label',
      phUrl: '/url',
      phTags: 'action, multiplayer, 2-player',
    },
    zh: {
      appTitle: 'webgame-template 管理后台',
      pages: '页面',
      siteSettings: '站点设置',
      viewSite: '查看网站 →',
      signOut: '退出登录',
      newPageBtn: '+ 新建页面',
      newPageItem: function (type) {
        var map = { game: '游戏页', guide: '攻略页', tag: '标签页', home: '首页' };
        return '新建' + (map[type] || type);
      },
      loading: '加载中…',
      noPagesYet: '暂无页面。点击"新建页面"创建第一个页面。',
      loadFailed: '加载失败：',
      edit: '编辑',
      delete: '删除',
      confirmDelete: function (title) { return '确定删除"' + title + '"？此操作会提交到 GitHub。'; },
      deleted: '已删除',
      deleteFailed: '删除失败：',
      updated: '更新于',
      back: '← 返回',
      saveCommit: '保存并提交',
      editingHeader: function (type) {
        var map = { game: '游戏页', guide: '攻略页', tag: '标签页', home: '首页' };
        return '编辑' + (map[type] || type);
      },
      newHeader: function (type) {
        var map = { game: '游戏页', guide: '攻略页', tag: '标签页', home: '首页' };
        return '新建' + (map[type] || type);
      },
      loadFailedShort: '加载失败：',
      fType: '类型',
      fLanguage: '语言',
      fSlug: 'URL slug',
      slugHint: function (slug) { return 'URL 中的标识，例如 /g/' + slug; },
      fTitle: '标题',
      fDescription: '描述',
      fCover: '封面图',
      fTags: '标签',
      fAlternateKey: '多语言关联键',
      alternateKeyHint: '使用相同关联键的页面会被视为彼此的翻译版本。',
      modules: '模块',
      addModule: '+ 添加模块',
      noModulesYet: '尚未添加模块。添加模块来组合本页的内容。',
      moveUp: '上移',
      moveDown: '下移',
      remove: '删除',
      confirmRemoveModule: '确定删除该模块？',
      fIframeUrl: 'Iframe URL',
      iframeYoutubeHint: 'YouTube embed URL（https://www.youtube.com/embed/...）',
      iframeGameHint: '游戏的 iframe URL。',
      fAspect: '宽高比',
      fCoverOptional: '封面图（可选）',
      fHeading: '标题',
      fSource: '数据源',
      fTag: '标签',
      fFilterType: '筛选类型',
      fLimit: '数量上限',
      fLayout: '布局',
      fBody: '正文（Markdown）',
      fIntro: '引言',
      itemsLabel: '条目',
      qaLabel: '问答',
      addItem: '+ 添加条目',
      addImage: '+ 添加图片',
      images: '图片',
      fImage: '图片',
      fAltText: 'Alt 文字',
      fCaption: '图注',
      fProsLines: '优点（每行一条）',
      fConsLines: '缺点（每行一条）',
      fImageAlt: '图片 alt',
      fReverseLayout: '反向布局',
      titleSlugRequired: '标题和 slug 不能为空',
      savedRedeploy: '已提交到 GitHub。如果你配置了 GitHub Actions 自动部署，CF 会自动重新部署（详见 README）。',
      saveFailed: '保存失败：',
      saving: '保存中…',
      loadingLanguages: '加载语言中…',
      fSiteName: '站点名称',
      fSiteDescription: '站点描述',
      fDefaultLang: '默认语言',
      defaultLangHint: '网站根目录使用的语言代码（例如 "en"）。',
      languages: '语言列表',
      addLanguage: '+ 添加语言',
      fAdsense: 'AdSense 客户端 ID（自动广告）',
      adsenseHint: '例如 ca-pub-1234567890123456。留空即关闭。',
      fGa: 'Google Analytics ID',
      gaHint: '例如 G-XXXXXXX。留空即关闭。',
      headerMenu: '顶部菜单',
      addMenuItem: '+ 添加菜单项',
      footer: '页脚',
      fCopyright: '版权信息',
      links: '链接',
      addFooterLink: '+ 添加页脚链接',
      noImage: '无图片',
      urlOrUpload: 'https://... 或下方上传',
      uploading: '上传中…',
      uploaded: '上传完成',
      uploadFailed: '上传失败：',
      saved: '已保存',
      unsavedChanges: '有未保存的修改，确认放弃？',
      failed: '失败：',
      unknownModule: '未知模块',
      any: '（任意）',
      langSwitcher: '语言',
      modGameIframe: '游戏 iframe',
      modVideoIframe: '视频 iframe',
      modPageList: '页面列表',
      modSeoIntro: 'SEO：引言',
      modSeoRichText: 'SEO：富文本',
      modSeoFeaturesGrid: 'SEO：特性网格',
      modSeoSteps: 'SEO：步骤',
      modSeoScreenshots: 'SEO：截图',
      modSeoProsCons: 'SEO：优缺点',
      modSeoFaq: 'SEO：常见问题',
      modSeoTextImage: 'SEO：图文',
      phLangCode: '代码（如 en）',
      phLangLabel: '显示名（English）',
      phHtmlLang: 'html lang（如 en）',
      phLang: '语言',
      phLabel: '显示名',
      phUrl: '/url',
      phTags: 'action, multiplayer, 2-player',
    },
  };

  function readCookie(name) {
    var parts = (document.cookie || '').split(';');
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i].trim();
      if (p.indexOf(name + '=') === 0) return decodeURIComponent(p.slice(name.length + 1));
    }
    return null;
  }
  function writeCookie(name, value) {
    var oneYear = 365 * 24 * 60 * 60;
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = name + '=' + encodeURIComponent(value) + '; Path=/admin; Max-Age=' + oneYear + '; SameSite=Strict' + secure;
  }
  function detectLang() {
    var saved = readCookie(LANG_COOKIE);
    if (saved && LOCALES[saved]) return saved;
    var nav = (navigator.language || 'en').toLowerCase();
    if (nav.indexOf('zh') === 0) return 'zh';
    return 'en';
  }
  var currentLang = detectLang();
  function t(key) {
    var L = LOCALES[currentLang] || LOCALES.en;
    var v = L[key];
    if (v === undefined) v = LOCALES.en[key];
    return v;
  }
  function tf(key /* ...args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    var v = t(key);
    return typeof v === 'function' ? v.apply(null, args) : v;
  }
  function setLang(lang) {
    if (!LOCALES[lang] || lang === currentLang) return;
    currentLang = lang;
    writeCookie(LANG_COOKIE, lang);
    render();
  }

  // -------------------------------------------------------------------------
  // API client
  // -------------------------------------------------------------------------
  var api = {
    async req(path, init) {
      init = init || {};
      var headers = Object.assign({}, init.headers || {});
      if (init.method && init.method !== 'GET') headers['X-CSRF-Token'] = '1';
      if (init.body && !(init.body instanceof FormData) && typeof init.body !== 'string' && !(init.body instanceof ArrayBuffer)) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(init.body);
      }
      var res = await fetch('/admin/api' + path, Object.assign({}, init, { headers: headers, credentials: 'same-origin' }));
      if (res.status === 401) {
        location.href = '/admin';
        throw new Error('unauthorized');
      }
      if (!res.ok) {
        var msg = await res.text().catch(function () { return ''; });
        throw new Error(res.status + ' ' + msg);
      }
      return res.json();
    },
    getSite() { return this.req('/site'); },
    saveSite(site) { return this.req('/site', { method: 'PUT', body: site }); },
    getIndex() { return this.req('/index'); },
    getPage(type, lang, slug) { return this.req('/page/' + type + '/' + lang + '/' + encodeURIComponent(slug)); },
    savePage(page) { return this.req('/page', { method: 'PUT', body: page }); },
    deletePage(type, lang, slug) { return this.req('/page/' + type + '/' + lang + '/' + encodeURIComponent(slug), { method: 'DELETE' }); },
    async uploadImage(file) {
      var tok = await this.req('/upload-token', { method: 'POST', body: { filename: file.name, contentType: file.type } });
      var res = await fetch('/admin/api/upload?token=' + encodeURIComponent(tok.token), {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'X-CSRF-Token': '1' },
        body: file,
        credentials: 'same-origin',
      });
      if (!res.ok) throw new Error('upload failed: ' + res.status);
      return res.json();
    },
  };

  // -------------------------------------------------------------------------
  // tiny DOM helper
  // -------------------------------------------------------------------------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'class') el.className = attrs[k];
        else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(el.style, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (k === 'html') el.innerHTML = attrs[k];
        else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
      }
    }
    if (children !== undefined && children !== null) {
      var arr = Array.isArray(children) ? children : [children];
      arr.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
        else el.appendChild(c);
      });
    }
    return el;
  }

  // Toast / status
  var toastEl;
  function toast(msg, kind) {
    if (!toastEl) {
      toastEl = h('div', { class: 'fixed top-4 right-4 z-50 max-w-sm space-y-2' });
      document.body.appendChild(toastEl);
    }
    var cls = 'card px-4 py-2 text-sm shadow-lg ' + (kind === 'err' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-emerald-300 text-emerald-700 bg-emerald-50');
    var n = h('div', { class: cls }, msg);
    toastEl.appendChild(n);
    setTimeout(function () { n.remove(); }, 3500);
  }

  // -------------------------------------------------------------------------
  // App shell
  // -------------------------------------------------------------------------
  var root = document.getElementById('app');
  var state = {
    route: { name: 'pages' },
    site: null,
    index: null,
    editing: null,
    editingOriginalKey: null,
    dirty: false,
  };

  function render() {
    var view;
    if (state.route.name === 'pages') view = viewPages();
    else if (state.route.name === 'edit') view = viewEdit();
    else if (state.route.name === 'site') view = viewSite();
    else view = viewPages();
    root.replaceChildren(layout(view));
  }

  function layout(content) {
    return h('div', { class: 'min-h-screen flex flex-col' }, [
      h('header', { class: 'border-b border-slate-200 bg-white' }, [
        h('div', { class: 'mx-auto max-w-7xl px-4 py-3 flex items-center gap-4' }, [
          h('div', { class: 'flex items-center gap-2 font-semibold' }, [
            h('span', { class: 'inline-block h-6 w-6 rounded-md bg-brand-600' }),
            t('appTitle'),
          ]),
          h('nav', { class: 'flex items-center gap-1 ml-4' }, [
            navBtn(t('pages'), state.route.name === 'pages' || state.route.name === 'edit', function () { go({ name: 'pages' }); }),
            navBtn(t('siteSettings'), state.route.name === 'site', function () { go({ name: 'site' }); }),
          ]),
          h('div', { class: 'ml-auto flex items-center gap-2' }, [
            langSwitcher(),
            h('a', { href: '/', target: '_blank', class: 'btn-ghost' }, t('viewSite')),
            h('a', { href: '/admin/logout', class: 'btn-ghost' }, t('signOut')),
          ]),
        ]),
      ]),
      h('main', { class: 'flex-1' }, content),
    ]);
  }

  function langSwitcher() {
    var langs = [
      { code: 'en', label: 'EN' },
      { code: 'zh', label: '中' },
    ];
    return h('div', {
      class: 'flex items-center rounded-lg border border-slate-200 overflow-hidden text-xs',
      title: t('langSwitcher'),
    }, langs.map(function (l) {
      var active = l.code === currentLang;
      return h('button', {
        class: 'px-2.5 py-1 ' + (active ? 'bg-brand-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'),
        onClick: function () { setLang(l.code); },
      }, l.label);
    }));
  }

  function navBtn(label, active, onClick) {
    return h('button', {
      class: 'btn ' + (active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'),
      onClick: onClick,
    }, label);
  }

  function go(route) {
    if (state.dirty && state.route.name === 'edit') {
      if (!confirm(t('unsavedChanges'))) return;
      state.dirty = false;
    }
    state.route = route;
    render();
  }

  // -------------------------------------------------------------------------
  // View: Pages list
  // -------------------------------------------------------------------------
  function viewPages() {
    var container = h('div', { class: 'mx-auto max-w-7xl px-4 py-6 space-y-4' });
    container.appendChild(h('div', { class: 'flex items-center gap-3' }, [
      h('h1', { class: 'text-xl font-semibold' }, t('pages')),
      h('div', { class: 'ml-auto flex gap-2' }, [
        newPageDropdown(),
      ]),
    ]));

    var list = h('div', { class: 'card divide-y divide-slate-100' });
    container.appendChild(list);
    list.appendChild(h('div', { class: 'px-4 py-6 text-sm text-slate-500' }, t('loading')));

    api.getIndex().then(function (idx) {
      state.index = idx;
      list.replaceChildren();
      var entries = (idx.entries || []).slice().sort(function (a, b) {
        return (a.updatedAt < b.updatedAt) ? 1 : -1;
      });
      if (entries.length === 0) {
        list.appendChild(h('div', { class: 'px-4 py-8 text-center text-sm text-slate-500' }, t('noPagesYet')));
        return;
      }
      entries.forEach(function (e) { list.appendChild(pageRow(e)); });
    }).catch(function (err) {
      list.replaceChildren(h('div', { class: 'px-4 py-6 text-sm text-rose-600' }, t('loadFailed') + err.message));
    });

    return container;
  }

  function newPageDropdown() {
    var btn = h('button', { class: 'btn-primary' }, t('newPageBtn'));
    var menu = h('div', { class: 'absolute right-0 mt-1 hidden w-48 rounded-lg border border-slate-200 bg-white shadow-lg z-10' });
    ['game', 'guide', 'tag', 'home'].forEach(function (typ) {
      menu.appendChild(h('button', {
        class: 'block w-full text-left px-3 py-2 hover:bg-slate-50 text-sm',
        onClick: function () { menu.classList.add('hidden'); newPage(typ); },
      }, tf('newPageItem', typ)));
    });
    btn.addEventListener('click', function () { menu.classList.toggle('hidden'); });
    return h('div', { class: 'relative' }, [btn, menu]);
  }

  function pageRow(e) {
    return h('div', { class: 'flex items-center gap-4 px-4 py-3 hover:bg-slate-50' }, [
      h('div', { class: 'h-12 w-16 shrink-0 rounded bg-slate-100 overflow-hidden' }, [
        e.cover ? h('img', { src: e.cover, class: 'h-full w-full object-cover', loading: 'lazy' }) : null,
      ]),
      h('div', { class: 'min-w-0 flex-1' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('div', { class: 'font-medium text-slate-900 truncate' }, e.title),
          h('span', { class: 'inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600' }, e.type),
          h('span', { class: 'inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600' }, e.lang),
        ]),
        h('div', { class: 'text-xs text-slate-500 truncate' }, '/' + (e.type === 'home' ? '' : (e.type === 'game' ? 'g' : e.type === 'guide' ? 'p' : 't') + '/') + e.slug + ' · ' + t('updated') + ' ' + (e.updatedAt || '').slice(0, 10)),
      ]),
      h('button', { class: 'btn-ghost', onClick: function () { editPage(e.type, e.lang, e.slug); } }, t('edit')),
      h('button', {
        class: 'btn-ghost text-rose-600 hover:bg-rose-50',
        onClick: function () {
          if (!confirm(tf('confirmDelete', e.title))) return;
          api.deletePage(e.type, e.lang, e.slug)
            .then(function () { toast(t('deleted')); render(); })
            .catch(function (err) { toast(t('deleteFailed') + err.message, 'err'); });
        },
      }, t('delete')),
    ]);
  }

  function newPage(type) {
    var lang = (state.site && state.site.defaultLang) || 'en';
    state.editing = {
      type: type,
      lang: lang,
      slug: type === 'home' ? 'home' : 'new-' + Math.random().toString(36).slice(2, 7),
      title: '',
      description: '',
      cover: '',
      tags: [],
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      alternateKey: '',
      modules: defaultModulesFor(type),
    };
    state.editingOriginalKey = null;
    state.dirty = true;
    go({ name: 'edit' });
  }

  function editPage(type, lang, slug) {
    state.editing = null;
    state.editingOriginalKey = type + '/' + lang + '/' + slug;
    go({ name: 'edit' });
    api.getPage(type, lang, slug).then(function (p) {
      p.tags = p.tags || [];
      p.modules = p.modules || [];
      state.editing = p;
      render();
    }).catch(function (err) { toast(t('loadFailedShort') + err.message, 'err'); });
  }

  function defaultModulesFor(type) {
    if (type === 'game') {
      return [
        { type: 'game-iframe', url: '', ratio: '16:9' },
        { type: 'seo-content', variant: 'intro', heading: '', body: '' },
        { type: 'page-list', source: 'related', limit: 8 },
        { type: 'page-list', source: 'latest', limit: 12 },
      ];
    }
    if (type === 'guide') {
      return [
        { type: 'video-iframe', url: '', ratio: '16:9' },
        { type: 'seo-content', variant: 'intro', heading: '', body: '' },
        { type: 'page-list', source: 'related', limit: 8 },
      ];
    }
    if (type === 'tag') {
      return [
        { type: 'seo-content', variant: 'intro', heading: '', body: '' },
        { type: 'page-list', source: 'tag', limit: 24, layout: 'grid' },
        { type: 'seo-content', variant: 'faq', items: [] },
      ];
    }
    return [
      { type: 'page-list', source: 'latest', limit: 12, heading: '' },
      { type: 'seo-content', variant: 'intro', heading: '', body: '' },
    ];
  }

  // -------------------------------------------------------------------------
  // View: Edit page
  // -------------------------------------------------------------------------
  function viewEdit() {
    var wrap = h('div', { class: 'mx-auto max-w-7xl px-4 py-6' });
    if (!state.editing) {
      wrap.appendChild(h('div', { class: 'text-sm text-slate-500' }, t('loading')));
      return wrap;
    }
    var p = state.editing;

    wrap.appendChild(h('div', { class: 'flex items-center gap-2 mb-4' }, [
      h('button', { class: 'btn-ghost', onClick: function () { go({ name: 'pages' }); } }, t('back')),
      h('h1', { class: 'text-xl font-semibold' }, state.editingOriginalKey ? tf('editingHeader', p.type) : tf('newHeader', p.type)),
      h('div', { class: 'ml-auto flex gap-2' }, [
        h('button', { class: 'btn-primary', onClick: savePage }, t('saveCommit')),
      ]),
    ]));

    var grid = h('div', { class: 'grid lg:grid-cols-3 gap-6' });
    grid.appendChild(editMeta(p));
    grid.appendChild(editModules(p));
    wrap.appendChild(grid);
    return wrap;
  }

  function editMeta(p) {
    var col = h('div', { class: 'lg:col-span-1 space-y-4' });
    var card = h('div', { class: 'card p-4 space-y-3' });
    col.appendChild(card);

    card.appendChild(field(t('fType'), h('select', {
      class: inputClass(),
      disabled: true,
    }, ['game', 'guide', 'tag', 'home'].map(function (typ) {
      return h('option', { value: typ, selected: typ === p.type ? 'selected' : null }, typ);
    }))));

    card.appendChild(field(t('fLanguage'), langSelect(p.lang, function (v) { p.lang = v; state.dirty = true; })));

    if (p.type !== 'home') {
      card.appendChild(field(t('fSlug'), input(p.slug, function (v) {
        p.slug = v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
        state.dirty = true;
      }), tf('slugHint', p.slug || 'slug')));
    }

    card.appendChild(field(t('fTitle'), input(p.title, function (v) { p.title = v; state.dirty = true; })));
    card.appendChild(field(t('fDescription'), textarea(p.description || '', function (v) { p.description = v; state.dirty = true; }, 3)));

    card.appendChild(field(t('fCover'), imageInput(p.cover, function (v) { p.cover = v; state.dirty = true; })));

    card.appendChild(field(t('fTags'), tagsInput(p.tags, function (v) { p.tags = v; state.dirty = true; })));

    if (p.type !== 'home') {
      card.appendChild(field(t('fAlternateKey'), input(p.alternateKey || '', function (v) { p.alternateKey = v; state.dirty = true; }),
        t('alternateKeyHint')));
    }

    return col;
  }

  function editModules(p) {
    var col = h('div', { class: 'lg:col-span-2 space-y-4' });
    col.appendChild(h('div', { class: 'flex items-center gap-2' }, [
      h('h2', { class: 'font-semibold' }, t('modules')),
      h('div', { class: 'ml-auto' }, addModuleDropdown(p)),
    ]));
    if (!p.modules.length) {
      col.appendChild(h('div', { class: 'card p-6 text-center text-sm text-slate-500' }, t('noModulesYet')));
    }
    p.modules.forEach(function (m, idx) {
      col.appendChild(moduleCard(p, m, idx));
    });
    return col;
  }

  function addModuleDropdown(p) {
    var btn = h('button', { class: 'btn-primary' }, t('addModule'));
    var menu = h('div', { class: 'absolute right-0 mt-1 hidden w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-10' });
    var options = [
      { key: 'modGameIframe', mk: function () { return { type: 'game-iframe', url: '', ratio: '16:9' }; } },
      { key: 'modVideoIframe', mk: function () { return { type: 'video-iframe', url: '', ratio: '16:9' }; } },
      { key: 'modPageList', mk: function () { return { type: 'page-list', source: 'latest', limit: 12 }; } },
      { key: 'modSeoIntro', mk: function () { return { type: 'seo-content', variant: 'intro', heading: '', body: '' }; } },
      { key: 'modSeoRichText', mk: function () { return { type: 'seo-content', variant: 'rich-text', body: '' }; } },
      { key: 'modSeoFeaturesGrid', mk: function () { return { type: 'seo-content', variant: 'features-grid', heading: '', items: [] }; } },
      { key: 'modSeoSteps', mk: function () { return { type: 'seo-content', variant: 'steps', heading: '', items: [] }; } },
      { key: 'modSeoScreenshots', mk: function () { return { type: 'seo-content', variant: 'screenshots', heading: '', images: [] }; } },
      { key: 'modSeoProsCons', mk: function () { return { type: 'seo-content', variant: 'pros-cons', heading: '', pros: [], cons: [] }; } },
      { key: 'modSeoFaq', mk: function () { return { type: 'seo-content', variant: 'faq', heading: '', items: [] }; } },
      { key: 'modSeoTextImage', mk: function () { return { type: 'seo-content', variant: 'text-image', heading: '', body: '', image: { url: '', alt: '' } }; } },
    ];
    options.forEach(function (o) {
      menu.appendChild(h('button', {
        class: 'block w-full text-left px-3 py-2 hover:bg-slate-50 text-sm',
        onClick: function () { menu.classList.add('hidden'); p.modules.push(o.mk()); state.dirty = true; render(); },
      }, t(o.key)));
    });
    btn.addEventListener('click', function () { menu.classList.toggle('hidden'); });
    return h('div', { class: 'relative inline-block' }, [btn, menu]);
  }

  function moduleCard(p, m, idx) {
    var card = h('div', { class: 'card p-4 space-y-3' });
    card.appendChild(h('div', { class: 'flex items-center gap-2' }, [
      h('div', { class: 'font-medium' }, moduleLabel(m)),
      h('div', { class: 'ml-auto flex items-center gap-1' }, [
        h('button', { class: 'btn-ghost text-xs', title: t('moveUp'), onClick: function () { move(p, idx, -1); } }, '↑'),
        h('button', { class: 'btn-ghost text-xs', title: t('moveDown'), onClick: function () { move(p, idx, +1); } }, '↓'),
        h('button', { class: 'btn-ghost text-xs text-rose-600 hover:bg-rose-50', onClick: function () {
          if (!confirm(t('confirmRemoveModule'))) return;
          p.modules.splice(idx, 1); state.dirty = true; render();
        } }, t('remove')),
      ]),
    ]));
    card.appendChild(renderModuleEditor(m));
    return card;
  }

  function move(p, idx, delta) {
    var to = idx + delta;
    if (to < 0 || to >= p.modules.length) return;
    var x = p.modules[idx]; p.modules[idx] = p.modules[to]; p.modules[to] = x;
    state.dirty = true; render();
  }

  function moduleLabel(m) {
    if (m.type === 'game-iframe') return t('modGameIframe');
    if (m.type === 'video-iframe') return t('modVideoIframe');
    if (m.type === 'page-list') return t('modPageList');
    if (m.type === 'seo-content') {
      var map = {
        'intro': 'modSeoIntro', 'rich-text': 'modSeoRichText',
        'features-grid': 'modSeoFeaturesGrid', 'steps': 'modSeoSteps',
        'screenshots': 'modSeoScreenshots', 'pros-cons': 'modSeoProsCons',
        'faq': 'modSeoFaq', 'text-image': 'modSeoTextImage',
      };
      return map[m.variant] ? t(map[m.variant]) : ('SEO · ' + m.variant);
    }
    return m.type;
  }

  function renderModuleEditor(m) {
    if (m.type === 'game-iframe' || m.type === 'video-iframe') {
      return h('div', { class: 'space-y-3' }, [
        field(t('fIframeUrl'), input(m.url, function (v) { m.url = v; state.dirty = true; }),
          m.type === 'video-iframe' ? t('iframeYoutubeHint') : t('iframeGameHint')),
        field(t('fAspect'), select(m.ratio || '16:9', ['16:9', '4:3', '1:1', '9:16'], function (v) { m.ratio = v; state.dirty = true; })),
        field(t('fCoverOptional'), imageInput(m.cover || '', function (v) { m.cover = v; state.dirty = true; })),
      ]);
    }
    if (m.type === 'page-list') {
      return h('div', { class: 'space-y-3' }, [
        field(t('fHeading'), input(m.heading || '', function (v) { m.heading = v; state.dirty = true; })),
        field(t('fSource'), select(m.source, ['latest', 'related', 'tag', 'manual'], function (v) { m.source = v; state.dirty = true; render(); })),
        m.source === 'tag' ? field(t('fTag'), input((m.filter && m.filter.tag) || '', function (v) { m.filter = m.filter || {}; m.filter.tag = v; state.dirty = true; })) : null,
        field(t('fFilterType'), select((m.filter && m.filter.type) || '', ['', 'game', 'guide', 'tag'], function (v) {
          m.filter = m.filter || {};
          if (v) m.filter.type = v; else delete m.filter.type;
          state.dirty = true;
        })),
        field(t('fLimit'), input(String(m.limit || 12), function (v) { m.limit = parseInt(v, 10) || 12; state.dirty = true; })),
        field(t('fLayout'), select(m.layout || 'grid', ['grid', 'list', 'carousel'], function (v) { m.layout = v; state.dirty = true; })),
      ]);
    }
    if (m.type === 'seo-content') return seoEditor(m);
    return h('div', { class: 'text-sm text-slate-500' }, t('unknownModule'));
  }

  function seoEditor(m) {
    var parts = [];
    parts.push(field(t('fHeading'), input(m.heading || '', function (v) { m.heading = v; state.dirty = true; })));

    if (m.variant === 'intro' || m.variant === 'rich-text') {
      parts.push(field(t('fBody'), textarea(m.body || '', function (v) { m.body = v; state.dirty = true; }, 8)));
    }
    if (m.variant === 'features-grid' || m.variant === 'steps') {
      parts.push(field(t('fIntro'), textarea(m.intro || '', function (v) { m.intro = v; state.dirty = true; }, 2)));
      parts.push(itemListEditor(m.items, ['title', 'body'].concat(m.variant === 'features-grid' ? ['icon'] : []),
        function (next) { m.items = next; state.dirty = true; }, t('itemsLabel')));
    }
    if (m.variant === 'screenshots') {
      parts.push(imageListEditor(m.images, function (next) { m.images = next; state.dirty = true; }));
    }
    if (m.variant === 'pros-cons') {
      parts.push(field(t('fProsLines'), textarea(m.pros.join('\n'), function (v) { m.pros = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); state.dirty = true; }, 4)));
      parts.push(field(t('fConsLines'), textarea(m.cons.join('\n'), function (v) { m.cons = v.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); state.dirty = true; }, 4)));
    }
    if (m.variant === 'faq') {
      parts.push(itemListEditor(m.items, ['q', 'a'], function (next) { m.items = next; state.dirty = true; }, t('qaLabel')));
    }
    if (m.variant === 'text-image') {
      parts.push(field(t('fBody'), textarea(m.body || '', function (v) { m.body = v; state.dirty = true; }, 6)));
      parts.push(field(t('fImage'), imageInput((m.image && m.image.url) || '', function (v) { m.image = m.image || { url: '', alt: '' }; m.image.url = v; state.dirty = true; })));
      parts.push(field(t('fImageAlt'), input((m.image && m.image.alt) || '', function (v) { m.image = m.image || { url: '', alt: '' }; m.image.alt = v; state.dirty = true; })));
      parts.push(field(t('fReverseLayout'), checkbox(!!m.reverse, function (v) { m.reverse = v; state.dirty = true; })));
    }
    return h('div', { class: 'space-y-3' }, parts);
  }

  function itemListEditor(items, fields, onChange, label) {
    var wrap = h('div', { class: 'space-y-2' });
    wrap.appendChild(h('div', { class: 'text-sm font-medium text-slate-700' }, label));
    items.forEach(function (it, i) {
      var row = h('div', { class: 'rounded-lg border border-slate-200 p-3 space-y-2' });
      fields.forEach(function (f) {
        row.appendChild(field(f, input(it[f] || '', function (v) { it[f] = v; onChange(items); })));
      });
      row.appendChild(h('button', { class: 'btn-ghost text-xs text-rose-600 hover:bg-rose-50', onClick: function () { items.splice(i, 1); onChange(items); render(); } }, t('remove')));
      wrap.appendChild(row);
    });
    wrap.appendChild(h('button', { class: 'btn-ghost text-sm', onClick: function () {
      var empty = {}; fields.forEach(function (f) { empty[f] = ''; });
      items.push(empty); onChange(items); render();
    } }, t('addItem')));
    return wrap;
  }

  function imageListEditor(images, onChange) {
    var wrap = h('div', { class: 'space-y-2' });
    wrap.appendChild(h('div', { class: 'text-sm font-medium text-slate-700' }, t('images')));
    images.forEach(function (img, i) {
      var row = h('div', { class: 'rounded-lg border border-slate-200 p-3 space-y-2' });
      row.appendChild(field(t('fImage'), imageInput(img.url || '', function (v) { img.url = v; onChange(images); })));
      row.appendChild(field(t('fAltText'), input(img.alt || '', function (v) { img.alt = v; onChange(images); })));
      row.appendChild(field(t('fCaption'), input(img.caption || '', function (v) { img.caption = v; onChange(images); })));
      row.appendChild(h('button', { class: 'btn-ghost text-xs text-rose-600 hover:bg-rose-50', onClick: function () { images.splice(i, 1); onChange(images); render(); } }, t('remove')));
      wrap.appendChild(row);
    });
    wrap.appendChild(h('button', { class: 'btn-ghost text-sm', onClick: function () {
      images.push({ url: '', alt: '' }); onChange(images); render();
    } }, t('addImage')));
    return wrap;
  }

  function savePage() {
    if (!state.editing) return;
    var p = state.editing;
    if (!p.title || !p.slug) { toast(t('titleSlugRequired'), 'err'); return; }
    var btn = event.target;
    var oldLabel = btn.textContent;
    btn.disabled = true; btn.textContent = t('saving');
    api.savePage(p).then(function () {
      state.dirty = false;
      toast(t('savedRedeploy'));
      go({ name: 'pages' });
    }).catch(function (err) {
      toast(t('saveFailed') + err.message, 'err');
      btn.disabled = false; btn.textContent = oldLabel;
    });
  }

  // -------------------------------------------------------------------------
  // View: Site settings
  // -------------------------------------------------------------------------
  function viewSite() {
    var wrap = h('div', { class: 'mx-auto max-w-3xl px-4 py-6 space-y-4' });
    wrap.appendChild(h('h1', { class: 'text-xl font-semibold' }, t('siteSettings')));
    var loading = h('div', { class: 'card px-4 py-6 text-sm text-slate-500' }, t('loading'));
    wrap.appendChild(loading);

    api.getSite().then(function (s) {
      state.site = s;
      wrap.replaceChildren(h('h1', { class: 'text-xl font-semibold' }, t('siteSettings')));

      var card = h('div', { class: 'card p-5 space-y-4' });
      card.appendChild(field(t('fSiteName'), input(s.name, function (v) { s.name = v; })));
      card.appendChild(field(t('fSiteDescription'), textarea(s.description, function (v) { s.description = v; }, 2)));
      card.appendChild(field(t('fDefaultLang'), input(s.defaultLang, function (v) { s.defaultLang = v.trim(); }), t('defaultLangHint')));
      card.appendChild(languagesEditor(s));
      card.appendChild(adsenseEditor(s));
      card.appendChild(analyticsEditor(s));
      card.appendChild(menuEditor(s));
      card.appendChild(footerEditor(s));

      var actions = h('div', { class: 'flex gap-2' }, [
        h('button', { class: 'btn-primary', onClick: function () {
          api.saveSite(s).then(function () { toast(t('saved')); }).catch(function (err) { toast(t('saveFailed') + err.message, 'err'); });
        } }, t('saveCommit')),
      ]);
      wrap.appendChild(card);
      wrap.appendChild(actions);
    }).catch(function (err) {
      loading.textContent = t('failed') + err.message;
    });

    return wrap;
  }

  function languagesEditor(s) {
    var wrap = h('div', { class: 'space-y-2' });
    wrap.appendChild(h('div', { class: 'text-sm font-medium text-slate-700' }, t('languages')));
    s.languages = s.languages || [];
    s.languages.forEach(function (l, i) {
      var row = h('div', { class: 'flex gap-2 items-center' });
      row.appendChild(input(l.code, function (v) { l.code = v.trim(); }, { placeholder: t('phLangCode'), class: inputClass() + ' w-24' }));
      row.appendChild(input(l.label, function (v) { l.label = v; }, { placeholder: t('phLangLabel'), class: inputClass() + ' flex-1' }));
      row.appendChild(input(l.htmlLang, function (v) { l.htmlLang = v; }, { placeholder: t('phHtmlLang'), class: inputClass() + ' w-32' }));
      row.appendChild(h('button', { class: 'btn-ghost text-rose-600', onClick: function () { s.languages.splice(i, 1); render(); } }, '×'));
      wrap.appendChild(row);
    });
    wrap.appendChild(h('button', { class: 'btn-ghost text-sm', onClick: function () {
      s.languages.push({ code: '', label: '', htmlLang: '' }); render();
    } }, t('addLanguage')));
    return wrap;
  }

  function adsenseEditor(s) {
    s.adsense = s.adsense || { clientId: '' };
    return field(t('fAdsense'), input(s.adsense.clientId, function (v) {
      s.adsense.clientId = v.trim();
    }), t('adsenseHint'));
  }

  function analyticsEditor(s) {
    s.analytics = s.analytics || {};
    return field(t('fGa'), input(s.analytics.googleAnalyticsId || '', function (v) {
      s.analytics.googleAnalyticsId = v.trim();
    }), t('gaHint'));
  }

  function menuEditor(s) {
    s.menu = s.menu || [];
    var wrap = h('div', { class: 'space-y-2' });
    wrap.appendChild(h('div', { class: 'text-sm font-medium text-slate-700' }, t('headerMenu')));
    s.menu.forEach(function (item, i) {
      var row = h('div', { class: 'flex gap-2 items-center' });
      row.appendChild(input(item.lang, function (v) { item.lang = v.trim(); }, { placeholder: t('phLang'), class: inputClass() + ' w-20' }));
      row.appendChild(input(item.label, function (v) { item.label = v; }, { placeholder: t('phLabel'), class: inputClass() + ' flex-1' }));
      row.appendChild(input(item.url, function (v) { item.url = v; }, { placeholder: t('phUrl'), class: inputClass() + ' flex-1' }));
      row.appendChild(h('button', { class: 'btn-ghost text-rose-600', onClick: function () { s.menu.splice(i, 1); render(); } }, '×'));
      wrap.appendChild(row);
    });
    wrap.appendChild(h('button', { class: 'btn-ghost text-sm', onClick: function () {
      s.menu.push({ lang: s.defaultLang || 'en', label: '', url: '' }); render();
    } }, t('addMenuItem')));
    return wrap;
  }

  function footerEditor(s) {
    s.footer = s.footer || { copyright: '', links: [] };
    var wrap = h('div', { class: 'space-y-2' });
    wrap.appendChild(h('div', { class: 'text-sm font-medium text-slate-700' }, t('footer')));
    wrap.appendChild(field(t('fCopyright'), input(s.footer.copyright || '', function (v) { s.footer.copyright = v; })));
    wrap.appendChild(h('div', { class: 'text-xs text-slate-500' }, t('links')));
    s.footer.links.forEach(function (item, i) {
      var row = h('div', { class: 'flex gap-2 items-center' });
      row.appendChild(input(item.lang, function (v) { item.lang = v.trim(); }, { placeholder: t('phLang'), class: inputClass() + ' w-20' }));
      row.appendChild(input(item.label, function (v) { item.label = v; }, { placeholder: t('phLabel'), class: inputClass() + ' flex-1' }));
      row.appendChild(input(item.url, function (v) { item.url = v; }, { placeholder: t('phUrl'), class: inputClass() + ' flex-1' }));
      row.appendChild(h('button', { class: 'btn-ghost text-rose-600', onClick: function () { s.footer.links.splice(i, 1); render(); } }, '×'));
      wrap.appendChild(row);
    });
    wrap.appendChild(h('button', { class: 'btn-ghost text-sm', onClick: function () {
      s.footer.links.push({ lang: s.defaultLang || 'en', label: '', url: '' }); render();
    } }, t('addFooterLink')));
    return wrap;
  }

  // -------------------------------------------------------------------------
  // form widgets
  // -------------------------------------------------------------------------
  function inputClass() {
    return 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100';
  }

  function field(label, control, hint) {
    return h('label', { class: 'block' }, [
      h('div', { class: 'text-sm font-medium text-slate-700 mb-1' }, label),
      control,
      hint ? h('div', { class: 'text-xs text-slate-500 mt-1' }, hint) : null,
    ]);
  }

  function input(value, onChange, opts) {
    opts = opts || {};
    var el = h('input', Object.assign({ type: 'text', class: inputClass(), value: value || '' }, opts));
    el.addEventListener('input', function () { onChange(el.value); });
    return el;
  }

  function textarea(value, onChange, rows) {
    var el = h('textarea', { class: inputClass() + ' font-mono', rows: rows || 4 });
    el.value = value || '';
    el.addEventListener('input', function () { onChange(el.value); });
    return el;
  }

  function select(value, options, onChange) {
    var el = h('select', { class: inputClass() }, options.map(function (o) {
      return h('option', { value: o, selected: o === value ? 'selected' : null }, o || t('any'));
    }));
    el.addEventListener('change', function () { onChange(el.value); });
    return el;
  }

  function checkbox(value, onChange) {
    var el = h('input', { type: 'checkbox' });
    el.checked = !!value;
    el.addEventListener('change', function () { onChange(el.checked); });
    return el;
  }

  function langSelect(value, onChange) {
    if (!state.site) {
      api.getSite().then(function (s) { state.site = s; render(); });
      return h('div', { class: 'text-sm text-slate-500' }, t('loadingLanguages'));
    }
    return select(value, state.site.languages.map(function (l) { return l.code; }), onChange);
  }

  function tagsInput(value, onChange) {
    var v = (value || []).join(', ');
    return input(v, function (raw) {
      var tags = raw.split(',').map(function (x) { return x.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''); }).filter(Boolean);
      onChange(tags);
    }, { placeholder: t('phTags') });
  }

  function imageInput(value, onChange) {
    var wrap = h('div', { class: 'space-y-2' });
    var preview = h('div', { class: 'aspect-video w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center' });
    function refreshPreview(v) {
      preview.replaceChildren();
      if (v) preview.appendChild(h('img', { src: v, class: 'h-full w-full object-cover' }));
      else preview.appendChild(h('div', { class: 'text-xs text-slate-400' }, t('noImage')));
    }
    refreshPreview(value);
    var url = input(value || '', function (v) { onChange(v); refreshPreview(v); }, { placeholder: t('urlOrUpload') });
    var fileInput = h('input', { type: 'file', accept: 'image/*', class: 'text-sm' });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (!f) return;
      toast(t('uploading'));
      api.uploadImage(f).then(function (r) {
        url.value = r.publicUrl;
        onChange(r.publicUrl);
        refreshPreview(r.publicUrl);
        toast(t('uploaded'));
      }).catch(function (err) { toast(t('uploadFailed') + err.message, 'err'); });
    });
    wrap.appendChild(preview);
    wrap.appendChild(url);
    wrap.appendChild(fileInput);
    return wrap;
  }

  // -------------------------------------------------------------------------
  // boot
  // -------------------------------------------------------------------------
  api.getSite().then(function (s) { state.site = s; render(); }).catch(function () { render(); });
})();
