// Animated pixel-art Phnom Penh riverside, drawn at low resolution and scaled up with crisp pixels.
// Back to front: sky, sun and clouds, Angkor Wat in the haze, the city skyline (Vattanac Capital),
// the Royal Palace and Independence Monument, the river with reflections, boats and lotus,
// the riverside promenade with a tuk-tuk, a park that fades into the page, sugar palms and birds.

type RGB = [number, number, number];
type Rand = () => number;
type Cloud = { img: HTMLCanvasElement; x: number; y: number; v: number; k: number };
type Blade = { x: number; y: number; d: number; len: number; c: string; ph: number };
type Flower = { x: number; y: number; d: number; ph: number; c: string };
type Palm = { x: number; base: number; h: number; lean: number; ph: number; r: number };
type Boat = { x: number; y: number; v: number; ph: number; roof: string };
type Bird = { x: number; y: number; v: number; ph: number };
type Spark = { x: number; y: number; len: number; ph: number };

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const MARGIN = 24;

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const toHex = (c: RGB) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

const SKY = ["#2c58bf", "#3569cf", "#417fdb", "#5296e3", "#6aaeea", "#8fc6ef", "#b9def3", "#f1dcc0"].map(hex);
const WATER = ["#8cc0e4", "#6fa9d8", "#5a97cc", "#4a86bf", "#3d75b0"].map(hex);
const PARK = ["#6fae5f", "#62a157", "#56934f", "#4a8548", "#3f7741", "#34683b", "#2a5835"].map(hex);
const BLADE = ["#8bcf6e", "#79bd63", "#66a958", "#54934e", "#427c45", "#31653b", "#224d31"];

