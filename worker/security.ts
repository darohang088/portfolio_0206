export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// Count bytes as they arrive; Content-Length alone is not a trustworthy limit.
export async function readJson(request: Request, max: number): Promise<Record<string, unknown>> {
  if ((request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase() !== "application/json") throw new HttpError(415, "Use application/json.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { await reader.cancel(); throw new HttpError(413, "Request too large."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new HttpError(400, "Invalid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Expected a JSON object.");
  return value as Record<string, unknown>;
}

export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new HttpError(403, "Request origin rejected.");
}

const COOKIE = "__Host-build-session";
const TTL = 3600;
const enc = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, "0")).join("");
async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function matchesSecret(given: string, expected: string) {
  const k = await key(expected);
  const tag = await crypto.subtle.sign("HMAC", k, enc.encode("owner-login:" + expected));
  return crypto.subtle.verify("HMAC", k, tag, enc.encode("owner-login:" + given));
}
export function validSecret(secret?: string): secret is string { return !!secret && secret.length >= 32; }
export async function sessionCookie(secret: string) {
  const payload = `${Math.floor(Date.now() / 1000) + TTL}.${hex(crypto.getRandomValues(new Uint8Array(16)).buffer)}`;
  const signature = hex(await crypto.subtle.sign("HMAC", await key(secret), enc.encode("owner-session:" + payload)));
  return `${COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${TTL}`;
}
export const clearSessionCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function hasSession(request: Request, secret: string) {
  const value = request.headers.get("cookie")?.split(";").map(s => s.trim()).find(s => s.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  const match = /^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(value ?? "");
  if (!match) return false;
  const now = Math.floor(Date.now() / 1000), expiry = Number(match[1]);
  if (expiry <= now || expiry > now + TTL) return false;
  const signature = new Uint8Array(match[3].match(/../g)!.map(s => parseInt(s, 16)));
  return crypto.subtle.verify("HMAC", await key(secret), signature, enc.encode(`owner-session:${match[1]}.${match[2]}`));
}

export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
};

// Worker-generated HTML does not automatically receive static asset header rules.
export async function htmlCsp(html: string) {
  const hashes = await Promise.all([...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(m => !/\bsrc\s*=/i.test(m[1]))
    .map(async m => {
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(m[2])));
      return `'sha256-${btoa(String.fromCharCode(...digest))}'`;
    }));
  return `default-src 'self'; script-src 'self' ${[...new Set(hashes)].join(" ")}; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`;
}
