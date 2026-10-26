import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;
const dir = mkdtempSync(join(tmpdir(), 'portfolio-security-'));
try {
  execFileSync('node_modules/.bin/tsc', ['worker/index.ts', 'worker/builds.ts', 'worker/security.ts', '--outDir', dir, '--strict', '--target', 'ES2022', '--module', 'commonjs', '--lib', 'ES2022,DOM', '--skipLibCheck']);
  const require = createRequire(import.meta.url);
  const s = require(join(dir, 'security.js'));
  const worker = require(join(dir, 'index.js')).default;
  const origin = 'https://portfolio.example';
  const secret = 'a'.repeat(64);
  const ctx = { waitUntil() {} };
  const allow = { limit: async () => ({ success: true }) };
  const env = { UPLOAD_SECRET: secret, RL_OWNER: allow, RL_CHAT: allow, RL_BUILDS: allow };
  const req = (path, method = 'GET', body, cookie) => new Request(origin + path, { method, headers: { origin, 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  assert.equal(s.validSecret('short'), false);
  assert.equal(await s.matchesSecret(secret, secret), true);
  assert.equal(await s.matchesSecret('wrong', secret), false);
  let res = await worker.fetch(req('/api/session', 'POST', { password: secret }), env, ctx);
  assert.equal(res.status, 200);
  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly; Secure; SameSite=Strict; Max-Age=3600/);
  const cookie = setCookie.split(';')[0];
  assert.equal(await s.hasSession(req('/api/session', 'GET', undefined, cookie), secret), true);
  assert.equal(await s.hasSession(req('/api/session', 'GET', undefined, cookie + '0'), secret), false);
  assert.equal(await s.hasSession(req('/api/session', 'GET', undefined, cookie), 'b'.repeat(64)), false);
  const realNow = Date.now;
  Date.now = () => realNow() + 3601_000;
  assert.equal(await s.hasSession(req('/api/session', 'GET', undefined, cookie), secret), false);
  Date.now = realNow;
  res = await worker.fetch(req('/api/session', 'POST', { password: 'wrong' }), env, ctx);
  assert.equal(res.status, 401);
  res = await worker.fetch(new Request(origin + '/api/session', { method: 'DELETE', headers: { origin: 'https://evil.example' } }), env, ctx);
  assert.equal(res.status, 403);
  res = await worker.fetch(req('/api/session'), { ...env, RL_OWNER: undefined }, ctx);
  assert.equal(res.status, 503);
  res = await worker.fetch(req('/api/session'), { ...env, RL_OWNER: { limit: async () => { throw Error(); } } }, ctx);
  assert.equal(res.status, 503);
  res = await worker.fetch(req('/api/session'), { ...env, RL_OWNER: { limit: async () => ({ success: false }) } }, ctx);
  assert.equal(res.status, 429);
  res = await worker.fetch(req('/api/session', 'POST', { password: secret, padding: 'x'.repeat(3000) }), env, ctx);
  assert.equal(res.status, 413);
  for (const body of [null, [], 'bad']) {
    res = await worker.fetch(req('/api/message', 'POST', body), { ...env, TELEGRAM_BOT_TOKEN: 'test', TELEGRAM_CHAT_ID: 'test' }, ctx);
    assert.equal(res.status, 400);
  }
  res = await worker.fetch(req('/api/builds'), { ...env, BUILDS: {} }, ctx);
  assert.equal(res.status, 401);
  res = await worker.fetch(req('/api/session', 'DELETE', undefined, cookie), env, ctx);
  assert.match(res.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  const html = '<script>console.log("test")</script><script src="/app.js"></script>';
  res = await worker.fetch(req('/i/abcdefgh'), { ...env, ASSETS: { fetch: async () => new Response(html, { headers: { 'content-type': 'text/html' } }) } }, ctx);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-security-policy'), await s.htmlCsp(html));
  assert.match(res.headers.get('content-security-policy'), /sha256-/);
  const objects = new Map();
  let partCount = 0;
  const bucket = {
    list: async () => ({ objects: [...objects.keys()].map(key => ({ key, size: 5 })), truncated: false }),
    get: async key => objects.has(key) ? { text: async () => objects.get(key) } : null,
    head: async key => objects.has(key) ? { size: key.endsWith('.apk') ? 5 : objects.get(key).length } : null,
    put: async (key, value) => { objects.set(key, value); },
    createMultipartUpload: async () => ({ uploadId: 'test-upload' }),
    resumeMultipartUpload: key => ({
      uploadPart: async n => { partCount++; return { partNumber: n, etag: 'test-etag' }; },
      complete: async () => { objects.set(key, 'dummy'); },
      abort: async () => {},
    }),
    delete: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key); },
  };
  const buildEnv = { ...env, BUILDS: bucket };
  res = await worker.fetch(req('/api/builds', 'POST', { info: { packageName: 'test.app' }, size: 5 }, cookie), buildEnv, ctx);
  assert.equal(res.status, 200);
  const { id } = await res.json();
  assert.equal(id.length, 24);
  const part = (length, n = 1) => new Request(`${origin}/api/builds/${id}/part?n=${n}`, { method: 'PUT', headers: { origin, cookie, 'content-length': String(length) }, body: 'dummy' });
  res = await worker.fetch(part(6), buildEnv, ctx);
  assert.equal(res.status, 413);
  res = await worker.fetch(part(5, 2), buildEnv, ctx);
  assert.equal(res.status, 400);
  assert.equal(partCount, 0);
  res = await worker.fetch(part(5), buildEnv, ctx);
  assert.equal(res.status, 200);
  res = await worker.fetch(req(`/api/builds/${id}/complete`, 'POST', { parts: [{ partNumber: 1, etag: 'test-etag' }] }, cookie), buildEnv, ctx);
  assert.equal(res.status, 200);
  res = await worker.fetch(req(`/api/builds/${id}`), buildEnv, ctx);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).build.uploadId, undefined);
  res = await worker.fetch(req('/api/builds/public'), buildEnv, ctx);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).builds.length, 1);
  res = await worker.fetch(req(`/api/builds/${id}`, 'PATCH', { listed: false }, cookie), buildEnv, ctx);
  assert.equal(res.status, 200);
  res = await worker.fetch(req('/api/builds/public'), buildEnv, ctx);
  assert.equal((await res.json()).builds.length, 0);

  res = await worker.fetch(req(`/api/builds/${id}`, 'DELETE'), buildEnv, ctx);
  assert.equal(res.status, 401);
  assert.equal(objects.size, 2);
  res = await worker.fetch(req(`/api/builds/${id}`, 'DELETE', undefined, cookie), buildEnv, ctx);
  assert.equal(res.status, 200);
  assert.equal(objects.size, 0);
  const headers = readFileSync('out/_headers', 'utf8');
  assert.ok(headers.split('\n').every(line => line.length <= 2000));
  assert.ok(headers.split('\n').filter(line => line.startsWith('/')).length <= 100);
  assert.ok(!headers.includes("script-src 'self' 'unsafe-inline'"));
  console.log('Security checks passed: sessions, tampering, expiry, CSRF, rate-limit outages, request limits, authorization, logout and CSP limits.');
} finally { rmSync(dir, { recursive: true, force: true }); }
