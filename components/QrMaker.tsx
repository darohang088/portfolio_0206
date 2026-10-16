"use client";

import { useEffect, useRef, useState } from "react";
import { FRAMES, W, H, draw, type Frame } from "@/lib/qrFrames";

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
