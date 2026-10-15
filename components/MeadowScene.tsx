"use client";

import { useEffect, useRef } from "react";

// Animated pixel-art meadow drawn at low resolution and scaled up with crisp pixels.
// Layers: dithered sky, drifting clouds, mountains, hills with pines, field,
// swaying grass and flowers, big foreground pines and falling petals.

type RGB = [number, number, number];
type Cloud = { img: HTMLCanvasElement; x: number; y: number; v: number; k: number };
type Blade = { x: number; y: number; d: number; len: number; c: string; ph: number };
type Flower = { x: number; y: number; d: number; big: boolean; ph: number; c: string };
type Petal = { x: number; y: number; v: number; ph: number };
type RidgeOpts = {
  base: number;
  amp: number;
  f: number[];
  pow?: number;
  smooth?: boolean;
  col: string;
  lit: string;
  shade: string;
  edge: string;
  snow?: string;
  snowShade?: string;
  snowLine?: number;
};

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const SKY = ["#2c58bf", "#3569cf", "#417fdb", "#5296e3", "#68aeea", "#83c6f0", "#a3dbf3", "#c4ebf5"].map(hex);
const FIELD_GREENS = ["#7cbb67", "#6fae5f", "#62a157", "#56934f", "#4a8548", "#3f7741", "#34683b", "#2a5835", "#21472f"].map(hex);
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const toHex = (c: RGB) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

