// Background remover: turns the model's 1024 × 1024 mask into a clean, full-resolution cut-out.
// 1. Edge refinement: a guided filter snaps the upscaled mask to the photo's real edges (hair, fur).
// 2. Edge sharpness: steepens the soft ramp for crisp product and logo edges.
// 3. Colour clean-up: Blur-Fusion foreground estimation (Forte & Pitié, 2021) removes the old
//    background's colour from see-through edge pixels, so no halo shows on a new background.
// Everything runs on plain arrays, so it works the same in the browser and in tests.

/** sessionStorage key for handing a cut-out to the App Icon Generator: { name, url } (PNG data URL). */
export const ICON_HANDOFF = "icon-tool-handoff";

export type Img = { w: number; h: number; data: Uint8ClampedArray }; // RGBA
export type Stroke = { mode: "keep" | "erase"; size: number; points: number[] }; // image px, x/y pairs

/** Longest side the slow steps work at; results are carried back to full size. */
const WORK = 1536;

/** Mean filter over a (2r+1)² window, clipped at the borders. In place on `a` (w × h). */
export function boxBlur(a: Float32Array, w: number, h: number, r: number, tmp = new Float32Array(a.length)): Float32Array {
  if (r < 1) return a;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = 0; x <= Math.min(r, w - 1); x++) sum += a[row + x];
    for (let x = 0; x < w; x++) {
      const lo = Math.max(0, x - r);
      const hi = Math.min(w - 1, x + r);
      tmp[row + x] = sum / (hi - lo + 1);
      if (x + r + 1 < w) sum += a[row + x + r + 1];
      if (x - r >= 0) sum -= a[row + x - r];
    }
  }
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = 0; y <= Math.min(r, h - 1); y++) sum += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      const lo = Math.max(0, y - r);
      const hi = Math.min(h - 1, y + r);
      a[y * w + x] = sum / (hi - lo + 1);
      if (y + r + 1 < h) sum += tmp[(y + r + 1) * w + x];
      if (y - r >= 0) sum -= tmp[(y - r) * w + x];
    }
  }
  return a;
}

/** Bilinear resample of a single-channel float image. */
export function resample(src: Float32Array, sw: number, sh: number, dw: number, dh: number): Float32Array {
  const out = new Float32Array(dw * dh);
  const fx = sw / dw;
  const fy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.max(0, (y + 0.5) * fy - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const ty = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.max(0, (x + 0.5) * fx - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const tx = sx - x0;
      const a = src[y0 * sw + x0] + (src[y0 * sw + x1] - src[y0 * sw + x0]) * tx;
      const b = src[y1 * sw + x0] + (src[y1 * sw + x1] - src[y1 * sw + x0]) * tx;
      out[y * dw + x] = a + (b - a) * ty;
    }
  }
  return out;
}

/** Bilinear lookups from a small plane into a big grid, without building the big plane. */
class Upsampler {
  private x0: Int32Array;
  private x1: Int32Array;
  private tx: Float32Array;
  private y0: Int32Array;
  private y1: Int32Array;
  private ty: Float32Array;
  constructor(
    private sw: number,
    sh: number,
    dw: number,
    dh: number,
  ) {
    const axis = (s: number, d: number) => {
      const a = new Int32Array(d);
      const b = new Int32Array(d);
      const t = new Float32Array(d);
      for (let i = 0; i < d; i++) {
        const v = Math.min(s - 1, Math.max(0, ((i + 0.5) * s) / d - 0.5));
        a[i] = Math.floor(v);
        b[i] = Math.min(s - 1, a[i] + 1);
        t[i] = v - a[i];
      }
      return [a, b, t] as const;
    };
    [this.x0, this.x1, this.tx] = axis(sw, dw);
    [this.y0, this.y1, this.ty] = axis(sh, dh);
  }
  at(p: Float32Array, x: number, y: number): number {
    const r0 = this.y0[y] * this.sw;
    const r1 = this.y1[y] * this.sw;
    const a0 = this.x0[x];
    const a1 = this.x1[x];
    const t = this.tx[x];
    const top = p[r0 + a0] + (p[r0 + a1] - p[r0 + a0]) * t;
    const bot = p[r1 + a0] + (p[r1 + a1] - p[r1 + a0]) * t;
    return top + (bot - top) * this.ty[y];
  }
}

/** Area-average downscale of RGBA into three 0..1 float planes. */
function shrinkRgb(img: Img, dw: number, dh: number): Float32Array[] {
  const { w, h, data } = img;
  const planes = [new Float32Array(dw * dh), new Float32Array(dw * dh), new Float32Array(dw * dh)];
  const count = new Float32Array(dw * dh);
  for (let y = 0; y < h; y++) {
    const dy = Math.min(dh - 1, Math.floor((y * dh) / h));
    for (let x = 0; x < w; x++) {
      const d = dy * dw + Math.min(dw - 1, Math.floor((x * dw) / w));
      const s = (y * w + x) * 4;
      planes[0][d] += data[s];
      planes[1][d] += data[s + 1];
      planes[2][d] += data[s + 2];
      count[d]++;
    }
  }
  for (let i = 0; i < dw * dh; i++) {
    const k = 1 / (255 * (count[i] || 1));
    planes[0][i] *= k;
    planes[1][i] *= k;
    planes[2][i] *= k;
  }
  return planes;
}

