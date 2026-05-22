#!/usr/bin/env node
// One-step deployment helper. Runs after the user has cloned their repo
// (either from "Use this template" or a fork).
//
// What it does, in order:
//   1. Asks the user for a Worker name and an R2 bucket name.
//   2. Updates wrangler.toml in place.
//   3. Ensures Cloudflare credentials are available (API token preferred;
//      falls back to `wrangler login` OAuth, with clear recovery hints if
//      OAuth fails — common in restrictive networks).
//   4. Creates the R2 bucket (ignores "already exists").
//   5. Builds the Tailwind CSS bundle.
//   6. Runs `wrangler deploy`.
//   7. Prints the deployed URL and tells the user where to go next.

import { spawn, spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { stdin as input, stdout as output, platform, env } from 'node:process';

const isWindows = platform === 'win32';

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  brand: '\x1b[38;5;99m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = (s = '') => console.log(s);
const step = (n, total, msg) => log(`\n${c.brand}${c.bold}[${n}/${total}]${c.reset} ${msg}`);
const ok = (msg) => log(`  ${c.green}✓${c.reset} ${msg}`);
const warn = (msg) => log(`  ${c.yellow}!${c.reset} ${msg}`);
const fail = (msg) => log(`  ${c.red}✗${c.reset} ${msg}`);

async function main() {
  log('');
  log(`${c.brand}${c.bold}webgame-template${c.reset} ${c.dim}— one-step deploy${c.reset}`);
  log('');
  log(`This will deploy this site to your own Cloudflare account. About 3 minutes.`);
  log(`The script can sign in via OAuth (opens a browser) or use a Cloudflare`);
  log(`API token. If you're on a network where Cloudflare's API is slow or blocked`);
  log(`(common in some regions), the API-token path is more reliable.`);
  log('');

  const rl = createInterface({ input, output });
  const ask = (q, def) =>
    new Promise((r) => rl.question(`${q}${def ? ` ${c.dim}(${def})${c.reset}` : ''} `, (a) => r((a || '').trim() || def || '')));

  // ----- Step 1: collect names -----
  step(1, 6, 'Pick a name for your site');
  // Pre-fill the prompts from the values already in wrangler.toml. That way
  // re-running init (e.g. to recover after a bad merge) is just "press enter
  // a few times".
  const tomlPathForDefaults = new URL('../wrangler.toml', import.meta.url);
  const existing = await readExistingTomlValues(tomlPathForDefaults);
  const defaultWorkerName =
    existing.name && existing.name !== 'webgame-template' ? existing.name : 'webgame';
  const defaultBucketName =
    existing.bucketName && existing.bucketName !== 'webgame-uploads'
      ? existing.bucketName
      : `${defaultWorkerName}-uploads`;
  const workerName = await ask(`  Worker name:`, defaultWorkerName);
  const bucketName = await ask(`  R2 bucket name:`, existing.bucketName && existing.bucketName !== 'webgame-uploads' ? existing.bucketName : `${workerName}-uploads`);
  rl.close();

  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(workerName)) {
    fail(`Worker name must be lowercase letters, digits, dashes; max 63 chars.`);
    process.exit(1);
  }
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucketName)) {
    fail(`Bucket name must be lowercase letters, digits, dashes; 2–63 chars.`);
    process.exit(1);
  }

  // ----- Step 2: rewrite wrangler.toml -----
  step(2, 6, 'Update wrangler.toml');
  const tomlPath = new URL('../wrangler.toml', import.meta.url);
  let toml;
  try {
    toml = await readFile(tomlPath, 'utf8');
  } catch {
    fail('wrangler.toml not found. Run this script from the project root.');
    process.exit(1);
  }
  const current = readTomlValues(toml);
  const nextToml = toml
    .replace(/^name\s*=\s*".*"/m, `name = "${workerName}"`)
    .replace(/(\[\[r2_buckets\]\][^\[]*?bucket_name\s*=\s*)"[^"]*"/s, `$1"${bucketName}"`);
  const after = readTomlValues(nextToml);

  if (after.name !== workerName) {
    fail(`Couldn't find "name = \"...\"" line in wrangler.toml — please edit it manually.`);
    process.exit(1);
  }
  if (after.bucketName !== bucketName) {
    fail(`Couldn't find bucket_name under [[r2_buckets]] in wrangler.toml — please edit it manually.`);
    process.exit(1);
  }
  if (nextToml !== toml) {
    await writeFile(tomlPath, nextToml);
    ok(`wrangler.toml: name="${workerName}", bucket="${bucketName}".`);
  } else {
    ok(`wrangler.toml already matches: name="${current.name}", bucket="${current.bucketName}".`);
  }

  // Register the git "ours" merge driver so that `npm run sync` (and
  // standard `git merge upstream/main`) auto-resolves content/ in favour of
  // the local copy. Idempotent — safe to re-run on every install.
  spawnSync('git', ['config', 'merge.ours.driver', 'true'], { shell: isWindows });

  // ----- Step 3: Cloudflare credentials -----
  step(3, 6, 'Sign in to Cloudflare');
  if (env.CLOUDFLARE_API_TOKEN) {
    ok('Using CLOUDFLARE_API_TOKEN from environment.');
  } else {
    const whoami = spawnSync('npx', ['wrangler', 'whoami'], { encoding: 'utf8', shell: isWindows });
    const isLoggedIn = whoami.status === 0 && /You are logged in/i.test(whoami.stdout || '');
    if (isLoggedIn) {
      ok('Already signed in.');
    } else {
      log(`  Opening browser for Cloudflare sign-in…`);
      log(`  ${c.dim}(If this hangs or times out — common in restrictive networks —`);
      log(`   cancel with Ctrl-C and follow the API-token instructions printed below.)${c.reset}`);
      try {
        await runStreaming('npx', ['wrangler', 'login']);
        ok('Signed in.');
      } catch {
        log('');
        fail(`OAuth login failed. This is usually a network issue (Cloudflare API unreachable).`);
        log('');
        log(`${c.bold}Try the API-token path instead:${c.reset}`);
        log(`  1. Open ${c.cyan}https://dash.cloudflare.com/profile/api-tokens${c.reset}`);
        log(`     (use a VPN/proxy if needed — only this initial step needs network access to CF).`);
        log(`  2. Create Token → use the ${c.bold}"Edit Cloudflare Workers"${c.reset} template.`);
        log(`  3. Under Permissions, add: ${c.bold}Account → Workers R2 Storage → Edit${c.reset}.`);
        log(`  4. Continue → Create Token → copy the token.`);
        log(`  5. Re-run this script with the token:`);
        log('');
        log(`     ${c.cyan}CLOUDFLARE_API_TOKEN=your-token-here npm run init${c.reset}`);
        log('');
        process.exit(1);
      }
    }
  }

  // Pick a Cloudflare account if the user has more than one. We persist the
  // choice to wrangler.toml so every subsequent `wrangler` invocation —
  // including future redeploys — uses the right account without prompting.
  let accountId = await resolveAccountId();
  if (!accountId) {
    fail(`Couldn't determine a Cloudflare account ID. Please re-run with`);
    log(`  ${c.cyan}CLOUDFLARE_ACCOUNT_ID=your-id npm run init${c.reset}`);
    process.exit(1);
  }
  await persistAccountId(tomlPath, accountId);
  env.CLOUDFLARE_ACCOUNT_ID = accountId;
  ok(`Using account: ${accountId}`);

  // ----- Step 4: create R2 bucket -----
  step(4, 6, `Create R2 bucket "${bucketName}"`);
  const create = spawnSync('npx', ['wrangler', 'r2', 'bucket', 'create', bucketName], {
    encoding: 'utf8',
    shell: isWindows,
  });
  const combined = `${create.stdout || ''}${create.stderr || ''}`;
  if (create.status === 0) ok('Bucket created.');
  else if (/already exists/i.test(combined)) ok('Bucket already exists — reusing.');
  else {
    fail('Bucket create failed:');
    log(combined.trim().split('\n').map((l) => `    ${l}`).join('\n'));
    process.exit(1);
  }

  // ----- Step 5: build CSS -----
  step(5, 6, 'Build CSS');
  await runStreaming('npm', ['run', 'build:css']);
  ok('CSS built.');

  // ----- Step 6: deploy -----
  step(6, 6, 'Deploy the Worker');
  await runStreaming('npx', ['wrangler', 'deploy']);

  log('');
  log(`${c.green}${c.bold}✓ Deployed!${c.reset}`);
  log('');
  log(`Your Worker is live. Look for the "https://${workerName}.<...>.workers.dev"`);
  log(`URL printed just above this message.`);
  log('');
  log(`${c.bold}What to do next:${c.reset}`);
  log(`  1. Open that URL. You'll be redirected to ${c.cyan}/setup${c.reset}.`);
  log(`  2. Walk through the wizard: admin password → GitHub token → R2 public URL.`);
  log(`  3. After the wizard you land at ${c.cyan}/admin${c.reset} and can add games.`);
  log('');
  log(`${c.dim}Tip: re-run \`npm run deploy\` whenever you want to push code changes.${c.reset}`);
}

