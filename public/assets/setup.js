/* webgame-template setup wizard. */
(function () {
  'use strict';

  // ---------------------- API ----------------------
  var api = {
    async req(path, init) {
      init = init || {};
      var headers = Object.assign({}, init.headers || {});
      if (init.body && typeof init.body === 'object') {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(init.body);
      }
      var res = await fetch('/setup/api' + path, Object.assign({}, init, { headers: headers, credentials: 'same-origin' }));
      var body;
      try { body = await res.json(); } catch (_) { body = { error: 'bad response' }; }
      if (!res.ok) {
        var err = new Error(body.error || ('HTTP ' + res.status));
        err.status = res.status;
        throw err;
      }
      return body;
    },
    status() { return this.req('/status'); },
    setPassword(p) { return this.req('/password', { method: 'POST', body: { password: p } }); },
    saveGithub(g) { return this.req('/github', { method: 'POST', body: g }); },
    testGithub(g) { return this.req('/github/test', { method: 'POST', body: g }); },
    saveR2(r) { return this.req('/r2', { method: 'POST', body: r }); },
    testR2(r) { return this.req('/r2/test', { method: 'POST', body: r }); },
    finish() { return this.req('/finish', { method: 'POST', body: {} }); },
  };

  // ---------------------- DOM ----------------------
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') el.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (attrs[k] !== undefined && attrs[k] !== null && attrs[k] !== false) el.setAttribute(k, attrs[k]);
    }
    if (children != null) {
      var arr = Array.isArray(children) ? children : [children];
      arr.forEach(function (c) {
        if (c == null || c === false) return;
        if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(String(c)));
        else el.appendChild(c);
      });
    }
    return el;
  }

  var root = document.getElementById('setup');
  var state = {
    step: 1,
    status: null,
    password: '',
    confirm: '',
    github: { repo: '', branch: 'main', token: '' },
    r2: { publicBaseUrl: '' },
    busy: false,
    errors: {},
  };

  function render() {
    root.replaceChildren(layout());
  }

  function layout() {
    return h('div', { class: 'min-h-screen flex flex-col items-center px-4 py-10' }, [
      h('div', { class: 'w-full max-w-2xl' }, [
        header(),
        stepper(),
        currentStep(),
        h('div', { class: 'mt-6 text-center text-xs text-slate-400' },
          'webgame-template setup · stays on your domain · nothing leaves your Worker'),
      ]),
    ]);
  }

  function header() {
    return h('div', { class: 'mb-6 text-center' }, [
      h('div', { class: 'inline-flex items-center gap-2' }, [
        h('span', { class: 'inline-block h-7 w-7 rounded-md bg-brand-600' }),
        h('span', { class: 'text-lg font-semibold text-slate-900' }, 'webgame-template'),
      ]),
      h('h1', { class: 'mt-2 text-2xl font-bold text-slate-900' }, 'Welcome — let’s set up your site'),
      h('p', { class: 'mt-1 text-slate-600' }, 'About 5 minutes. We’ll configure your admin password, GitHub access, and image hosting.'),
    ]);
  }

  function stepper() {
    var steps = ['Password', 'GitHub', 'R2 images', 'Done'];
    // After setup is complete, any step is clickable so the admin can
    // re-enter a single section (e.g. update the GitHub token).
    var clickable = state.status && state.status.setupCompleted;
    return h('ol', { class: 'mb-6 flex items-center justify-between gap-2 text-xs' },
      steps.map(function (s, i) {
        var n = i + 1;
        var active = state.step === n;
        var done = state.step > n;
        var dot = h('span', {
          class:
            'flex h-7 w-7 items-center justify-center rounded-full font-semibold ' +
            (done ? 'bg-emerald-100 text-emerald-700' :
             active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'),
        }, done ? '✓' : String(n));
        var label = h('span', { class: active ? 'font-semibold text-slate-900' : 'text-slate-500' }, s);
        if (clickable) {
          return h('li', {
            class: 'flex-1 flex items-center gap-2 cursor-pointer hover:opacity-80',
            onClick: function () { state.step = n; state.tested = null; render(); },
            title: 'Re-enter this step',
          }, [dot, label]);
        }
        return h('li', { class: 'flex-1 flex items-center gap-2' }, [dot, label]);
      }));
  }

  function currentStep() {
    if (state.step === 1) return stepPassword();
    if (state.step === 2) return stepGithub();
    if (state.step === 3) return stepR2();
    if (state.step === 4) return stepDone();
    return h('div');
  }

  // ---------------------- Step 1: Password ----------------------
  function stepPassword() {
    var card = h('div', { class: 'card p-6 space-y-4' });
    card.appendChild(h('div', null, [
      h('h2', { class: 'text-lg font-semibold text-slate-900' }, 'Set your admin password'),
      h('p', { class: 'text-sm text-slate-600 mt-1' }, 'You’ll use this to sign in at /admin. Pick something strong — you can change it later.'),
    ]));
    card.appendChild(field('Password', passwordInput('password', function (v) { state.password = v; })));
    card.appendChild(field('Confirm password', passwordInput('confirm', function (v) { state.confirm = v; })));
    if (state.errors.password) card.appendChild(errBox(state.errors.password));
    card.appendChild(h('div', { class: 'flex justify-end pt-2' }, [
      primary('Continue', async function () {
        state.errors = {};
        if (state.password.length < 8) {
          state.errors.password = 'Password must be at least 8 characters.';
          render(); return;
        }
        if (state.password !== state.confirm) {
          state.errors.password = 'Passwords don’t match.';
          render(); return;
        }
        state.busy = true; render();
        try {
          await api.setPassword(state.password);
          state.step = 2;
        } catch (e) {
          state.errors.password = e.message;
        } finally {
          state.busy = false; render();
        }
      }),
    ]));
    return card;
  }

  // ---------------------- Step 2: GitHub ----------------------
  function stepGithub() {
    var card = h('div', { class: 'card p-6 space-y-4' });
    card.appendChild(h('div', null, [
      h('h2', { class: 'text-lg font-semibold text-slate-900' }, 'Connect GitHub'),
      h('p', { class: 'text-sm text-slate-600 mt-1' },
        'Content edits are committed to your repository, which automatically redeploys your Worker. ' +
        'We need: (1) which repo to commit to, and (2) a token that can write to it.'),
    ]));

    card.appendChild(infoBox([
      h('div', { class: 'text-sm text-slate-700' }, [
        h('b', null, 'Step 1 of 2: '),
        'Which repo did you deploy this site from? Enter it as ',
        h('code', { class: 'bg-slate-100 px-1 rounded' }, 'your-github-username/webgame'),
        ' (or whatever you named your fork).',
      ]),
    ]));
    card.appendChild(field('Repository', textInput(state.github.repo, function (v) { state.github.repo = v.trim(); }, 'your-username/webgame')));
    card.appendChild(field('Branch', textInput(state.github.branch, function (v) { state.github.branch = v.trim() || 'main'; }, 'main')));

    card.appendChild(infoBox([
      h('div', { class: 'text-sm text-slate-700' }, [
        h('b', null, 'Step 2 of 2: '),
        'Generate a fine-grained personal access token (a GitHub PAT).',
      ]),
      h('ol', { class: 'mt-2 space-y-1 text-sm text-slate-700 list-decimal pl-5' }, [
        h('li', null, [
          'Open ',
          h('a', { class: 'text-brand-700 underline', href: 'https://github.com/settings/personal-access-tokens/new', target: '_blank', rel: 'noopener' },
            'github.com/settings/personal-access-tokens/new'),
          ' (sign in if needed).',
        ]),
        h('li', null, 'Token name: anything you like, e.g. "webgame".'),
        h('li', null, ['Expiration: pick whatever you’re comfortable with (90 days is fine).']),
        h('li', null, [
          h('b', null, 'Repository access: '),
          '"Only select repositories" → pick the repo above.',
        ]),
        h('li', null, [
          h('b', null, 'Repository permissions: '),
          'find ', h('b', null, 'Contents'), ' and set it to ', h('b', null, 'Read and write'), '.',
        ]),
        h('li', null, 'Click Generate token, then copy it and paste below.'),
      ]),
    ]));
    card.appendChild(field('Personal access token', passwordInput('token', function (v) { state.github.token = v.trim(); }, 'github_pat_...')));

    if (state.errors.github) card.appendChild(errBox(state.errors.github));
    if (state.tested === 'github') card.appendChild(okBox('Connection looks good ✅'));

    card.appendChild(h('div', { class: 'flex items-center gap-2 pt-2' }, [
      secondary('Test connection', async function () {
        state.errors = {}; state.busy = true; render();
        try {
          var r = await api.testGithub(state.github);
          if (r.ok) state.tested = 'github';
          else state.errors.github = r.error || 'connection failed';
        } catch (e) { state.errors.github = e.message; }
        finally { state.busy = false; render(); }
      }),
      h('div', { class: 'ml-auto flex items-center gap-2' }, [
        ghost('Back', function () { state.step = 1; render(); }),
        primary('Save & continue', async function () {
          state.errors = {}; state.busy = true; render();
          try {
            await api.saveGithub(state.github);
            state.tested = null;
            state.step = 3;
          } catch (e) { state.errors.github = e.message; }
          finally { state.busy = false; render(); }
        }),
      ]),
    ]));
    return card;
  }

  // ---------------------- Step 3: R2 ----------------------
  function stepR2() {
    var card = h('div', { class: 'card p-6 space-y-4' });
    card.appendChild(h('div', null, [
      h('h2', { class: 'text-lg font-semibold text-slate-900' }, 'Image hosting (Cloudflare R2)'),
      h('p', { class: 'text-sm text-slate-600 mt-1' },
        'Cover images and screenshots are stored in your R2 bucket. We need the bucket’s public URL so the site can show those images.'),
    ]));

    card.appendChild(infoBox([
      h('div', { class: 'text-sm text-slate-700' }, [
        h('b', null, 'How to get the public URL: '),
        'You need to enable public access on the R2 bucket. Cloudflare offers two options — pick whichever is easier.',
      ]),
      h('div', { class: 'mt-3 grid sm:grid-cols-2 gap-2 text-sm' }, [
        h('div', { class: 'rounded border border-slate-200 p-3 bg-white' }, [
          h('div', { class: 'font-semibold text-slate-800' }, 'Option A: r2.dev URL (quick)'),
          h('ol', { class: 'mt-1 space-y-1 list-decimal pl-5 text-slate-700' }, [
            h('li', null, [
              'Open the ',
              h('a', { class: 'text-brand-700 underline', href: 'https://dash.cloudflare.com/?to=/:account/r2/default/buckets/webgame-uploads/settings', target: '_blank', rel: 'noopener' },
                'R2 bucket settings'),
              '.',
            ]),
            h('li', null, 'Under "Public access" → "R2.dev subdomain" → Allow access.'),
            h('li', null, 'Copy the URL shown (looks like https://pub-xxx.r2.dev) and paste below.'),
          ]),
        ]),
        h('div', { class: 'rounded border border-slate-200 p-3 bg-white' }, [
          h('div', { class: 'font-semibold text-slate-800' }, 'Option B: Custom domain (recommended)'),
          h('ol', { class: 'mt-1 space-y-1 list-decimal pl-5 text-slate-700' }, [
            h('li', null, 'In the same R2 bucket settings, "Connect domain".'),
            h('li', null, 'Enter a subdomain like images.your-site.com.'),
            h('li', null, 'Cloudflare creates the DNS record automatically.'),
            h('li', null, 'Wait a minute, then enter https://images.your-site.com below.'),
          ]),
        ]),
      ]),
    ]));

    card.appendChild(field('R2 public base URL', textInput(state.r2.publicBaseUrl, function (v) { state.r2.publicBaseUrl = v.trim(); }, 'https://pub-xxx.r2.dev or https://images.your-site.com')));

    if (state.errors.r2) card.appendChild(errBox(state.errors.r2));
    if (state.tested === 'r2') card.appendChild(okBox('R2 public URL is reachable ✅'));

    card.appendChild(h('div', { class: 'flex items-center gap-2 pt-2' }, [
      secondary('Test URL', async function () {
        state.errors = {}; state.busy = true; render();
        try {
          var r = await api.testR2(state.r2);
          if (r.ok) state.tested = 'r2';
          else state.errors.r2 = r.error || 'test failed';
        } catch (e) { state.errors.r2 = e.message; }
        finally { state.busy = false; render(); }
      }),
      h('div', { class: 'ml-auto flex items-center gap-2' }, [
        ghost('Back', function () { state.step = 2; render(); }),
        primary('Save & continue', async function () {
          state.errors = {}; state.busy = true; render();
          try {
            await api.saveR2(state.r2);
            await api.finish();
            state.tested = null;
            state.step = 4;
          } catch (e) { state.errors.r2 = e.message; }
          finally { state.busy = false; render(); }
        }),
      ]),
    ]));
    return card;
  }

  // ---------------------- Step 4: Done ----------------------
  function stepDone() {
    return h('div', { class: 'card p-8 text-center space-y-4' }, [
      h('div', { class: 'mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700' }, [
        h('svg', { width: '32', height: '32', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3' }, [
          h('polyline', { points: '20 6 9 17 4 12' }),
        ]),
      ]),
      h('h2', { class: 'text-xl font-semibold text-slate-900' }, 'You’re all set!'),
      h('p', { class: 'text-slate-600' }, 'Configuration is saved. You can now start adding games and pages.'),
      h('div', { class: 'flex justify-center gap-2' }, [
        h('a', { class: 'btn-primary', href: '/admin' }, 'Open admin →'),
        h('a', { class: 'btn-ghost', href: '/', target: '_blank' }, 'View site'),
      ]),
      h('p', { class: 'text-xs text-slate-500 pt-4 border-t border-slate-100' },
        'Need to update something later? Click any step in the bar above to re-enter that section.'),
    ]);
  }

  // ---------------------- form widgets ----------------------
  function inputCls() {
    return 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100';
  }
  function field(label, control) {
    return h('label', { class: 'block' }, [
      h('div', { class: 'text-sm font-medium text-slate-700 mb-1' }, label),
      control,
    ]);
  }
  function textInput(value, onChange, placeholder) {
    var el = h('input', { type: 'text', class: inputCls(), value: value || '', placeholder: placeholder || '' });
    el.addEventListener('input', function () { onChange(el.value); });
    return el;
  }
  function passwordInput(name, onChange, placeholder) {
    var el = h('input', { type: 'password', class: inputCls(), placeholder: placeholder || '', autocomplete: name === 'password' ? 'new-password' : 'off' });
    el.addEventListener('input', function () { onChange(el.value); });
    return el;
  }
  function primary(label, onClick) {
    var el = h('button', { class: 'btn-primary', disabled: state.busy ? 'disabled' : null }, state.busy ? 'Working…' : label);
    if (!state.busy) el.addEventListener('click', onClick);
    return el;
  }
  function secondary(label, onClick) {
    var el = h('button', { class: 'btn-ghost border border-slate-300', disabled: state.busy ? 'disabled' : null }, state.busy ? 'Working…' : label);
    if (!state.busy) el.addEventListener('click', onClick);
    return el;
  }
  function ghost(label, onClick) {
    var el = h('button', { class: 'btn-ghost' }, label);
    el.addEventListener('click', onClick);
    return el;
  }
  function errBox(msg) {
    return h('div', { class: 'rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-sm px-3 py-2' }, String(msg));
  }
  function okBox(msg) {
    return h('div', { class: 'rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm px-3 py-2' }, msg);
  }
  function infoBox(children) {
    return h('div', { class: 'rounded-md border border-brand-100 bg-brand-50 px-4 py-3' }, children);
  }

  // ---------------------- boot ----------------------
  api.status().then(function (s) {
    state.status = s;
    // If already configured, jump to "done" (or step 1 to re-set things).
    if (s.setupCompleted) state.step = 4;
    else if (s.hasGithub && !s.hasR2Public) state.step = 3;
    else if (s.hasPassword && !s.hasGithub) state.step = 2;
    else state.step = 1;
    // Pre-fill known fields
    if (s.github && s.github.repo) state.github.repo = s.github.repo;
    if (s.github && s.github.branch) state.github.branch = s.github.branch;
    if (s.r2 && s.r2.publicBaseUrl) state.r2.publicBaseUrl = s.r2.publicBaseUrl;
    render();
  }).catch(function () { render(); });
})();