function workSize(w: number, h: number) {
  const s = Math.min(1, WORK / Math.max(w, h));
  return { ww: Math.max(1, Math.round(w * s)), wh: Math.max(1, Math.round(h * s)) };
}

const gray = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Full-size alpha (0..1) from the model's square mask. With `refine`, a guided filter
 * (He et al.) aligns the mask to the photo's own edges: it is solved at working size and the
 * linear coefficients are carried up to full size (the "fast guided filter").
 */
export function refineMask(img: Img, mask: Float32Array, size: number, refine = true): Float32Array {
  const { w, h, data } = img;
  if (!refine) return resample(mask, size, size, w, h);
  const { ww, wh } = workSize(w, h);
  const n = ww * wh;
  const [r, g, b] = shrinkRgb(img, ww, wh);
  const I = new Float32Array(n);
  for (let i = 0; i < n; i++) I[i] = gray(r[i], g[i], b[i]);
  const p = resample(mask, size, size, ww, wh);
  const rad = Math.max(2, Math.round(Math.max(ww, wh) / 320));
  const eps = 1e-4;
  const tmp = new Float32Array(n);
  const mI = boxBlur(I.slice(), ww, wh, rad, tmp);
  const mP = boxBlur(p.slice(), ww, wh, rad, tmp);
  const II = new Float32Array(n);
  const IP = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    II[i] = I[i] * I[i];
    IP[i] = I[i] * p[i];
  }
  boxBlur(II, ww, wh, rad, tmp);
  boxBlur(IP, ww, wh, rad, tmp);
  const A = II; // reuse buffers
  const B = IP;
  for (let i = 0; i < n; i++) {
    const varI = II[i] - mI[i] * mI[i];
    const cov = IP[i] - mI[i] * mP[i];
    const a = cov / (varI + eps);
    A[i] = a;
    B[i] = mP[i] - a * mI[i];
  }
  boxBlur(A, ww, wh, rad, tmp);
  boxBlur(B, ww, wh, rad, tmp);
  const up = new Upsampler(ww, wh, w, h);
  const out = new Float32Array(w * h);
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      // Trust the filter only near the edge; keep the model's confident inside and outside as they are.
      const m = up.at(p, x, y);
      let v = m;
      if (m >= 0.01 && m <= 0.99) {
        const j = i * 4;
        v = up.at(A, x, y) * (gray(data[j], data[j + 1], data[j + 2]) / 255) + up.at(B, x, y);
      }
      out[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  }
  return out;
}

/** Steepen the alpha ramp around 0.5. sharp = 0 keeps it as is; 1 is nearly a hard edge. */
export function sharpen(alpha: Float32Array, sharp: number): Float32Array {
  if (sharp <= 0) return alpha;
  const k = 1 + sharp * sharp * 12;
  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    const v = (alpha[i] - 0.5) * k + 0.5;
    out[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return out;
}

/** Rasterise brush strokes into keep and erase layers (0..1) of size w × h, scaled by `scale`. */
export function paintStrokes(strokes: Stroke[], w: number, h: number, scale = 1): { keep: Float32Array; erase: Float32Array } | null {
  if (!strokes.length) return null;
  const keep = new Float32Array(w * h);
  const erase = new Float32Array(w * h);
  for (const s of strokes) {
    const layer = s.mode === "keep" ? keep : erase;
    const other = s.mode === "keep" ? erase : keep;
    const rad = Math.max(0.5, (s.size / 2) * scale);
    const dab = (cx: number, cy: number) => {
      const x0 = Math.max(0, Math.floor(cx - rad - 1));
      const x1 = Math.min(w - 1, Math.ceil(cx + rad + 1));
      const y0 = Math.max(0, Math.floor(cy - rad - 1));
      const y1 = Math.min(h - 1, Math.ceil(cy + rad + 1));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
          // Solid core with a one-pixel-wide soft rim, so brushed edges aren't jagged.
          const v = d <= rad - 1 ? 1 : d >= rad + 1 ? 0 : (rad + 1 - d) / 2;
          const i = y * w + x;
          if (v > layer[i]) layer[i] = v;
          // A later stroke wins over an earlier one of the other kind.
          if (v > 0) other[i] *= 1 - v;
        }
      }
    };
    const pts = s.points;
    for (let k = 0; k < pts.length; k += 2) {
      const x = pts[k] * scale;
      const y = pts[k + 1] * scale;
      if (k === 0) {
        dab(x, y);
        continue;
      }
      const px = pts[k - 2] * scale;
      const py = pts[k - 1] * scale;
      const steps = Math.max(1, Math.ceil(Math.hypot(x - px, y - py) / Math.max(1, rad / 3)));
      for (let t = 1; t <= steps; t++) dab(px + ((x - px) * t) / steps, py + ((y - py) * t) / steps);
    }
  }
  return { keep, erase };
}