// The field darkens from green into the page background, so the hero melts into the page in both themes.
function pageBackground(): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? hex(v) : hex("#0b0c22");
}
const BLADE = ["#9bd67a", "#86c76c", "#71b660", "#5da255", "#4a8b4a", "#36713f", "#255635", "#173b2b"];
const MARGIN = 28;

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function offscreen(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

// Vertical colour bands with ordered dithering at each transition.
function bands(img: ImageData, w: number, y0: number, y1: number, cols: RGB[], soft: number) {
  const d = img.data;
  const n = cols.length - 1;
  for (let y = y0; y < y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = Math.max(0, (t - i - (1 - soft)) / soft);
    for (let x = 0; x < w; x++) {
      const c = f > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? cols[i + 1] : cols[i];
      const p = ((y - y0) * w + x) * 4;
      d[p] = c[0];
      d[p + 1] = c[1];
      d[p + 2] = c[2];
      d[p + 3] = 255;
    }
  }
}

function pine(g: CanvasRenderingContext2D, x: number, base: number, h: number, dark: string, lit: string) {
  const tiers = 3;
  const th = Math.max(3, Math.round(h / tiers));
  for (let k = 0; k < tiers; k++) {
    const y0 = base - h + k * Math.round(th * 0.75);
    for (let r = 0; r < th; r++) {
      const half = Math.round(r * 0.55) + k;
      g.fillStyle = lit;
      g.fillRect(x - half, y0 + r, half + 1, 1);
      g.fillStyle = dark;
      g.fillRect(x + 1, y0 + r, half, 1);
    }
  }
  g.fillStyle = "#3a2a22";
  g.fillRect(x, base, 1, Math.max(1, Math.round(h * 0.08)));
}

function ridge(w: number, R: () => number, o: RidgeOpts) {
  const ph = [R() * 9, R() * 9, R() * 9];
  const r = (v: number) => 1 - Math.abs(Math.sin(v));
  const hs: number[] = [];
  for (let x = 0; x < w; x++) {
    const v = o.smooth
      ? (0.5 + 0.5 * Math.sin(x * o.f[0] + ph[0])) * 0.7 + (0.5 + 0.5 * Math.sin(x * o.f[1] + ph[1])) * 0.3
      : 0.55 * r(x * o.f[0] + ph[0]) + 0.3 * r(x * o.f[1] + ph[1]) + 0.15 * r(x * o.f[2] + ph[2]);
    hs.push(Math.round(o.base - o.amp * Math.pow(v, o.pow ?? 1.5)));
  }
  return hs;
}

function mountainLayer(w: number, H: number, R: () => number, o: RidgeOpts) {
  const c = offscreen(w, H);
  const g = c.getContext("2d")!;
  const hs = ridge(w, R, o);
  for (let x = 0; x < w; x++) {
    const top = hs[x];
    const ahead = hs[Math.min(w - 1, x + 2)];
    const lit = ahead < top || (ahead === top && hs[Math.max(0, x - 2)] > top);
    g.fillStyle = lit ? o.lit : o.col;
    g.fillRect(x, top, 1, H - top);
    if (o.snow && o.snowLine !== undefined && top < o.snowLine) {
      g.fillStyle = lit ? o.snow : o.snowShade!;
      g.fillRect(x, top, 1, Math.round(o.snowLine - top + ((R() * 2) | 0)));
    }
    g.fillStyle = o.edge;
    g.fillRect(x, top, 1, 1);
  }
  g.fillStyle = o.shade;
  for (let k = 0; k < w * 2; k++) {
    const x = (R() * w) | 0;
    g.fillRect(x, hs[x] + 3 + ((R() * (H - hs[x])) | 0), 1, 1);
  }
  return { c, hs };
}

function cloudSprite(R: () => number) {
  const cw = 24 + ((R() * 44) | 0);
  const ch = 9 + ((R() * 9) | 0);
  const c = offscreen(cw, ch);
  const g = c.getContext("2d")!;
  const circles: [number, number, number][] = [];
  for (let k = 0; k < 6; k++) {
    const rr = 3 + R() * (ch * 0.55);
    circles.push([rr + R() * (cw - 2 * rr), ch - rr * 0.8, rr]);
  }
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const hit = circles.find(([a, b, r]) => (x - a) ** 2 + (y - b) ** 2 <= r * r);
      if (!hit) continue;
      g.fillStyle = y > ch - 3 ? "#b4dcf0" : y > hit[1] + 1 ? "#e3f4fb" : "#ffffff";
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

export default function MeadowScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cvs = ref.current;
    const hero = cvs?.parentElement;
    if (!cvs || !hero) return;
    const ctx = cvs.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, HZ = 0;
    const L: Record<string, HTMLCanvasElement> = {};
    let clouds: Cloud[] = [];
    let blades: Blade[] = [];
    let flowers: Flower[] = [];
    let petals: Petal[] = [];

    const build = () => {
      const rect = hero.getBoundingClientRect();
      const px = rect.width < 560 ? 3 : rect.width < 1200 ? 4 : 5;
      W = Math.ceil(rect.width / px);
      H = Math.ceil(rect.height / px);
      cvs.width = W;
      cvs.height = H;
      cvs.style.width = `${W * px}px`;
      cvs.style.height = `${H * px}px`;

      const R = rng(20240206);
      const bg = pageBackground();
      const last = FIELD_GREENS[FIELD_GREENS.length - 1];
      const FIELD = [...FIELD_GREENS, mix(last, bg, 0.35), mix(last, bg, 0.7), bg];
      const light = bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114 > 140;
      const fringe = light
        ? [toHex(mix(hex("#4a8548"), bg, 0.55)), toHex(mix(hex("#4a8548"), bg, 0.8))]
        : [toHex(mix(hex("#173b2b"), bg, 0.6)), toHex(bg)];
      HZ = Math.round(H * 0.5);
      const LW = W + MARGIN * 2;

      const sky = offscreen(W, HZ + 12);
      const sg = sky.getContext("2d")!;
      const si = sg.createImageData(W, HZ + 12);
      bands(si, W, 0, HZ + 12, SKY, 0.35);
      sg.putImageData(si, 0, 0);
      L.sky = sky;

      L.far = mountainLayer(LW, H, R, {
        base: HZ + 2, amp: H * 0.3, f: [0.03, 0.08, 0.19], pow: 1.7,
        col: "#6c95c6", lit: "#89aed8", shade: "#5b84b6", edge: "#a7c5e6",
        snow: "#eef7ff", snowShade: "#c3d9ef", snowLine: HZ - H * 0.22,
      }).c;
      L.mid = mountainLayer(LW, H, R, {
        base: HZ + 4, amp: H * 0.22, f: [0.045, 0.11, 0.27],
        col: "#3c776c", lit: "#4f917c", shade: "#2f6159", edge: "#66a98a",
      }).c;
      const hill = mountainLayer(LW, H, R, {
        base: HZ + 8, amp: H * 0.07, f: [0.04, 0.1], smooth: true, pow: 1,
        col: "#4a8a52", lit: "#5c9f5d", shade: "#3e7a49", edge: "#76b86a",
      });
      const hg = hill.c.getContext("2d")!;
      for (let x = 2; x < LW - 2; x += 2 + ((R() * 4) | 0)) {
        if (R() < 0.55) pine(hg, x, hill.hs[x] + 2, 5 + ((R() * 7) | 0), "#1f4a3a", "#2c6247");
      }
      L.hills = hill.c;

      const fh = H - HZ;
      const field = offscreen(W, fh);
      const fg = field.getContext("2d")!;
      const fi = fg.createImageData(W, fh);
      bands(fi, W, 0, fh, FIELD, 0.45);
      fg.putImageData(fi, 0, 0);
      for (let k = 0; k < W * fh * 0.04; k++) {
        fg.fillStyle = R() < 0.5 ? "rgba(160,220,120,.35)" : "rgba(20,60,40,.3)";
        fg.fillRect((R() * W) | 0, (R() * fh * 0.7) | 0, 1 + ((R() * 2) | 0), 1);
      }
      L.field = field;

      const near = offscreen(LW, H);
      const ng = near.getContext("2d")!;
      const ph = Math.round(H * 0.42);
      pine(ng, MARGIN + Math.round(W * 0.03), HZ + Math.round(fh * 0.32), ph, "#1d4433", "#2e6a45");
      pine(ng, MARGIN + Math.round(W * 0.11), HZ + Math.round(fh * 0.18), Math.round(ph * 0.6), "#1d4433", "#2e6a45");
      pine(ng, MARGIN + Math.round(W * 0.93), HZ + Math.round(fh * 0.26), Math.round(ph * 0.85), "#1d4433", "#2e6a45");
      L.near = near;

      clouds = [];
      for (let k = 0; k < Math.max(4, Math.round(W / 55)); k++) {
        clouds.push({
          img: cloudSprite(R),
          x: R() * (W + 80) - 40,
          y: Math.round(HZ * (0.06 + R() * 0.5)),
          v: 1.2 + R() * 3,
          k: 1 + R() * 2,
        });
      }

      blades = [];
      for (let k = 0; k < Math.round(W * 1.4); k++) {
        const d = Math.pow(R(), 0.8);
        blades.push({
          x: (R() * W) | 0,
          y: HZ + Math.round(d * fh),
          d,
          len: 1 + Math.round(d * 7 * (0.6 + R() * 0.6)),
          c: BLADE[Math.min(BLADE.length - 1, Math.floor(d * BLADE.length))],
          ph: R() * 6,
        });
      }
      for (let x = 0; x < W; x += 1 + ((R() * 2) | 0)) {
        blades.push({ x, y: H, d: 1, len: 4 + ((R() * 12) | 0), c: R() < 0.5 ? fringe[0] : fringe[1], ph: R() * 6 });
      }
      blades.sort((a, b) => (a.c < b.c ? -1 : 1));

      flowers = [];
      for (let k = 0; k < Math.round(W / 16); k++) {
        const d = 0.12 + R() * 0.7;
        flowers.push({
          x: (R() * W) | 0,
          y: HZ + Math.round(d * fh),
          d,
          big: d > 0.5,
          ph: R() * 6,
          c: R() < 0.75 ? "#e870b0" : "#c98ae8",
        });
      }
      flowers.sort((a, b) => a.y - b.y);

      petals = [];
      for (let k = 0; k < Math.round(W / 28); k++) petals.push({ x: R() * W, y: R() * H, v: 3 + R() * 5, ph: R() * 6 });
    };

    let mx = 0, tmx = 0, last = 0, raf = 0, running = true;
    const t0 = performance.now();

    const render = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000 || 0);
      last = now;
      mx += (tmx - mx) * 0.08;

      ctx.drawImage(L.sky, 0, 0);
      for (const c of clouds) {
        c.x += c.v * dt;
        if (c.x > W + MARGIN) c.x = -c.img.width - MARGIN;
        ctx.drawImage(c.img, Math.round(c.x - mx * c.k), c.y);
      }
      ctx.drawImage(L.far, Math.round(-MARGIN - mx * 3), 0);
      ctx.drawImage(L.mid, Math.round(-MARGIN - mx * 6), 0);
      ctx.drawImage(L.hills, Math.round(-MARGIN - mx * 9), 0);
      ctx.drawImage(L.field, 0, HZ);

      const gust = Math.sin(t * 0.6) * 0.8;
      for (const b of flowers) {
        const sw = Math.round(Math.sin(t * 1.4 + b.ph) * b.d * 1.5 + gust * b.d);
        const x = b.x + Math.round(-mx * 12 * b.d);
        const stem = b.big ? 6 : 3;
        ctx.fillStyle = "#3b7a3e";
        for (let j = 0; j < stem; j++) ctx.fillRect(x + Math.round((sw * j) / stem), b.y - j, 1, 1);
        const hx = x + sw, hy = b.y - stem;
        ctx.fillStyle = b.c;
        if (b.big) {
          ctx.fillRect(hx - 1, hy - 3, 3, 1);
          ctx.fillRect(hx - 2, hy - 2, 5, 3);
          ctx.fillRect(hx - 1, hy + 1, 3, 1);
          ctx.fillStyle = "#ffd75a";
          ctx.fillRect(hx, hy - 1, 1, 1);
        } else {
          ctx.fillRect(hx - 1, hy, 3, 1);
          ctx.fillRect(hx, hy - 1, 1, 3);
        }
      }

      let col = "";
      for (const b of blades) {
        if (b.c !== col) {
          col = b.c;
          ctx.fillStyle = col;
        }
        const s = Math.sin(t * 1.7 + b.x * 0.09 + b.ph) * b.d * 1.6 + gust * b.d * 1.4;
        const ox = Math.round(-mx * 12 * b.d);
        for (let j = 0; j < b.len; j++) ctx.fillRect(b.x + ox + Math.round(s * (j / b.len)), b.y - j, 1, 1);
      }

      ctx.drawImage(L.near, Math.round(-MARGIN - mx * 14), 0);

      ctx.fillStyle = "#ffc6e2";
      for (const p of petals) {
        p.y += p.v * dt;
        p.x += Math.sin(t + p.ph) * 0.15 + 0.12;
        if (p.y > H) {
          p.y = -2;
          p.x = Math.random() * W;
        }
        if (p.x > W) p.x = 0;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), ((t * 2 + p.ph) | 0) % 2 ? 2 : 1, 1);
      }
    };

    const loop = (now: number) => {
      if (!running) return;
      if (now - last >= 1000 / 30) render(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (running && !reduce) raf = requestAnimationFrame(loop);
    };
    const rebuild = () => {
      build();
      last = performance.now();
      render(last);
    };

    rebuild();
    document.fonts?.ready.then(rebuild);

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rebuild, 120);
    });
    ro.observe(hero);

    // Rebuild when the theme changes (toggle button or system setting).
    const mo = new MutationObserver(rebuild);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const mqTheme = window.matchMedia("(prefers-color-scheme: light)");
    mqTheme.addEventListener("change", rebuild);

    const onMove = (e: PointerEvent) => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      running = visible && !document.hidden;
      start();
    });
    io.observe(hero);
    const onVisibility = () => {
      running = visible && !document.hidden;
      start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      ro.disconnect();
      mo.disconnect();
      mqTheme.removeEventListener("change", rebuild);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} id="scene" aria-hidden="true" />;
}
