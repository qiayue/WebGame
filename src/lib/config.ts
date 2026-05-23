import type { Env } from '../types';

// ---------------------------------------------------------------------------
// Runtime configuration.
//
// The site stores all per-deployment settings (admin password, GitHub token,
// R2 public URL, etc.) in a single JSON file inside the R2 bucket. This lets
// the one-click deploy work with zero pre-flight configuration — after the
// Worker is up, the user visits /setup and fills in the wizard.
//
// Environment variables are still honoured as a fallback for power users who
// prefer to manage config via `wrangler secret`. Values in env always win
// over values in R2 (an env override is intentional).
// ---------------------------------------------------------------------------

export interface RuntimeConfig {
  setupCompleted: boolean;
  adminPasswordHash: string;     // "{salt}:{base64-hash}", PBKDF2-SHA256
  sessionSecret: string;          // for HMAC-signing session cookies
  uploadSecret: string;           // for HMAC-signing R2 upload tokens
  r2: {
    publicBaseUrl: string;        // e.g. https://images.your-domain.com
  };
  // Legacy field: earlier versions of this template committed content to
  // GitHub. Kept as an optional shape so old configs deserialise cleanly;
  // the new code path does not touch GitHub for content edits.
  github?: { repo?: string; branch?: string; token?: string };
  createdAt: string;
  updatedAt: string;
}

const CONFIG_KEY = '_config/runtime.json';
const CACHE_TTL_MS = 30_000;

let cache: { value: RuntimeConfig; loadedAt: number } | null = null;

export async function loadConfig(env: Env): Promise<RuntimeConfig> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.value;

  let stored: Partial<RuntimeConfig> = {};
  try {
    const obj = await env.R2_UPLOADS.get(CONFIG_KEY);
    if (obj) stored = (await obj.json<Partial<RuntimeConfig>>()) ?? {};
  } catch {
    // R2 binding might not be available yet (e.g. during early dev) — fall
    // through and rely on env vars / defaults.
  }

  const config: RuntimeConfig = {
    setupCompleted: stored.setupCompleted ?? false,
    adminPasswordHash: stored.adminPasswordHash ?? '',
    sessionSecret: env.ADMIN_SESSION_SECRET || stored.sessionSecret || '',
    uploadSecret: env.R2_UPLOAD_SECRET || stored.uploadSecret || '',
    r2: {
      publicBaseUrl: env.R2_PUBLIC_BASE_URL || stored.r2?.publicBaseUrl || '',
    },
    createdAt: stored.createdAt ?? '',
    updatedAt: stored.updatedAt ?? '',
  };

  // Env-var bootstrap: a deployer who set ADMIN_PASSWORD directly skips the
  // wizard entirely. We materialise a hash on first request.
  if (env.ADMIN_PASSWORD && !config.adminPasswordHash) {
    config.adminPasswordHash = await hashPassword(env.ADMIN_PASSWORD);
    config.setupCompleted = true;
  }

  cache = { value: config, loadedAt: Date.now() };
  return config;
}

export async function saveConfig(env: Env, config: RuntimeConfig): Promise<void> {
  const next: RuntimeConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    createdAt: config.createdAt || new Date().toISOString(),
  };
  await env.R2_UPLOADS.put(CONFIG_KEY, JSON.stringify(next, null, 2), {
    httpMetadata: { contentType: 'application/json' },
  });
  cache = { value: next, loadedAt: Date.now() };
}

export function invalidateConfigCache(): void {
  cache = null;
}

export async function isR2Available(env: Env): Promise<boolean> {
  if (!env.R2_UPLOADS) return false;
  try {
    await env.R2_UPLOADS.head('_health/ping');
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2-SHA256, 100k iterations)
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt);
  return `${base64url(salt)}:${base64url(hash)}`;
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  const [saltB64, hashB64] = stored.split(':');
  if (!saltB64 || !hashB64) return false;
  let salt: Uint8Array;
  try {
    salt = fromBase64url(saltB64);
  } catch {
    return false;
  }
  const candidate = await pbkdf2(password, salt);
  return safeEqualBytes(candidate, fromBase64url(hashB64));
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export function randomSecret(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

function randomBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function safeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let acc = 0;
  for (let i = 0; i < a.length; i++) acc |= a[i]! ^ b[i]!;
  return acc === 0;
}