function rng(seed: number): Rand {
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
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

// Vertical colour bands with ordered dithering at each transition.
function bands(g: CanvasRenderingContext2D, w: number, h: number, cols: RGB[], soft: number) {
  const img = g.createImageData(w, h);
  const d = img.data;
  const n = cols.length - 1;
  for (let y = 0; y < h; y++) {
    const t = (y / Math.max(1, h - 1)) * n;
    const i = Math.min(n - 1, Math.floor(t));
    const f = Math.max(0, (t - i - (1 - soft)) / soft);
    for (let x = 0; x < w; x++) {
      const c = f > (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 ? cols[i + 1] : cols[i];
      const p = (y * w + x) * 4;
      d[p] = c[0];
      d[p + 1] = c[1];
      d[p + 2] = c[2];
      d[p + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
}

function px(g: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function cloudSprite(R: Rand) {
  const cw = 24 + ((R() * 40) | 0);
  const ch = 8 + ((R() * 8) | 0);
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
      if (hit) px(g, y > ch - 3 ? "#cfe3f0" : y > hit[1] + 1 ? "#eef7fc" : "#ffffff", x, y);
    }
  }
  return c;
}

// A Khmer temple tower: a stepped, bud-shaped prang.
function prang(g: CanvasRenderingContext2D, cx: number, base: number, h: number, w0: number, lit: string, col: string) {
  for (let r = 0; r < h; r++) {
    const f = r / h;
    let half = Math.max(0, Math.round(w0 * 0.5 * (1 - Math.pow(f, 1.7))));
    if (r % 4 === 3 && half > 1) half -= 1;
    px(g, lit, cx - half, base - r, half + 1, 1);
    if (half > 0) px(g, col, cx + 1, base - r, half, 1);
  }
  px(g, lit, cx, base - h - 2, 1, 3);
}

function angkor(g: CanvasRenderingContext2D, cx: number, base: number, S: number) {
  const lit = "#98b2da";
  const col = "#7d98c6";
  const dark = "#6683b4";
  const span = Math.round(S * 0.22);
  const gh = Math.max(3, Math.round(S * 0.035));
  // Outer gallery with its colonnade
  px(g, col, cx - span, base - gh, span * 2, gh);
  px(g, lit, cx - span, base - gh, span * 2, 1);
  for (let x = cx - span + 1; x < cx + span - 1; x += 2) px(g, dark, x, base - gh + 2, 1, Math.max(1, gh - 3));
  px(g, dark, cx - span - 2, base - 1, span * 2 + 4, 1);
  // Five towers, the centre one tallest
  const towers: [number, number, number][] = [
    [-0.16, 0.12, 0.065],
    [0.16, 0.12, 0.065],
    [-0.08, 0.16, 0.075],
    [0.08, 0.16, 0.075],
    [0, 0.22, 0.09],
  ];
  for (const [dx, hh, ww] of towers) prang(g, cx + Math.round(dx * S), base - gh, Math.round(hh * S), Math.round(ww * S), lit, col);
}

function vattanac(g: CanvasRenderingContext2D, x0: number, base: number, h: number, w: number) {
  // Tapers into a curved "dragon tail" towards the top.
  const top = base - h;
  for (let y = top; y < base; y++) {
    const f = (y - top) / h;
    const wr = Math.max(2, Math.round(2 + (w - 2) * Math.pow(f, 0.5)));
    px(g, "#6d93cf", x0, y, wr, 1);
    px(g, "#4f73ad", x0, y, 1, 1);
    for (let x = x0 + 2; x < x0 + wr - 1; x += 2) if (y % 3 !== 0) px(g, "#9cbbe8", x, y);
  }
  px(g, "#9cbbe8", x0, top - 3, 1, 3);
}

function palace(g: CanvasRenderingContext2D, cx: number, base: number, S: number) {
  const w = Math.max(14, Math.round(S * 0.12));
  const bh = Math.max(3, Math.round(S * 0.025));
  const left = cx - Math.round(w / 2);
  px(g, "#efe6d2", left, base - bh, w, bh);
  for (let x = left + 1; x < left + w; x += 2) px(g, "#cdbf9f", x, base - bh + 1, 1, bh - 1);
  let y = base - bh;
  for (let i = 0; i < 3; i++) {
    const tw = w - i * Math.round(w * 0.22);
    const tl = cx - Math.round(tw / 2);
    for (let r = 0; r < 3; r++) {
      const rw = tw - (2 - r) * 2;
      const rl = cx - Math.round(rw / 2);
      px(g, "#e9b949", rl, y - 3 + r, Math.ceil(rw / 2), 1);
      px(g, "#c98a1e", rl + Math.ceil(rw / 2), y - 3 + r, Math.floor(rw / 2), 1);
    }
    px(g, "#f7d26a", tl - 1, y - 4, 1, 2);
    px(g, "#f7d26a", tl + tw, y - 4, 1, 2);
    y -= 3;
  }
  const sh = Math.max(6, Math.round(S * 0.08));
  px(g, "#f7d26a", cx, y - sh, 1, sh);
  px(g, "#e9b949", cx - 1, y - Math.round(sh * 0.35), 3, 1);
  px(g, "#e9b949", cx - 1, y - Math.round(sh * 0.7), 3, 1);
}

function monument(g: CanvasRenderingContext2D, cx: number, base: number, S: number) {
  const tiers = 6;
  const step = Math.max(2, Math.round(S * 0.018));
  const w0 = Math.max(11, Math.round(S * 0.075));
  let y = base;
  for (let i = 0; i < tiers; i++) {
    const w = Math.max(3, w0 - i * Math.round(w0 / (tiers + 1)));
    const l = cx - Math.floor(w / 2);
    px(g, "#dcaa7a", l, y - step, Math.ceil(w / 2), step);
    px(g, "#a9714a", l + Math.ceil(w / 2), y - step, Math.floor(w / 2), step);
    px(g, "#f0c89a", l - 1, y - step - 1, 1, 1);
    px(g, "#f0c89a", l + w, y - step - 1, 1, 1);
    y -= step;
  }
  px(g, "#dcaa7a", cx, y - 4, 1, 4);
}

function palm(ctx: CanvasRenderingContext2D, p: Palm, t: number, ox: number) {
  const sway = Math.sin(t * 0.9 + p.ph) * 1.2;
  let topX = 0;
  for (let k = 0; k < p.h; k++) {
    const f = k / p.h;
    const x = p.x + ox + Math.round(Math.sin(f * 1.4) * p.lean + sway * f * f);
    px(ctx, k % 5 === 0 ? "#5a3d28" : "#6b4a32", x, p.base - k, k < p.h * 0.15 ? 2 : 1, 1);
    topX = x;
  }
  const cy = p.base - p.h;
  const cols = ["#2f7a45", "#3f9455", "#25643a"];
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * (1.08 + (i / 12) * 0.84) + Math.sin(t * 1.3 + p.ph + i) * 0.04;
    const L = p.r * (0.75 + ((i * 37) % 10) / 40);
    for (let k = 1; k <= L; k++) {
      const x = topX + Math.cos(a) * k;
      const y = cy + Math.sin(a) * k + (k * k) / (L * 2.2);
      px(ctx, cols[(i + (k > L * 0.6 ? 1 : 0)) % 3], x, y);
    }
  }
  px(ctx, "#3a2a1f", topX - 1, cy, 3, 2);
}

function tuktuk(ctx: CanvasRenderingContext2D, x: number, yb: number, bounce: number) {
  const y = yb - bounce;
  px(ctx, "#c0392b", x - 1, y - 9, 13, 1);
  px(ctx, "#a8302a", x, y - 8, 11, 1);
  px(ctx, "#2b2b3a", x, y - 7, 1, 3);
  px(ctx, "#2b2b3a", x + 10, y - 7, 1, 3);
  px(ctx, "#f1e3c0", x, y - 4, 11, 3);
  px(ctx, "#7a5236", x + 2, y - 5, 6, 1);
  px(ctx, "#4a4a5e", x + 11, y - 3, 4, 2);
  px(ctx, "#3060a8", x + 12, y - 6, 1, 3);
  px(ctx, "#3a2a1f", x + 12, y - 7, 1, 1);
  px(ctx, "#2b2b3a", x + 13, y - 5, 1, 1);
  px(ctx, "#ffe08a", x + 15, y - 3, 1, 1);
  px(ctx, "#14141f", x + 1, yb - 1, 2, 1);
  px(ctx, "#14141f", x + 8, yb - 1, 2, 1);
  px(ctx, "#14141f", x + 13, yb - 1, 2, 1);
}

function boat(ctx: CanvasRenderingContext2D, b: Boat, y: number) {
  const x = Math.round(b.x);
  px(ctx, "#d6ecf8", x - 3, y + 1, 3, 1);
  px(ctx, "#5a3a2a", x, y, 14, 1);
  px(ctx, "#7a5236", x + 1, y - 1, 12, 1);
  px(ctx, "#efe6d2", x + 3, y - 3, 8, 2);
  px(ctx, "#3d75b0", x + 4, y - 3, 1, 1);
  px(ctx, "#3d75b0", x + 7, y - 3, 1, 1);
  px(ctx, b.roof, x + 2, y - 4, 10, 1);
}

function onMQ(mq: MediaQueryList, fn: () => void) {
  if (mq.addEventListener) mq.addEventListener("change", fn);
  else mq.addListener(fn);
  return () => (mq.removeEventListener ? mq.removeEventListener("change", fn) : mq.removeListener(fn));
}

function pageBackground(): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? hex(v) : hex("#0b0c22");
}

export function startScene(cvs: HTMLCanvasElement, host: HTMLElement): () => void {
  const ctx = cvs.getContext("2d");
  if (!ctx) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, HZ = 0, RB = 0, PW = 0;
  let L: Record<string, HTMLCanvasElement> = {};
  let clouds: Cloud[] = [], blades: Blade[] = [], flowers: Flower[] = [], palms: Palm[] = [];
  let boats: Boat[] = [], birds: Bird[] = [], sparks: Spark[] = [], lotus: [number, number][] = [];
  let tuk = 0;
  let ready = false;

  const build = () => {
    const rect = host.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const scale = rect.width < 560 ? 3 : rect.width < 1200 ? 4 : 5;
    W = Math.ceil(rect.width / scale);
    H = Math.ceil(rect.height / scale);
    cvs.width = W;
    cvs.height = H;
    cvs.style.width = `${W * scale}px`;
    cvs.style.height = `${H * scale}px`;

    const R = rng(20240206);
    const LW = W + MARGIN * 2;
    const S = Math.min(H, W * 0.8);
    HZ = Math.round(H * 0.5);
    RB = HZ + Math.max(10, Math.round(H * 0.13));
    PW = Math.max(3, Math.round(H * 0.028));
    const bg = pageBackground();
    const light = bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114 > 140;
    L = {};

    const sky = offscreen(W, HZ + 2);
    const sg = sky.getContext("2d")!;
    bands(sg, W, HZ + 2, SKY, 0.4);
    const sr = Math.max(4, Math.round(S * 0.05));
    const sx = Math.round(W * 0.8), sy = Math.round(HZ * 0.42);
    for (let y = -sr - 2; y <= sr + 2; y++)
      for (let x = -sr - 2; x <= sr + 2; x++) {
        const d = x * x + y * y;
        if (d <= sr * sr) px(sg, "#fff4d2", sx + x, sy + y);
        else if (d <= (sr + 2) ** 2 && (x + y) % 2 === 0) px(sg, "#ffe7a8", sx + x, sy + y);
      }
    L.sky = sky;

    // Angkor Wat, far away in the haze
    const far = offscreen(LW, H);
    angkor(far.getContext("2d")!, MARGIN + Math.round(W * 0.28), HZ, S);
    L.far = far;

    // City blocks with lit windows, and Vattanac Capital
    const city = offscreen(LW, H);
    const cg = city.getContext("2d")!;
    const clusters: [number, number][] = [[-0.05, 0.12], [0.45, 1.05]];
    for (const [a, b] of clusters) {
      let x = MARGIN + Math.round(a * W);
      while (x < MARGIN + b * W) {
        const bw = 4 + ((R() * 7) | 0);
        const bh = Math.round(S * (0.04 + R() * 0.1));
        const col = ["#5872a8", "#4c659a", "#617db3"][(R() * 3) | 0];
        px(cg, col, x, HZ - bh, bw, bh);
        px(cg, "#7d97c8", x, HZ - bh, 1, bh);
        for (let wy = HZ - bh + 2; wy < HZ - 1; wy += 2)
          for (let wx = x + 2; wx < x + bw - 1; wx += 2) if (R() < 0.4) px(cg, "#ffe9a8", wx, wy);
        if (R() < 0.25) px(cg, col, x + 1, HZ - bh - 3, 1, 3);
        x += bw + (R() < 0.3 ? 1 + ((R() * 3) | 0) : 0);
      }
    }
    vattanac(cg, MARGIN + Math.round(W * 0.66), HZ, Math.round(S * 0.27), Math.max(9, Math.round(S * 0.06)));
    L.city = city;

    // Royal Palace and Independence Monument in front
    const front = offscreen(LW, H);
    const fg = front.getContext("2d")!;
    palace(fg, MARGIN + Math.round(W * 0.54), HZ, S);
    monument(fg, MARGIN + Math.round(W * 0.86), HZ, S);
    L.front = front;

    // Everything above the waterline, for the reflection
    const comp = offscreen(LW, HZ);
    const kg = comp.getContext("2d")!;
    kg.drawImage(far, 0, 0);
    kg.drawImage(city, 0, 0);
    kg.drawImage(front, 0, 0);
    L.comp = comp;

    const water = offscreen(W, RB - HZ);
    bands(water.getContext("2d")!, W, RB - HZ, WATER, 0.5);
    L.water = water;

    // Riverside wall and railing, then the park fading into the page background
    const ground = offscreen(W, H - RB);
    const gg = ground.getContext("2d")!;
    const parkCols = [...PARK, mix(PARK[PARK.length - 1], bg, 0.35), mix(PARK[PARK.length - 1], bg, 0.7), bg];
    const park = offscreen(W, H - RB - PW);
    bands(park.getContext("2d")!, W, H - RB - PW, parkCols, 0.45);
    gg.drawImage(park, 0, PW);
    px(gg, "#e8dcc2", 0, 0, W, 1);
    px(gg, "#c7b494", 0, 1, W, PW - 1);
    for (let x = 0; x < W; x += 3) px(gg, "#b3a080", x, 2 + (x % 2), 1, 1);
    L.ground = ground;

    clouds = [];
    for (let k = 0; k < Math.max(4, Math.round(W / 60)); k++)
      clouds.push({ img: cloudSprite(R), x: R() * (W + 80) - 40, y: Math.round(HZ * (0.05 + R() * 0.4)), v: 1 + R() * 2.5, k: 1 + R() * 2 });

    const parkTop = RB + PW;
    const ph = H - parkTop;
    blades = [];
    for (let k = 0; k < Math.round(W * 1.1); k++) {
      const d = Math.pow(R(), 0.85);
      blades.push({
        x: (R() * W) | 0,
        y: parkTop + 1 + Math.round(d * (ph - 1)),
        d,
        len: 1 + Math.round(d * 6 * (0.6 + R() * 0.6)),
        c: BLADE[Math.min(BLADE.length - 1, Math.floor(d * BLADE.length))],
        ph: R() * 6,
      });
    }
    const fringe = light
      ? [toHex(mix(hex("#4a8548"), bg, 0.55)), toHex(mix(hex("#4a8548"), bg, 0.8))]
      : [toHex(mix(hex("#173b2b"), bg, 0.6)), toHex(bg)];
    for (let x = 0; x < W; x += 1 + ((R() * 2) | 0))
      blades.push({ x, y: H, d: 1, len: 4 + ((R() * 10) | 0), c: R() < 0.5 ? fringe[0] : fringe[1], ph: R() * 6 });
    blades.sort((a, b) => (a.c < b.c ? -1 : 1));

    flowers = [];
    for (let k = 0; k < Math.round(W / 22); k++) {
      const d = 0.1 + R() * 0.55;
      flowers.push({ x: (R() * W) | 0, y: parkTop + Math.round(d * ph), d, ph: R() * 6, c: R() < 0.6 ? "#e870b0" : "#f7c948" });
    }

    palms = [
      { x: Math.round(W * 0.05), base: parkTop + Math.round(ph * 0.35), h: Math.round(S * 0.42), lean: 3, ph: 0, r: Math.max(10, S * 0.1) },
      { x: Math.round(W * 0.14), base: parkTop + Math.round(ph * 0.18), h: Math.round(S * 0.3), lean: -2, ph: 1.7, r: Math.max(8, S * 0.075) },
      { x: Math.round(W * 0.93), base: parkTop + Math.round(ph * 0.3), h: Math.round(S * 0.38), lean: -3, ph: 3.1, r: Math.max(10, S * 0.09) },
    ];

    const rh = RB - HZ;
    boats = [
      { x: R() * W, y: HZ + Math.round(rh * 0.45), v: 3, ph: 0, roof: "#c0392b" },
      { x: R() * W, y: HZ + Math.round(rh * 0.8), v: -4.5, ph: 2, roof: "#1f6f8b" },
    ];
    birds = Array.from({ length: 4 }, () => ({ x: R() * W, y: Math.round(HZ * (0.15 + R() * 0.35)), v: 4 + R() * 4, ph: R() * 6 }));
    sparks = Array.from({ length: Math.round(W / 6) }, () => ({ x: (R() * W) | 0, y: HZ + 1 + ((R() * (rh - 2)) | 0), len: 1 + ((R() * 3) | 0), ph: R() * 6 }));
    lotus = Array.from({ length: Math.max(3, Math.round(W / 70)) }, () => [(R() * W) | 0, RB - 1 - ((R() * 2) | 0)]);
    tuk = R() * W;
    ready = true;
  };

  let mx = 0, tmx = 0, last = 0, raf = 0, running = true;
  const t0 = performance.now();

  const render = (now: number) => {
    if (!ready) return;
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
    for (const b of birds) {
      b.x += b.v * dt;
      if (b.x > W + 6) b.x = -6;
      const x = Math.round(b.x - mx * 2), y = b.y + Math.round(Math.sin(t + b.ph) * 1.5);
      const up = ((t * 5 + b.ph) | 0) % 2 === 0;
      for (const [dx, dy] of up ? [[-2, -1], [-1, 0], [0, 0], [1, 0], [2, -1]] : [[-2, 1], [-1, 0], [0, 0], [1, 0], [2, 1]])
        px(ctx, "#2a3566", x + dx, y + dy);
    }
    ctx.drawImage(L.far, Math.round(-MARGIN - mx * 2), 0);
    ctx.drawImage(L.city, Math.round(-MARGIN - mx * 4), 0);
    ctx.drawImage(L.front, Math.round(-MARGIN - mx * 6), 0);

    // River: water, rippling reflection, sparkles, boats and lotus
    const rh = RB - HZ;
    ctx.drawImage(L.water, 0, HZ);
    for (let r = 0; r < rh; r++) {
      const sy = HZ - 1 - Math.floor(r * 1.4);
      if (sy < 0) break;
      const wob = Math.round(Math.sin(t * 2.2 + r * 0.8) * (0.5 + r / rh));
      ctx.globalAlpha = 0.32 * (1 - r / rh) + 0.06;
      ctx.drawImage(L.comp, MARGIN + mx * 4, sy, W, 1, wob, HZ + r, W, 1);
    }
    ctx.globalAlpha = 1;
    for (const s of sparks) if (Math.sin(t * 3 + s.ph) > 0.55) px(ctx, "#e6f3fb", s.x, s.y, s.len, 1);
    for (const b of boats) {
      b.x += b.v * dt;
      if (b.x > W + 20) b.x = -20;
      if (b.x < -20) b.x = W + 20;
      boat(ctx, b, b.y + Math.round(Math.sin(t * 2 + b.ph) * 0.6));
    }
    for (const [x, y] of lotus) {
      px(ctx, "#3d8b4f", x - 2, y, 5, 1);
      px(ctx, "#2f7040", x - 1, y + 1, 3, 1);
      px(ctx, "#f58fbf", x, y - 2, 1, 2);
      px(ctx, "#e870b0", x - 1, y - 1, 3, 1);
    }

    ctx.drawImage(L.ground, 0, RB);
    for (let x = 0; x < W; x += 4) px(ctx, "#6b5a48", x, RB - 2, 1, 2);
    px(ctx, "#6b5a48", 0, RB - 2, W, 1);
    tuk += 11 * dt;
    if (tuk > W + 20) tuk = -20;
    tuktuk(ctx, Math.round(tuk), RB + 1, ((t * 6) | 0) % 3 === 0 ? 1 : 0);

    const gust = Math.sin(t * 0.6) * 0.8;
    for (const f of flowers) {
      const sw = Math.round(Math.sin(t * 1.4 + f.ph) * f.d * 1.5 + gust * f.d);
      px(ctx, "#3b7a3e", f.x, f.y - 2, 1, 2);
      px(ctx, f.c, f.x + sw - 1, f.y - 3, 3, 1);
      px(ctx, f.c, f.x + sw, f.y - 4, 1, 3);
    }
    let col = "";
    for (const b of blades) {
      if (b.c !== col) {
        col = b.c;
        ctx.fillStyle = col;
      }
      const s = Math.sin(t * 1.7 + b.x * 0.09 + b.ph) * b.d * 1.6 + gust * b.d * 1.4;
      const ox = Math.round(-mx * 10 * b.d);
      for (let j = 0; j < b.len; j++) ctx.fillRect(b.x + ox + Math.round(s * (j / b.len)), b.y - j, 1, 1);
    }
    for (const p of palms) palm(ctx, p, t, Math.round(-mx * 12));
  };

  const draw = (now: number) => {
    try {
      render(now);
    } catch (e) {
      console.error("Scene render failed", e);
    }
  };
  const loop = (now: number) => {
    if (!running) return;
    if (now - last >= 1000 / 30) draw(now);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    cancelAnimationFrame(raf);
    if (running && !reduce) raf = requestAnimationFrame(loop);
  };
  const rebuild = () => {
    try {
      build();
    } catch (e) {
      console.error("Scene build failed", e);
      return;
    }
    last = performance.now();
    draw(last);
  };

  rebuild();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);

  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 120);
  });
  ro.observe(host);
  const mo = new MutationObserver(rebuild);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const offTheme = onMQ(window.matchMedia("(prefers-color-scheme: light)"), rebuild);

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
  io.observe(host);
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
    io.disconnect();
    offTheme();
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
