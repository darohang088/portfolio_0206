// Build Share: Daro uploads a test APK, testers get a short link (/i/<id>) with a download page.
//
// Storage: the R2 bucket bound as BUILDS ("app-builds"). Each build is two objects:
//   builds/<id>.json  details shown on the download page (name, icon, version…)
//   builds/<id>.apk   the APK itself
// Only someone with UPLOAD_SECRET (a Cloudflare secret) can upload, list or delete.
// Builds expire after 1–7 days; expired ones are deleted on the next upload/list and by a daily cron.

export interface R2Object {
  key: string;
  size: number;
  uploaded: Date;
}
export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  text(): Promise<string>;
}
export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | string | null, options?: { httpMetadata?: { contentType?: string } }): Promise<R2Object | null>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: { prefix?: string; cursor?: string; limit?: number }): Promise<{ objects: R2Object[]; truncated: boolean; cursor?: string }>;
}

export interface BuildEnv {
  BUILDS?: R2Bucket;
  UPLOAD_SECRET?: string;
}

export const MAX_APK = 95 * 1024 * 1024; // Workers accept request bodies up to 100 MB
export const STORAGE_CAP = 5 * 1024 * 1024 * 1024; // stay at half of R2's free 10 GB
const DAYS = [1, 3, 7];
const PENDING_TTL = 60 * 60 * 1000; // an upload that never finished is removed after an hour
const ID_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";

export type BuildInfo = {
  label: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk?: number;
  targetSdk?: number;
  abis: string[];
  debuggable: boolean;
  testOnly: boolean;
  split: boolean;
  debugKey: boolean | null;
  signed: boolean;
};
export type BuildMeta = BuildInfo & {
  id: string;
  fileName: string;
  size: number;
  icon: string | null;
  note: string;
  created: number;
  expires: number;
  ready: boolean;
  downloads: number;
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const metaKey = (id: string) => `builds/${id}.json`;
const apkKey = (id: string) => `builds/${id}.apk`;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Compare secrets without leaking how many characters matched.
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ua = new Uint8Array(x);
  const ub = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

async function isOwner(request: Request, env: BuildEnv) {
  const given = /^Bearer (.+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ?? "";
  if (given && env.UPLOAD_SECRET && (await sameSecret(given, env.UPLOAD_SECRET))) return true;
  await sleep(600); // slow down password guessing
  return false;
}

function newId() {
  const r = crypto.getRandomValues(new Uint8Array(7));
  return [...r].map((n) => ID_CHARS[n % ID_CHARS.length]).join("");
}

async function readMeta(bucket: R2Bucket, id: string): Promise<BuildMeta | null> {
  const o = await bucket.get(metaKey(id));
  if (!o) return null;
  try {
    return JSON.parse(await o.text()) as BuildMeta;
  } catch {
    return null;
  }
}

const isLive = (m: BuildMeta, now = Date.now()) => m.expires > now && (m.ready || now - m.created < PENDING_TTL);

async function removeBuild(bucket: R2Bucket, id: string) {
  await bucket.delete([metaKey(id), apkKey(id)]);
}

// Lists every build, deleting the expired ones on the way. Returns the live ones and the bytes they use.
export async function sweep(bucket: R2Bucket): Promise<{ builds: BuildMeta[]; used: number }> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: "builds/", cursor, limit: 1000 });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const now = Date.now();
  const sizes = new Map(objects.filter((o) => o.key.endsWith(".apk")).map((o) => [o.key.slice(7, -4), o.size]));
  const builds: BuildMeta[] = [];
  let used = 0;
  for (const o of objects.filter((x) => x.key.endsWith(".json"))) {
    const id = o.key.slice(7, -5);
    const m = await readMeta(bucket, id);
    if (!m || !isLive(m, now)) {
      await removeBuild(bucket, id);
      continue;
    }
    builds.push(m);
    used += sizes.get(id) ?? (m.ready ? 0 : m.size);
    sizes.delete(id);
  }
  // An APK without its details file is left over from a failed upload.
  for (const id of sizes.keys()) await bucket.delete(apkKey(id));
  builds.sort((a, b) => b.created - a.created);
  return { builds, used };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);

// Only the fields a download page needs, with limits on size.
export function cleanInfo(v: unknown): BuildInfo | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const packageName = str(o.packageName, 200);
  if (!packageName) return null;
  return {
    label: str(o.label, 80) || packageName,
    packageName,
    versionName: str(o.versionName, 60) || "—",
    versionCode: str(o.versionCode, 30) || "—",
    minSdk: int(o.minSdk),
    targetSdk: int(o.targetSdk),
    abis: Array.isArray(o.abis) ? o.abis.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 20)).slice(0, 8) : [],
    debuggable: o.debuggable === true,
    testOnly: o.testOnly === true,
    split: o.split === true,
    debugKey: o.debugKey === true ? true : o.debugKey === false ? false : null,
    signed: o.signed !== false,
  };
}

