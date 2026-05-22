# WebGame Template

A SEO-friendly online game website template, deployable to Cloudflare Workers with one click. No coding required — manage everything from a built-in admin that commits content to GitHub, which automatically redeploys your site.

## Features

- **SEO-first**: server-rendered HTML, automatic `<title>`, `<meta>`, `hreflang`, JSON-LD (VideoGame / Article / FAQ / Breadcrumb), `sitemap.xml`, `robots.txt`.
- **Composable pages**: every page is built from a small set of reusable modules — game iframe, video iframe, page list, and SEO content blocks (intro, features grid, steps, screenshots, pros/cons, FAQ, text+image, rich text).
- **Click-to-load iframes**: game and video URLs are present in the rendered HTML for crawlers, but the iframe only mounts when the user clicks play.
- **Multilingual**: each page version is independent and linked via an `alternateKey`. The default language is served at `/`, other languages under `/{lang}/`.
- **In-browser setup wizard** at `/setup`: walks you through admin password, GitHub access, and R2 image hosting. No env vars to guess up front.
- **Built-in admin** at `/admin`: edits are saved as commits to your GitHub repo (which triggers automatic redeploy on Cloudflare).
- **R2 image uploads** with signed upload tokens.
- **AdSense auto ads** (single config field).

## Routes

| Type     | URL pattern              |
| -------- | ------------------------ |
| Home     | `/` or `/{lang}/`        |
| Game     | `/g/{slug}`              |
| Tag      | `/t/{slug}`              |
| Guide    | `/p/{slug}`              |
| Sitemap  | `/sitemap.xml`           |
| Robots   | `/robots.txt`            |
| Setup    | `/setup` (first-time wizard) |
| Admin    | `/admin`                 |

The default language is served at the root (no `/{lang}` prefix); requesting `/{defaultLang}/...` issues a 301 redirect to the un-prefixed URL.

## How to deploy

There are two paths. The CLI path is the more reliable one — the Deploy
button looks easier but currently has a known Cloudflare permission-loop bug
that's hard to escape.

### Option A — CLI (recommended)

You need: a Cloudflare account (free is fine), Node.js 18+, and Git.

1. **Create your own copy on GitHub**: open this repository's page and click
   **Use this template → Create a new repository**. (If "Use this template"
   isn't visible, click **Fork** instead. Both work; Template is cleaner
   because it doesn't leave a "forked from" marker.) Note: you cannot fork
   your own repo, so Template is the only path if you're the upstream owner
   yourself.

2. **Clone your new repo and run the init script:**

   ```bash
   git clone https://github.com/YOUR-USERNAME/your-new-repo.git my-game-site
   cd my-game-site
   npm install
   npm run init
   ```

   The script will:
   - ask you to name your Worker and R2 bucket;
   - sign in to Cloudflare (browser-based OAuth — or use an API token; see
     below);
   - create the R2 bucket automatically;
   - build the CSS bundle;
   - deploy your Worker.

   When it finishes, it prints your live URL.

   **If `wrangler login` times out** (common on networks where the Cloudflare
   API is slow or filtered, including mainland China), bypass OAuth by using
   an API token instead:

   1. Open <https://dash.cloudflare.com/profile/api-tokens> (use a proxy/VPN
      if the dashboard itself doesn't load).
   2. **Create Token** → use the **"Edit Cloudflare Workers"** template.
   3. Under Permissions, add: **Account → Workers R2 Storage → Edit**.
   4. Continue → Create Token → copy it.
   5. Re-run with the token in the environment:

      ```bash
      CLOUDFLARE_API_TOKEN=your-token-here npm run init
      ```

3. **Open the URL.** It redirects you to `/setup` — a wizard that walks you
   through three steps:
   - **Admin password.** Pick a strong one.
   - **GitHub access.** Point at your new repo and paste a fine-grained
     personal access token (the wizard tells you exactly which permissions).
   - **R2 public URL.** Enable public access on the R2 bucket (`pub-xxx.r2.dev`
     URL or a custom subdomain) and paste it into the wizard.

   After the wizard you land in `/admin` and can start adding games.

### Option B — Deploy to Cloudflare button

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/qiayue/webgame)

This forks the repo and deploys in the browser. It's lighter on prerequisites
(no Node, no CLI) but Cloudflare's GitHub App permission flow gets stuck in a
loop for some accounts. If you see a "重新验证 / Re-verify" dialog that keeps
re-appearing after you approve it:

