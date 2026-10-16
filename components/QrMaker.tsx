"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Frame = "pay" | "pixel" | "clean";
const FRAMES: { id: Frame; name: string; title: string; caption: string }[] = [
  { id: "pay", name: "Pay card", title: "SCAN TO PAY", caption: "Hang Daro" },
  { id: "pixel", name: "Pixel", title: "SCAN ME", caption: "PRESS START" },
  { id: "clean", name: "Clean", title: "", caption: "Scan with your phone camera" },
];

const W = 600;
const H = 780;

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Draw the QR modules in a square at (x, y) of the given size, with a white quiet zone.
function drawQr(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, dark: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 2;
  const cell = Math.floor(size / (n + quiet * 2));
  const inner = cell * (n + quiet * 2);
  const ox = x + Math.floor((size - inner) / 2) + quiet * cell;
  const oy = y + Math.floor((size - inner) / 2) + quiet * cell;
  g.fillStyle = "#fff";
  g.fillRect(x, y, size, size);
  g.fillStyle = dark;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.modules.get(r, c)) g.fillRect(ox + c * cell, oy + r * cell, cell, cell);
}

function fitText(g: CanvasRenderingContext2D, text: string, font: (px: number) => string, start: number, maxW: number) {
  let px = start;
  g.font = font(px);
  while (px > 12 && g.measureText(text).width > maxW) g.font = font(--px);
}

function draw(g: CanvasRenderingContext2D, frame: Frame, text: string, title: string, caption: string) {
  const pixel = cssVar("--f-pixel", "monospace");
  const sans = `system-ui, -apple-system, "Segoe UI", sans-serif`;
  g.clearRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "middle";

  if (frame === "pay") {
    // White card with a red header, like a shop's payment stand.
    g.fillStyle = "#ffffff";
    roundRect(g, 20, 20, W - 40, H - 40, 34);
    g.fill();
    g.save();
    roundRect(g, 20, 20, W - 40, H - 40, 34);
    g.clip();
    g.fillStyle = "#e1232e";
    g.fillRect(20, 20, W - 40, 130);
    g.beginPath(); // folded corner
    g.moveTo(W - 20 - 70, 150);
    g.lineTo(W - 20, 150);
    g.lineTo(W - 20, 80);
    g.closePath();
    g.fillStyle = "#b81822";
    g.fill();
    g.restore();
    g.fillStyle = "#fff";
    fitText(g, title || "SCAN TO PAY", (px) => `800 ${px}px ${sans}`, 46, W - 140);
    g.fillText(title || "SCAN TO PAY", W / 2, 86);
    g.fillStyle = "#1b1b1f";
    fitText(g, caption, (px) => `700 ${px}px ${sans}`, 34, W - 120);
    g.fillText(caption, W / 2, 200);
    g.setLineDash([10, 8]);
    g.strokeStyle = "#d5d7e0";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(50, 240);
    g.lineTo(W - 50, 240);
    g.stroke();
    g.setLineDash([]);
    drawQr(g, text, 90, 270, 420, "#111");
    g.fillStyle = "#8a8d99";
    g.font = `600 20px ${sans}`;
    g.fillText("Open your banking app and scan", W / 2, 722);
  } else if (frame === "pixel") {
    // Game-style frame: navy panel, stepped gold border, pixel font.
    g.fillStyle = "#1a1030";
    g.fillRect(20, 28, W - 40, H - 48);
    g.fillStyle = "#0b0c22";
    g.fillRect(28, 20, W - 56, H - 32);
    const step = 8;
    g.fillStyle = "#f6c453";
    g.fillRect(28 + step, 20, W - 56 - step * 2, step);
    g.fillRect(28 + step, H - 20, W - 56 - step * 2, step);
    g.fillRect(20, 28 + step, step, H - 56 - step * 2);
    g.fillRect(W - 28, 28 + step, step, H - 56 - step * 2);
    g.fillRect(28, 28, step, step);
    g.fillRect(W - 36, 28, step, step);
    g.fillRect(28, H - 28, step, step);
    g.fillRect(W - 36, H - 28, step, step);
    g.fillStyle = "#f6c453";
    fitText(g, title || "SCAN ME", (px) => `700 ${px}px ${pixel}`, 52, W - 140);
    g.fillText(title || "SCAN ME", W / 2, 100);
    g.fillStyle = "#4ef08f";
    for (let i = 0; i < 18; i++) g.fillRect(130 + i * 19, 150, 14, 10); // XP bar
    g.fillStyle = "#1a1030";
    g.fillRect(96, 196, 420, 420);
    drawQr(g, text, 90, 190, 420, "#0b0c22");
    g.fillStyle = "#eef0ff";
    fitText(g, caption, (px) => `700 ${px}px ${pixel}`, 26, W - 120);
    g.fillText(caption, W / 2, 680);
    g.fillStyle = "#f6c453";
    g.fillText("▶", W / 2 - g.measureText(caption).width / 2 - 26, 680);
  } else {
    // Clean: plain white card, thin border, caption under the code.
    g.fillStyle = "#ffffff";
    roundRect(g, 20, 20, W - 40, H - 40, 28);
    g.fill();
    g.strokeStyle = "#dfe3f5";
    g.lineWidth = 4;
    g.stroke();
    if (title) {
      g.fillStyle = "#14183e";
      fitText(g, title, (px) => `800 ${px}px ${sans}`, 40, W - 120);
      g.fillText(title, W / 2, 92);
    }
    drawQr(g, text, 90, title ? 140 : 90, 420, "#14183e");
    g.fillStyle = "#14183e";
    fitText(g, caption, (px) => `700 ${px}px ${sans}`, 28, W - 120);
    g.fillText(caption, W / 2, title ? 620 : 570);
    g.fillStyle = "#8a8fb8";
    g.font = `500 18px ${sans}`;
    g.fillText(text.length > 46 ? text.slice(0, 44) + "…" : text, W / 2, title ? 662 : 612);
  }
}