// What testers can see: no upload state.
const publicMeta = (m: BuildMeta) => {
  const { ready: _ready, ...rest } = m;
  return rest;
};

function safeFileName(m: BuildMeta) {
  const base = `${m.label}-${m.versionName}`.replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(0, 80) || "app";
  return `${base}.apk`;
}

export async function handleBuilds(request: Request, env: BuildEnv, url: URL, waitUntil: (p: Promise<unknown>) => void): Promise<Response> {
  const bucket = env.BUILDS;
  if (!bucket || !env.UPLOAD_SECRET) return json({ ok: false, error: "Build sharing isn't set up yet." }, 503);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "builds", id?, action?]
  const id = parts[2];
  const action = parts[3];
  const method = request.method;

  // ---- public: details and download ----
  if (id && !action && method === "GET") {
    const m = await readMeta(bucket, id);
    if (!m || !m.ready) return json({ ok: false, error: "not_found" }, 404);
    if (!isLive(m)) {
      waitUntil(removeBuild(bucket, id));
      return json({ ok: false, error: "expired" }, 410);
    }
    return json({ ok: true, build: publicMeta(m) });
  }
  if (id && action === "download" && (method === "GET" || method === "HEAD")) {
    const m = await readMeta(bucket, id);
    if (!m || !m.ready || !isLive(m)) return new Response("This link has expired or doesn't exist.", { status: 404 });
    const o = await bucket.get(apkKey(id));
    if (!o) return new Response("This build is no longer available.", { status: 404 });
    if (method === "GET") waitUntil(bucket.put(metaKey(id), JSON.stringify({ ...m, downloads: (m.downloads ?? 0) + 1 })));
    const name = safeFileName(m);
    return new Response(method === "HEAD" ? null : o.body, {
      headers: {
        "content-type": "application/vnd.android.package-archive",
        "content-length": String(o.size),
        "content-disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  // ---- owner only ----
  if (!(await isOwner(request, env))) return json({ ok: false, error: "Wrong password." }, 401);

  if (!id && method === "GET") {
    const { builds, used } = await sweep(bucket);
    return json({ ok: true, builds: builds.map((m) => ({ ...publicMeta(m), ready: m.ready })), used, cap: STORAGE_CAP });
  }

  if (!id && method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "Couldn't read the request." }, 400);
    }
    const info = cleanInfo(body.info);
    const size = int(body.size) ?? 0;
    const days = DAYS.includes(int(body.days) ?? 0) ? (int(body.days) as number) : 3;
    if (!info) return json({ ok: false, error: "Missing app details." }, 400);
    if (size <= 0 || size > MAX_APK) return json({ ok: false, error: `The APK must be under ${MAX_APK / 1024 / 1024} MB.` }, 413);
    const { used } = await sweep(bucket);
    if (used + size > STORAGE_CAP) return json({ ok: false, error: "Storage is full (5 GB). Delete an old build first." }, 507);
    const icon = typeof body.icon === "string" && body.icon.startsWith("data:image/png;base64,") && body.icon.length < 200_000 ? body.icon : null;
    let newKey = newId();
    while (await bucket.head(metaKey(newKey))) newKey = newId();
    const now = Date.now();
    const meta: BuildMeta = {
      ...info,
      id: newKey,
      fileName: str(body.fileName, 120) || "app.apk",
      size,
      icon,
      note: str(body.note, 500),
      created: now,
      expires: now + days * 24 * 60 * 60 * 1000,
      ready: false,
      downloads: 0,
    };
    await bucket.put(metaKey(newKey), JSON.stringify(meta), { httpMetadata: { contentType: "application/json" } });
    return json({ ok: true, id: newKey });
  }

  if (id && action === "apk" && method === "PUT") {
    const m = await readMeta(bucket, id);
    if (!m || m.ready) return json({ ok: false, error: "This upload was already finished or doesn't exist." }, 409);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!length || length > MAX_APK || !request.body) return json({ ok: false, error: `The APK must be under ${MAX_APK / 1024 / 1024} MB.` }, 413);
    await bucket.put(apkKey(id), request.body, { httpMetadata: { contentType: "application/vnd.android.package-archive" } });
    const stored = await bucket.head(apkKey(id));
    if (!stored || stored.size !== length) {
      await removeBuild(bucket, id);
      return json({ ok: false, error: "The upload was cut off. Try again." }, 400);
    }
    await bucket.put(metaKey(id), JSON.stringify({ ...m, size: stored.size, ready: true }));
    return json({ ok: true, id, url: `${url.origin}/i/${id}` });
  }

  if (id && !action && method === "DELETE") {
    await removeBuild(bucket, id);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Not found." }, 404);
}
