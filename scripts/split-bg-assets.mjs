// Splits the background-removal models and the ONNX Runtime wasm into parts under Cloudflare's
// 25 MiB static-asset limit, and writes public/bg/manifest.json with SHA-256 hashes.
// Usage: node scripts/split-bg-assets.mjs <birefnet-fp16.onnx> <isnet-fp16.onnx> <node_modules/onnxruntime-web/dist>
//
// Both models are fp16 copies (inputs and outputs stay float32). BiRefNet's wide Split/Concat
// nodes are first rewritten into trees of at most 4, so every WebGPU shader stays under the
// storage-buffer limit; the outputs are bit-identical to the original model.
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PART = 24_000_000;
const [best, standard, dist] = process.argv.slice(2);
const out = "public/bg";
mkdirSync(out, { recursive: true });

function split(src, name) {
  const buf = readFileSync(src);
  const parts = [];
  for (let i = 0, n = 0; i < buf.length; i += PART, n++) {
    const file = `${name}.part${n}`;
    writeFileSync(join(out, file), buf.subarray(i, i + PART));
    parts.push(file);
  }
  return { parts, size: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

const manifest = {
  models: {
    best: {
      name: "BiRefNet-lite",
      license: "MIT",
      source: "https://github.com/ZhengPeng7/BiRefNet",
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
      sigmoid: true,
      ...split(best, "birefnet-lite-fp16.onnx"),
    },
    standard: {
      name: "ISNet (DIS)",
      license: "Apache-2.0",
      source: "https://github.com/xuebinqin/DIS",
      mean: [0.5, 0.5, 0.5],
      std: [1, 1, 1],
      sigmoid: false,
      ...split(standard, "isnet-fp16.onnx"),
    },
  },
  wasm: { name: "onnxruntime-web", license: "MIT", ...split(join(dist, "ort-wasm-simd-threaded.asyncify.wasm"), "ort-wasm-simd-threaded.asyncify.wasm") },
};
for (const f of ["ort.webgpu.min.mjs", "ort-wasm-simd-threaded.asyncify.mjs"]) copyFileSync(join(dist, f), join(out, f));
writeFileSync(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ best: manifest.models.best.parts.length, standard: manifest.models.standard.parts.length, wasm: manifest.wasm.parts.length }));
