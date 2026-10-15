// The "Game Room" hero background: a pixel-art gamer's room, brought to life with a few
// small loops (bobbing Lakitu, spinning coins, flickering neon, scrolling TV clouds, LEDs,
// a typing hand and steam from the mug).
// Coordinates below are in the 2000 × 1293 source image.

const IW = 2000;
const IH = 1293;
const WALL = "#060b21";
const FOCUS = { x: 0.42, y: 0.5 };

type Rect = [x: number, y: number, w: number, h: number];
const LAKITU: Rect = [545, 195, 180, 185];
const PIRANHA: Rect = [1515, 538, 140, 118];
const COINS: Rect[] = [
  [1576, 752, 52, 82],
  [1641, 752, 58, 82],
];
const NEON: Rect = [0, 20, 336, 415];
const TV_SKY: Rect = [36, 858, 280, 84];
const HAND: Rect = [640, 1035, 92, 46];
const RED_LED: Rect = [196, 770, 18, 20];
const GREEN_LEDS: Rect[] = [
  [1140, 1222, 52, 16],
  [72, 1222, 46, 16],
];
const CARET: Rect = [700, 908, 6, 24];
const MUG = { x: 1660, y: 975 };

type Puff = { x: number; y: number; life: number };

export function startRoomScene(cvs: HTMLCanvasElement, host: HTMLElement, src: string): () => void {
  const ctx = cvs.getContext("2d");
  if (!ctx) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const img = new Image();
  img.src = src;

  let S = 1, OX = 0, OY = 0;
  let raf = 0;
  let alive = true;
  let flickerUntil = 0, nextFlicker = 2000;
  let hand = 0, nextKey = 0;
  let puffs: Puff[] = [];
  let nextPuff = 0;

  const size = () => {
    const r = host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(r.width * dpr);
    cvs.height = Math.round(r.height * dpr);
    cvs.style.width = `${r.width}px`;
    cvs.style.height = `${r.height}px`;
    S = Math.max(cvs.width / IW, cvs.height / IH);
    OX = Math.min(0, Math.max(cvs.width - IW * S, cvs.width / 2 - IW * S * FOCUS.x));
    OY = Math.min(0, Math.max(cvs.height - IH * S, cvs.height / 2 - IH * S * FOCUS.y));
  };

  // Draw a piece of the picture somewhere else (all in source-image coordinates).
  const patch = ([x, y, w, h]: Rect, dx: number, dy: number, dw = w) =>
    ctx.drawImage(img, x, y, w, h, x + dx + (w - dw) / 2, y + dy, dw, h);
  const fill = ([x, y, w, h]: Rect, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const draw = (t: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(S, 0, 0, S, OX, OY);
    ctx.drawImage(img, 0, 0);

    // TV: the game's sky and clouds drift left, wrapping around.
    const [sx, sy, sw, sh] = TV_SKY;
    const off = Math.floor((t * 0.02) % sw / 3) * 3;
    ctx.drawImage(img, sx + off, sy, sw - off, sh, sx, sy, sw - off, sh);
    if (off) ctx.drawImage(img, sx, sy, off, sh, sx + sw - off, sy, off, sh);

    // Lakitu floats up and down on its cloud.
    fill(LAKITU, WALL);
    patch(LAKITU, 0, Math.round(Math.sin(t / 650) * 12));

    // The piranha plant sways.
    fill(PIRANHA, WALL);
    patch(PIRANHA, Math.round(Math.sin(t / 900) * 7), 0);

    // Coins spin, slightly out of step.
    COINS.forEach((c, i) => {
      const k = Math.abs(Math.cos(t / 420 + i * 0.9));
      fill(c, WALL);
      patch(c, 0, 0, Math.max(6, Math.round((c[2] * k) / 6) * 6));
    });

    // Neon sign: now and then it stutters off for a moment.
    if (t < flickerUntil && Math.floor(t / 60) % 2 === 0) {
      ctx.fillStyle = "rgba(6,11,33,.6)";
      ctx.fillRect(...NEON);
    }

    // LEDs blink.
    if (Math.floor(t / 900) % 2) fill(RED_LED, "#3a0d18");
    GREEN_LEDS.forEach((l, i) => {
      if (Math.floor(t / (500 + i * 330)) % 3 === 0) fill(l, "#03210f");
    });

    // A caret blinks in the browser window.
    if (Math.floor(t / 500) % 2) fill(CARET, "#2b4f9e");

    // The hand taps the keyboard.
    if (hand) patch(HAND, 0, -hand);

    // Steam rises from the mug.
    ctx.fillStyle = "#c9d4ff";
    for (const p of puffs) {
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - p.life));
      ctx.fillRect(Math.round(p.x / 9) * 9, Math.round(p.y / 9) * 9, 9, 9);
    }
    ctx.globalAlpha = 1;
  };

  const tick = (t: number) => {
    if (!alive) return;
    if (t > nextFlicker) {
      flickerUntil = t + 300;
      nextFlicker = t + 3000 + Math.random() * 5000;
    }
    if (t > nextKey) {
      hand = hand ? 0 : 4 + Math.round(Math.random() * 3);
      nextKey = t + 70 + Math.random() * 150 + (Math.random() < 0.08 ? 700 : 0);
    }
    if (t > nextPuff) {
      puffs.push({ x: MUG.x + (Math.random() - 0.5) * 40, y: MUG.y, life: 0 });
      nextPuff = t + 260 + Math.random() * 240;
    }
    puffs = puffs.filter((p) => {
      p.life += 0.012;
      p.y -= 0.9;
      p.x += Math.sin((p.y + p.life * 40) / 14) * 0.6;
      return p.life < 1;
    });
    draw(t);
    raf = requestAnimationFrame(tick);
  };

  const ro = new ResizeObserver(() => {
    size();
    if (img.complete) draw(performance.now());
  });
  ro.observe(host);

  img.onload = () => {
    if (!alive) return;
    size();
    if (reduce) draw(0);
    else raf = requestAnimationFrame(tick);
  };

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
