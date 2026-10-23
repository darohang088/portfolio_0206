// Background-removal worker (plain JS module, served as-is from /bg/).
// Loads ONNX Runtime Web and a segmentation model from split parts, caches them in Cache Storage,
// and turns an image into a 1024 × 1024 foreground mask (0..1).
//   best:     BiRefNet-lite on the GPU (WebGPU with 16-bit float shaders)
//   standard: ISNet on the CPU (WASM), for every other browser, or after a GPU failure
// The CPU can't run BiRefNet: at 1024 × 1024 it needs about 7 GB, over WASM's 4 GB ceiling.

const BASE = new URL("./", self.location.href);
const CACHE = "bg-remove-v1";
const SIZE = 1024;

let ready = null; // Promise<{ ort, session, tier, meta }>

const post = (type, data = {}) => self.postMessage({ type, ...data });

// Download every part (or take them from the cache), join them and check the SHA-256.
async function loadAsset(meta, label, onBytes) {
  const cache = await caches.open(CACHE).catch(() => null);
  const key = new URL(`${meta.parts[0]}?sha=${meta.sha256}`, BASE).href;
  const hit = cache && (await cache.match(key));
  if (hit) {
    const buf = await hit.arrayBuffer();
    onBytes(buf.byteLength);
    return buf;
  }
  const out = new Uint8Array(meta.size);
  let offset = 0;
  for (const part of meta.parts) {
    const res = await fetch(new URL(part, BASE));
    if (!res.ok || !res.body) throw new Error(`Couldn't download ${label} (${res.status}).`);
    const reader = res.body.getReader();
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      if (offset + value.length > out.length) throw new Error(`${label} is damaged. Try again.`);
      out.set(value, offset);
      offset += value.length;
      onBytes(value.length);
    }
  }
  if (offset !== meta.size) throw new Error(`${label} download was cut off. Try again.`);
  const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", out))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hash !== meta.sha256) throw new Error(`${label} is damaged (checksum mismatch). Try again.`);
  if (cache) await cache.put(key, new Response(out)).catch(() => {});
  return out.buffer;
}

async function gpuWithF16() {
  try {
    const adapter = self.navigator.gpu && (await self.navigator.gpu.requestAdapter());
    return !!adapter && adapter.features.has("shader-f16");
  } catch {
    return false;
  }
}

// A GPU failure can leave the engine unusable (a WASM abort can't be undone), so the page
// starts a fresh worker on the standard model instead of retrying in this one.
const gpuFailed = (err) => Object.assign(new Error(err && err.message ? err.message : String(err)), { gpu: true });

let manifest = null;
let wasm = null;
let ort = null;

async function init(force) {
  manifest ??= await (await fetch(new URL("manifest.json", BASE))).json();
  const tier = force || ((await gpuWithF16()) ? "best" : "standard");
  const meta = manifest.models[tier];
  post("tier", { tier, model: meta.name });
  const total = meta.size + (wasm ? 0 : manifest.wasm.size);
  let loaded = 0;
  const onBytes = (n) => {
    loaded += n;
    post("progress", { loaded, total });
  };
  const [w, model] = await Promise.all([wasm || loadAsset(manifest.wasm, "The AI engine", onBytes), loadAsset(meta, "The AI model", onBytes)]);
  wasm = w;
  if (!ort) {
    ort = await import(new URL("ort.webgpu.min.mjs", BASE).href);
    ort.env.wasm.wasmBinary = wasm;
    ort.env.wasm.wasmPaths = { mjs: new URL("ort-wasm-simd-threaded.asyncify.mjs", BASE).href };
    ort.env.wasm.numThreads = 1; // threads need cross-origin isolation, which this site doesn't use
    ort.env.logLevel = "error";
  }
  post("status", { text: "Starting the AI model…" });
  if (tier === "best") {
    try {
      const session = await ort.InferenceSession.create(model, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" });
      return { session, tier, meta };
    } catch (err) {
      throw gpuFailed(err);
    }
  }
  const session = await ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  return { session, tier, meta };
}

async function run(pixels) {
  const { session, tier, meta } = await ready;
  const n = SIZE * SIZE;
  const input = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    input[i] = (pixels[i * 4] / 255 - meta.mean[0]) / meta.std[0];
    input[n + i] = (pixels[i * 4 + 1] / 255 - meta.mean[1]) / meta.std[1];
    input[2 * n + i] = (pixels[i * 4 + 2] / 255 - meta.mean[2]) / meta.std[2];
  }
  post("status", { text: "Removing the background…" });
  const t0 = performance.now();
  const out = await session.run({ [session.inputNames[0]]: new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]) });
  const raw = out[session.outputNames[0]].data;
  // BiRefNet outputs logits (sigmoid first); both then get stretched to the full 0..1 range.
  const mask = new Float32Array(n);
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < n; i++) {
    const v = meta.sigmoid ? 1 / (1 + Math.exp(-raw[i])) : raw[i];
    mask[i] = v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo || 1;
  for (let i = 0; i < n; i++) mask[i] = (mask[i] - lo) / span;
  return { mask, tier, ms: Math.round(performance.now() - t0) };
}

function resize(bitmap) {
  const canvas = new OffscreenCanvas(SIZE, SIZE);
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(bitmap, 0, 0, SIZE, SIZE);
  bitmap.close();
  return g.getImageData(0, 0, SIZE, SIZE).data;
}

self.onmessage = async (e) => {
  const { type, id, bitmap, force } = e.data;
  try {
    if (type === "init") {
      ready ??= init(force);
      const { tier } = await ready;
      post("ready", { tier });
    } else if (type === "run") {
      const pixels = resize(bitmap);
      ready ??= init(force);
      const cur = await ready;
      let r;
      try {
        r = await run(pixels);
      } catch (err) {
        // The GPU can still fail mid-run (out of memory, lost device).
        throw cur.tier === "best" ? gpuFailed(err) : err;
      }
      self.postMessage({ type: "mask", id, mask: r.mask, size: SIZE, tier: r.tier, ms: r.ms }, [r.mask.buffer]);
    }
  } catch (err) {
    ready = null;
    const message = err && err.message ? err.message : String(err);
    if (err && err.gpu) {
      console.warn("The GPU couldn't run the best model:", err);
      post("gpu-failed", { id, message });
    } else post("error", { id, message });
  }
};
