import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root = 'out';
const base = [
  '  X-Content-Type-Options: nosniff',
  '  X-Frame-Options: DENY',
  '  Referrer-Policy: no-referrer',
  '  Strict-Transport-Security: max-age=31536000',
  '  Permissions-Policy: camera=(self), microphone=(), geolocation=()',
];
let rules = ['/*', ...base, ''];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await walk(path); continue; }
    if (!path.endsWith('.html')) continue;
    const html = await readFile(path, 'utf8');
    const hashes = [...new Set([...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
      .filter(m => !/\bsrc\s*=/i.test(m[1]))
      .map(m => `'sha256-${createHash('sha256').update(m[2]).digest('base64')}'`))];
    const route = '/' + relative(root, path).replaceAll('\\', '/');
    const exceptions = route === '/test.html' ? '; frame-src https: http://localhost:* http://127.0.0.1:*' : '';
    const connect = route === '/khqr.html' ? "'self' https:" : "'self'";
    const policy = `default-src 'self'; script-src 'self' ${hashes.join(' ')}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src ${connect}; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'${exceptions}`;
    const aliases = new Set([route, route.replace(/\/index\.html$/, '/') || '/', route.replace(/\.html$/, '')]);
    if (route === '/install.html') aliases.add('/i/*');
    for (const alias of aliases) rules.push(alias, `  Content-Security-Policy: ${policy}`, '');
  }
}
await walk(root);
await writeFile(join(root, '_headers'), rules.join('\n'));
console.log('Generated security headers and page-specific CSP script hashes.');
