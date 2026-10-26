import { hasSession, validSecret, readJson, HttpError } from "./security";
// Build Share: Daro uploads a test APK, testers get a short link (/i/<id>) with a download page.
//
// Storage: the R2 bucket bound as BUILDS ("app-builds"). Each build is two objects:
//   builds/<id>.json  details shown on the download page (name, icon, version…)
//   builds/<id>.apk   the APK itself
// Only someone with UPLOAD_SECRET (a Cloudflare secret) can upload, list or delete.
// Builds expire after 1–7 days; expired ones are deleted on the next upload/list and by a daily cron.
// The APK is uploaded in parts (R2 multipart upload) because a Worker request body is limited to 100 MB.

export interface R2Object {
  key: string;
  size: number;
  uploaded: Date;
}
export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  text(): Promise<string>;
}
export interface R2MultipartUpload {
  uploadId: string;
  uploadPart(partNumber: number, value: ReadableStream): Promise<{ partNumber: number; etag: string }>;
  complete(parts: { partNumber: number; etag: string }[]): Promise<R2Object>;
  abort(): Promise<void>;
}
export interface R2Bucket {
  createMultipartUpload(key: string, options?: { httpMetadata?: { contentType?: string } }): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
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

export const MAX_APK = 150 * 1024 * 1024;
export const PART_SIZE = 25 * 1024 * 1024; // each upload request stays well under the Worker's 100 MB body limit
export const STORAGE_CAP = 5 * 1024 * 1024 * 1024; // stay at half of R2's free 10 GB
const DAYS = [1, 3, 7];
export const MAX_COUNTED = 999; // downloads shown as "999+" after this
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
  uploadId?: string; // set while the APK parts are still being uploaded
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const metaKey = (id: string) => `builds/${id}.json`;
const apkKey = (id: string) => `builds/${id}.apk`;
function newId() {
  const r = crypto.getRandomValues(new Uint8Array(24));
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

async function removeBuild(bucket: R2Bucket, id: string, uploadId?: string) {
  if (uploadId) await bucket.resumeMultipartUpload(apkKey(id), uploadId).abort().catch(() => {});
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
      await removeBuild(bucket, id, m?.uploadId);
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
  const { ready: _ready, uploadId: _uploadId, ...rest } = m;
  return rest;
};

function safeFileName(m: BuildMeta) {
  const base = `${m.label}-${m.versionName}`.replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-").slice(0, 80) || "app";
  return `${base}.apk`;
}

export async function handleBuilds(request: Request, env: BuildEnv, url: URL, waitUntil: (p: Promise<unknown>) => void): Promise<Response> {
  const bucket = env.BUILDS;
  if (!bucket || !validSecret(env.UPLOAD_SECRET)) return json({ ok: false, error: "Build sharing isn't set up yet." }, 503);
  const parts = url.pathname.split("/").filter(Boolean); // ["api", "builds", id?, action?]
  const id = parts[2];
  const action = parts[3];
  if (parts.length > 4 || (id && !/^[a-z0-9]{7,24}$/.test(id))) return json({ ok: false, error: "Not found." }, 404);
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
    // Count downloads, but stop writing at MAX_COUNTED so repeated downloads can't run up R2 write costs.
    if (method === "GET" && (m.downloads ?? 0) < MAX_COUNTED) waitUntil(bucket.put(metaKey(id), JSON.stringify({ ...m, downloads: (m.downloads ?? 0) + 1 })));
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
  if (!(await hasSession(request, env.UPLOAD_SECRET))) return json({ ok: false, error: "Wrong password." }, 401);

  if (!id && method === "GET") {
    const { builds, used } = await sweep(bucket);
    return json({ ok: true, builds: builds.map((m) => ({ ...publicMeta(m), ready: m.ready })), used, cap: STORAGE_CAP });
  }

  if (!id && method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await readJson(request, 220_000);
    } catch (error) {
      if (error instanceof HttpError) throw error;
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
    const upload = await bucket.createMultipartUpload(apkKey(newKey), { httpMetadata: { contentType: "application/vnd.android.package-archive" } });
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
      uploadId: upload.uploadId,
    };
    await bucket.put(metaKey(newKey), JSON.stringify(meta), { httpMetadata: { contentType: "application/json" } });
    return json({ ok: true, id: newKey, partSize: PART_SIZE });
  }

  // Upload one part of the APK: PUT /api/builds/<id>/part?n=1 (parts are numbered from 1).
  if (id && action === "part" && method === "PUT") {
    const m = await readMeta(bucket, id);
    if (!m || m.ready || !m.uploadId || !isLive(m)) return json({ ok: false, error: "This upload was already finished or doesn't exist." }, 409);
    const n = Number(url.searchParams.get("n"));
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isInteger(n) || n < 1 || n > Math.ceil(m.size / PART_SIZE)) return json({ ok: false, error: "Bad part number." }, 400);
    if (length !== Math.min(PART_SIZE, m.size - (n - 1) * PART_SIZE) || !request.body) return json({ ok: false, error: "Bad part size." }, 413);
    const part = await bucket.resumeMultipartUpload(apkKey(id), m.uploadId).uploadPart(n, request.body);
    return json({ ok: true, partNumber: part.partNumber, etag: part.etag });
  }

  // Join the parts into the final APK: POST /api/builds/<id>/complete { parts: [{ partNumber, etag }] }
  if (id && action === "complete" && method === "POST") {
    const m = await readMeta(bucket, id);
    if (!m || m.ready || !m.uploadId || !isLive(m)) return json({ ok: false, error: "This upload was already finished or doesn't exist." }, 409);
    let parts: { partNumber: number; etag: string }[] = [];
    try {
      const body = (await readJson(request, 4096)) as { parts?: unknown };
      parts = Array.isArray(body.parts) ? body.parts.filter((p): p is { partNumber: number; etag: string } => !!p && typeof p.partNumber === "number" && typeof p.etag === "string") : [];
    } catch (error) { if (error instanceof HttpError) throw error; }
    if (parts.length !== Math.ceil(m.size / PART_SIZE) || parts.some((p, i) => !Number.isInteger(p.partNumber) || p.partNumber !== i + 1 || !p.etag || p.etag.length > 200)) return json({ ok: false, error: "Invalid upload parts." }, 400);
    if (!parts.length) return json({ ok: false, error: "Couldn't read the request." }, 400);
    try {
      await bucket.resumeMultipartUpload(apkKey(id), m.uploadId).complete(parts.sort((a, b) => a.partNumber - b.partNumber));
    } catch {
      await removeBuild(bucket, id, m.uploadId);
      return json({ ok: false, error: "The upload was cut off. Try again." }, 400);
    }
    const stored = await bucket.head(apkKey(id));
    if (!stored || stored.size !== m.size) {
      await removeBuild(bucket, id);
      return json({ ok: false, error: "The upload was cut off. Try again." }, 400);
    }
    const { uploadId: _done, ...rest } = m;
    await bucket.put(metaKey(id), JSON.stringify({ ...rest, ready: true }));
    return json({ ok: true, id, url: `${url.origin}/i/${id}` });
  }

  if (id && !action && method === "DELETE") {
    await removeBuild(bucket, id, (await readMeta(bucket, id))?.uploadId);
    return json({ ok: true });
  }

  return json({ ok: false, error: "Not found." }, 404);
}