/** Apply brush layers: keep raises alpha to the brush, erase lowers it. */
export function applyEdits(alpha: Float32Array, edits: { keep: Float32Array; erase: Float32Array } | null): Float32Array {
  if (!edits) return alpha;
  const out = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) out[i] = Math.max(alpha[i], edits.keep[i]) * (1 - edits.erase[i]);
  return out;
}

/**
 * Foreground colours for see-through pixels, so the old background doesn't tint the edge.
 * Blur-Fusion ×2 runs at working size; the final per-pixel step runs at full size:
 * F = F̂ + α (I − α F̂ − (1 − α) B̂), where F̂ and B̂ are local foreground/background averages.
 */
export function cutout(img: Img, alpha: Float32Array, clean = true): Uint8ClampedArray {
  const { w, h, data } = img;
  const out = new Uint8ClampedArray(w * h * 4);
  if (!clean) {
    for (let i = 0, j = 0; i < w * h; i++, j += 4) {
      out[j] = data[j];
      out[j + 1] = data[j + 1];
      out[j + 2] = data[j + 2];
      out[j + 3] = Math.round(alpha[i] * 255);
    }
    return out;
  }
  const { ww, wh } = workSize(w, h);
  const n = ww * wh;
  const I = shrinkRgb(img, ww, wh);
  const a = resample(alpha, w, h, ww, wh);
  const tmp = new Float32Array(n);
  const blurA = new Float32Array(n);
  const blurNA = new Float32Array(n);
  const sc = Math.max(ww, wh) / 1024;
  let F: Float32Array[] = I.map((c) => c.slice());
  let B: Float32Array[] = I.map((c) => c.slice());
  let Fh: Float32Array[] = [];
  let Bh: Float32Array[] = [];
  for (const r of [Math.round(90 * sc), Math.max(1, Math.round(6 * sc))]) {
    blurA.set(a);
    boxBlur(blurA, ww, wh, r, tmp);
    for (let i = 0; i < n; i++) blurNA[i] = 1 - blurA[i];
    Fh = [];
    Bh = [];
    for (let c = 0; c < 3; c++) {
      const fa = new Float32Array(n);
      const bb = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        fa[i] = F[c][i] * a[i];
        bb[i] = B[c][i] * (1 - a[i]);
      }
      boxBlur(fa, ww, wh, r, tmp);
      boxBlur(bb, ww, wh, r, tmp);
      for (let i = 0; i < n; i++) {
        fa[i] = blurA[i] > 1e-5 ? fa[i] / blurA[i] : I[c][i];
        bb[i] = blurNA[i] > 1e-5 ? bb[i] / blurNA[i] : I[c][i];
      }
      Fh.push(fa);
      Bh.push(bb);
    }
    const nF: Float32Array[] = [];
    const nB: Float32Array[] = [];
    for (let c = 0; c < 3; c++) {
      const f = new Float32Array(n);
      const b = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const al = a[i];
        const err = I[c][i] - al * Fh[c][i] - (1 - al) * Bh[c][i];
        f[i] = Math.min(1, Math.max(0, Fh[c][i] + al * err));
        b[i] = Math.min(1, Math.max(0, Bh[c][i] + (1 - al) * err));
      }
      nF.push(f);
      nB.push(b);
    }
    F = nF;
    B = nB;
  }
  // Carry the smooth local averages of the last pass up to full size and finish per pixel.
  const up = new Upsampler(ww, wh, w, h);
  for (let y = 0, i = 0; y < h; y++) {
    for (let x = 0; x < w; x++, i++) {
      const j = i * 4;
      const al = alpha[i];
      out[j + 3] = Math.round(al * 255);
      if (al >= 0.999 || al <= 0.001) {
        out[j] = data[j];
        out[j + 1] = data[j + 1];
        out[j + 2] = data[j + 2];
        continue;
      }
      for (let c = 0; c < 3; c++) {
        const fh = up.at(Fh[c], x, y);
        const f = fh + al * (data[j + c] / 255 - al * fh - (1 - al) * up.at(Bh[c], x, y));
        out[j + c] = Math.round(Math.min(1, Math.max(0, f)) * 255);
      }
    }
  }
  return out;
}

/** Tight box around everything at least `min` opaque, or null when the image is empty. */
export function bounds(rgba: Uint8ClampedArray, w: number, h: number, min = 8): { x: number; y: number; w: number; h: number } | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] >= min) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Share of the image that ended up as foreground (alpha ≥ 0.5). */
export function coverage(alpha: Float32Array): number {
  let k = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] >= 0.5) k++;
  return alpha.length ? k / alpha.length : 0;
}