// QR Code Maker: type any text or link, pick a frame, download the PNG.
export default function QrMaker() {
  const [text, setText] = useState("https://portfolio-0206.darohang009988.workers.dev");
  const [frame, setFrame] = useState<Frame>("pay");
  const [title, setTitle] = useState(FRAMES[0].title);
  const [caption, setCaption] = useState(FRAMES[0].caption);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      const c = canvas.current;
      const g = c?.getContext("2d");
      if (!alive || !c || !g) return;
      c.width = W * 2;
      c.height = H * 2;
      g.setTransform(2, 0, 0, 2, 0, 0);
      if (!text.trim()) {
        g.clearRect(0, 0, W, H);
        setError("Type some text or a link to make a QR code.");
        return;
      }
      try {
        draw(g, frame, text, title, caption);
        setError("");
      } catch {
        setError("That's too much text for one QR code. Try something shorter.");
      }
    });
    return () => {
      alive = false;
    };
  }, [text, frame, title, caption]);

  const pick = (f: Frame) => {
    const d = FRAMES.find((x) => x.id === f)!;
    setFrame(f);
    setTitle(d.title);
    setCaption(d.caption);
  };

  const download = () => {
    canvas.current?.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = `qr-${frame}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };

  return (
    <div className="qr-maker">
      <div className="qr-maker-form">
        <label className="field">
          <span>Text or link</span>
          <textarea rows={4} maxLength={1200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a link, a KHQR string, Wi-Fi text, anything…" />
          <small>{text.length} / 1200</small>
        </label>
        <fieldset className="frame-pick">
          <legend>Frame</legend>
          {FRAMES.map((f) => (
            <button key={f.id} type="button" className={`frame-opt f-${f.id}${frame === f.id ? " on" : ""}`} aria-pressed={frame === f.id} onClick={() => pick(f.id)}>
              <span className="frame-mini" aria-hidden="true" />
              {f.name}
            </button>
          ))}
        </fieldset>
        <label className="field">
          <span>Title</span>
          <input value={title} maxLength={30} onChange={(e) => setTitle(e.target.value)} placeholder={frame === "clean" ? "(optional)" : ""} />
        </label>
        <label className="field">
          <span>Caption</span>
          <input value={caption} maxLength={40} onChange={(e) => setCaption(e.target.value)} />
        </label>
        <p className="tester-err" role="alert">
          {error}
        </p>
      </div>
      <div className="qr-maker-out">
        <canvas ref={canvas} className="qr-canvas" role="img" aria-label={`QR code for ${text}`} />
        <button className="btn btn-gold" type="button" onClick={download} disabled={!!error}>
          ⬇ Download PNG
        </button>
      </div>
    </div>
  );
}
