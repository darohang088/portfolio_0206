// The "Daro at the desk" hero background: the pixel-art photo, with code typing and
// scrolling on the monitor and the hand tapping the keyboard.
// Coordinates below are in the 1024 × 1024 source image.

const IMG = 1024;
// Where the editor's code sits on the monitor.
const CODE = { x: 632, y: 458, w: 284, h: 206 };
const SCREEN_BG = "#25284d";
const LINE = 7; // line pitch
const CH = 4; // one "character" block
// The typing hand, and how far it lifts.
const HAND = { x: 724, y: 762, w: 84, h: 80 };
// Which part of the picture stays in view when the hero crops it.
const FOCUS = { x: 0.55, y: 0.56 };

const COLORS = ["#d8e0ff", "#8ee6d2", "#f2a8d8", "#f6c453", "#9fb3ff", "#d8e0ff", "#8ee6d2"];

type Seg = { len: number; color: string };
type Line = { indent: number; segs: Seg[]; total: number };

function randomLine(prev: Line | null): Line {
  let indent = prev ? prev.indent + (Math.random() < 0.3 ? 1 : Math.random() < 0.3 ? -1 : 0) : 1;
  indent = Math.max(0, Math.min(5, indent));
  const segs: Seg[] = [];
  const n = Math.random() < 0.12 ? 0 : 1 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    segs.push({ len: 2 + Math.floor(Math.random() * 9), color: COLORS[Math.floor(Math.random() * COLORS.length)] });
  }
  return { indent, segs, total: segs.reduce((a, s) => a + s.len + 1, 0) };
}

export function startDeskScene(cvs: HTMLCanvasElement, host: HTMLElement, src: string): () => void {
  const ctx = cvs.getContext("2d");
  if (!ctx) return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const img = new Image();
  img.src = src;

  let S = 1, OX = 0, OY = 0;
  let raf = 0;
  let alive = true;

  // Fill the editor with code, then keep adding lines at the bottom.
  const rows = Math.floor(CODE.h / LINE);
  const lines: Line[] = [];
  for (let i = 0; i < rows; i++) lines.push(randomLine(lines[i - 1] ?? null));
  let typed = 0; // characters typed on the last line
  let scroll = 0; // 0..1 while the editor slides up by one line
  let nextKey = 0;
  let hand = 0;

  const size = () => {
    const r = host.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cvs.width = Math.round(r.width * dpr);
    cvs.height = Math.round(r.height * dpr);
    cvs.style.width = `${r.width}px`;
    cvs.style.height = `${r.height}px`;
    S = Math.max(cvs.width / IMG, cvs.height / IMG);
    OX = Math.min(0, Math.max(cvs.width - IMG * S, cvs.width / 2 - IMG * S * FOCUS.x));
    OY = Math.min(0, Math.max(cvs.height - IMG * S, cvs.height / 2 - IMG * S * FOCUS.y));
    ctx.imageSmoothingEnabled = false;
  };

  const box = (x: number, y: number, w: number, h: number) =>
    ctx.fillRect(Math.round(OX + x * S), Math.round(OY + y * S), Math.ceil(w * S), Math.ceil(h * S));

  const drawCode = () => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(OX + CODE.x * S, OY + CODE.y * S, CODE.w * S, CODE.h * S);
    ctx.clip();
    ctx.fillStyle = SCREEN_BG;
    box(CODE.x, CODE.y, CODE.w, CODE.h);
    const shift = scroll * LINE;
    const last = lines.length - 1;
    // Highlight the line being typed, like the editor's current-line bar.
    ctx.fillStyle = "rgba(120,140,220,.22)";
    box(CODE.x, CODE.y + last * LINE - shift - 2, CODE.w, LINE);
    lines.forEach((ln, i) => {
      const y = CODE.y + i * LINE - shift;
      ctx.fillStyle = "#4b5285";
      box(CODE.x + 2, y, 6, 3); // line number
      let x = CODE.x + 16 + ln.indent * CH * 2;
      let budget = i === last ? typed : Infinity;
      for (const s of ln.segs) {
        const n = Math.min(s.len, budget);
        if (n <= 0) break;
        ctx.fillStyle = s.color;
        box(x, y, n * CH - 1, 3);
        x += (s.len + 1) * CH;
        budget -= s.len + 1;
      }
      if (i === last && Math.floor(performance.now() / 400) % 2 === 0) {
        ctx.fillStyle = "#f6c453";
        box(CODE.x + 16 + ln.indent * CH * 2 + Math.min(typed, ln.total) * CH, y - 1, 2, 5);
      }
    });
    ctx.restore();
  };

  const draw = () => {
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(img, OX, OY, IMG * S, IMG * S);
    drawCode();
    if (hand) {
      // Redraw the hand a little higher, as if it's tapping keys.
      ctx.drawImage(img, HAND.x, HAND.y, HAND.w, HAND.h, OX + (HAND.x + hand * 0.4) * S, OY + (HAND.y - hand) * S, HAND.w * S, HAND.h * S);
    }
  };

  const tick = (t: number) => {
    if (!alive) return;
    if (t >= nextKey) {
      const last = lines[lines.length - 1];
      if (scroll > 0) {
        // still sliding
      } else if (typed < last.total) {
        typed += 1;
        hand = hand ? 0 : 2 + Math.floor(Math.random() * 2);
        nextKey = t + 60 + Math.random() * 120;
      } else {
        hand = 0;
        scroll = 0.0001;
        nextKey = t + 250 + Math.random() * 400; // a short think between lines
      }
    }
    if (scroll > 0) {
      scroll += 0.08;
      if (scroll >= 1) {
        scroll = 0;
        lines.shift();
        lines.push(randomLine(lines[lines.length - 1]));
        typed = 0;
      }
    }
    draw();
    raf = requestAnimationFrame(tick);
  };

  const ro = new ResizeObserver(() => {
    size();
    if (img.complete) draw();
  });
  ro.observe(host);

  img.onload = () => {
    if (!alive) return;
    size();
    if (reduce) {
      typed = lines[lines.length - 1].total;
      draw();
    } else raf = requestAnimationFrame(tick);
  };

  return () => {
    alive = false;
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