function readTomlValues(toml) {
  const nameMatch = toml.match(/^name\s*=\s*"([^"]*)"/m);
  const bucketMatch = toml.match(/(?:\[\[r2_buckets\]\][^\[]*?)bucket_name\s*=\s*"([^"]*)"/s);
  return { name: nameMatch?.[1], bucketName: bucketMatch?.[1] };
}

async function readExistingTomlValues(tomlPath) {
  try {
    const t = await readFile(tomlPath, 'utf8');
    return readTomlValues(t);
  } catch {
    return {};
  }
}

function runStreaming(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: isWindows });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`))));
  });
}

// ---------------------------------------------------------------------------
// Cloudflare account selection.
//
// In the OAuth case the user might have several accounts; wrangler can't
// pick one without an interactive TTY (and ours isn't quite one). We do
// our own pick. The chosen ID is persisted as `account_id = "..."` in
// wrangler.toml so future `wrangler deploy` calls don't need it.
// ---------------------------------------------------------------------------

async function resolveAccountId() {
  // 1. Explicit env var wins.
  if (env.CLOUDFLARE_ACCOUNT_ID) return env.CLOUDFLARE_ACCOUNT_ID;

  // 2. Already pinned in wrangler.toml? Re-use.
  try {
    const toml = await readFile(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const m = toml.match(/^account_id\s*=\s*"([0-9a-f]{32})"/m);
    if (m) return m[1];
  } catch { /* fall through */ }

  // 3. Probe wrangler for the available accounts.
  const accounts = listAccounts();

  if (accounts.length === 1) return accounts[0].id;
  if (accounts.length === 0) {
    // Token auth without listable accounts is fine — wrangler will figure
    // it out from the token itself.
    return null;
  }

  // 4. Multiple accounts — ask.
  log('');
  log(`  You have access to ${accounts.length} Cloudflare accounts. Pick one:`);
  for (let i = 0; i < accounts.length; i++) {
    log(`    ${c.bold}${i + 1}${c.reset}. ${accounts[i].name}  ${c.dim}(${accounts[i].id})${c.reset}`);
  }
  const rl = createInterface({ input, output });
  const ans = await new Promise((r) =>
    rl.question(`  Pick a number (1-${accounts.length}): `, (a) => r((a || '').trim())),
  );
  rl.close();
  const idx = parseInt(ans, 10) - 1;
  if (!Number.isFinite(idx) || idx < 0 || idx >= accounts.length) {
    fail('Invalid choice.');
    process.exit(1);
  }
  return accounts[idx].id;
}

function listAccounts() {
  const r = spawnSync('npx', ['wrangler', 'whoami'], { encoding: 'utf8', shell: isWindows });
  const text = `${r.stdout || ''}\n${r.stderr || ''}`;
  const accounts = [];
  const seen = new Set();
  // Strategy: scan each line for a 32-char hex account ID. Whatever text
  // appears before it (after stripping decorators) is the account name.
  // This works for both wrangler whoami's table output and the
  // "Available accounts are:" listing in error messages.
  for (const line of text.split('\n')) {
    const idMatch = line.match(/\b([0-9a-f]{32})\b/);
    if (!idMatch) continue;
    const id = idMatch[1];
    if (seen.has(id)) continue;
    const before = line.slice(0, idMatch.index);
    const name = before.replace(/[│|`":]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || /account (id|name)/i.test(name)) continue;
    seen.add(id);
    accounts.push({ name, id });
  }
  return accounts;
}

async function persistAccountId(tomlPath, accountId) {
  const toml = await readFile(tomlPath, 'utf8');
  if (/^account_id\s*=/m.test(toml)) {
    // Already set — only rewrite if it differs.
    const next = toml.replace(/^account_id\s*=\s*"[^"]*"/m, `account_id = "${accountId}"`);
    if (next !== toml) await writeFile(tomlPath, next);
    return;
  }
  // Insert just after the `main = "..."` line for a stable position.
  const next = toml.replace(/^(main\s*=\s*"[^"]*"\n)/m, `$1account_id = "${accountId}"\n`);
  if (next === toml) {
    // No `main =` to anchor on — prepend at the top.
    await writeFile(tomlPath, `account_id = "${accountId}"\n${toml}`);
  } else {
    await writeFile(tomlPath, next);
  }
}

main().catch((err) => {
  log('');
  fail(err.message || String(err));
  process.exit(1);
});