1. Open <https://github.com/settings/installations>.
2. Find **Cloudflare Workers and Pages** → Configure → Uninstall.
3. Optionally open <https://github.com/settings/applications> and Revoke any
   Cloudflare entry there too.
4. Retry the Deploy button in a fresh incognito window.

If that still loops, fall back to Option A.

After the deploy finishes (either path), the `/setup` wizard guides you the
rest of the way — config goes into a private R2 file (`_config/runtime.json`),
nothing sensitive is committed to GitHub.

## Wire up auto-deploy (recommended)

Out of the box, your Worker is deployed only when you (or the init
script) runs `npm run deploy` locally. To make edits in `/admin`
actually update the live site automatically — and to redeploy whenever
you `git push` — you need to enable the GitHub Actions workflow that
ships in `.github/workflows/deploy.yml`.

One-time setup:

1. Make sure you still have the Cloudflare API token you used during
   `npm run init`. If you lost it, generate a new one at
   <https://dash.cloudflare.com/profile/api-tokens> with the **Edit
   Cloudflare Workers** template plus the **Workers R2 Storage → Edit**
   permission.

2. Open your fork's settings on GitHub:
   `https://github.com/YOUR-USERNAME/YOUR-REPO/settings/secrets/actions`

3. Click **New repository secret**. Name it `CLOUDFLARE_API_TOKEN`,
   paste the token, save.

That's it. From here on:

- `git push` to your default branch → GitHub Actions runs → Worker
  redeploys.
- Edits in `/admin` (which commit to GitHub) trigger the same workflow.

You can still run `npm run deploy` locally any time to force an
immediate deploy.

## Syncing template updates

When upstream pushes a bug fix or new feature, pull it into your site with:

```bash
npm run sync
```

The sync script does NOT use `git merge` — that breaks for repositories
created via "Use this template" because the two histories share no
common commit. Instead it compares files between your repo and
`upstream/main` and overwrites the ones that differ, with two
protections built in:

- Files under `content/` are never touched — that's your data.
- `wrangler.toml` is taken from upstream, but your local `name`,
  `bucket_name`, and `account_id` are patched back in afterwards.

You stay on your own commit history; the sync just produces a normal
"chore: sync template" commit. After running it: `npm install`,
`git diff --staged` to review, then commit and push.

## Local development

```bash
npm install
npm run watch:css   # in one terminal
npm run dev         # in another
```

Visit `http://localhost:8787/setup` and walk the wizard. You'll need a real GitHub PAT and (optionally) a real R2 public URL to fully exercise the admin.

## Content structure

```
content/
  site.json              # site name, languages, menu, footer, ads, analytics
  index.json             # auto-generated page index (do not edit by hand)
  _page-files.ts         # auto-generated import registry (do not edit by hand)
  i18n/
    en.json              # UI strings per language
    zh.json
  pages/
    home/
      en.json            # homepage per language
    g/{lang}/{slug}.json # game pages
    t/{lang}/{slug}.json # tag pages
    p/{lang}/{slug}.json # guide pages
```

You normally don't need to touch these files directly — the admin edits them for you and commits the changes to GitHub.

## Page modules

| Module          | Purpose                                                       |
| --------------- | ------------------------------------------------------------- |
| `game-iframe`   | First-screen game splash + click-to-load iframe.              |
| `video-iframe`  | YouTube embed splash + click-to-load iframe (for guides).     |
| `page-list`     | List of pages (latest / related / by tag / manual).           |
| `seo-content`   | Structured SEO content. Variants: intro, rich-text, features-grid, steps, screenshots, pros-cons, faq, text-image. |

Every page must contain at least one `seo-content` module for SEO purposes.

## Architecture

- **No framework**: plain TypeScript + tagged-template HTML on the server, Tailwind CSS for styles, vanilla JS for the setup wizard and admin SPA.
- **Runtime config in R2** (`_config/runtime.json`): admin password hash, signing secrets, GitHub token, R2 public URL. Env vars are honoured as a fallback for advanced users.
- **Content in Git**: pages, site config, i18n strings — all version-controlled.
- **Admin flow**: admin SPA → Worker `/admin/api` → GitHub Contents API → CF auto-deploys → JSON re-bundled into the next version.
- **Security**: PBKDF2-hashed admin password, HMAC-signed session cookies (HttpOnly, SameSite=Strict), CSRF header on all writes, signed upload tokens for R2, per-IP login rate limiting.

## License

MIT
