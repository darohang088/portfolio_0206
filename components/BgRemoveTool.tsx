"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyEdits, bounds, coverage, cutout, ICON_HANDOFF, paintStrokes, refineMask, sharpen, type Img, type Stroke } from "@/lib/bgremove";

/** Biggest photo kept at full size (4096 × 4096); larger ones are scaled down to this. */
const MAX_PIXELS = 4096 * 4096;
/** Longest side of the on-screen preview. */
const VIEW = 1280;
const SWATCHES = ["#ffffff", "#000000", "#f2f2f2", "#06071a", "#f7c948", "#1e88e5", "#43a047", "#e53935"];

type Phase = "idle" | "loading" | "working" | "done" | "error";
type View = "result" | "original" | "mask";
type Tool = "none" | "keep" | "erase";
type Tier = "best" | "standard";

function toImg(src: CanvasImageSource, sw: number, sh: number, scale: number): Img {
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingQuality = "high";
  g.drawImage(src, 0, 0, w, h);
  return { w, h, data: g.getImageData(0, 0, w, h).data };
}

function imgCanvas(img: Img) {
  const c = document.createElement("canvas");
  c.width = img.w;
  c.height = img.h;
  c.getContext("2d")!.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.w, img.h), 0, 0);
  return c;
}

const mb = (n: number) => (n / 1e6).toFixed(0);

// Background remover: AI cut-out in the browser, then edge refinement and colour clean-up at full size.
export default function BgRemoveTool() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [ms, setMs] = useState(0);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const [name, setName] = useState("");
  const [full, setFull] = useState<Img | null>(null); // working copy at full size (capped)
  const [shrunk, setShrunk] = useState(false);
  const [mask, setMask] = useState<Float32Array | null>(null);

  const [refine, setRefine] = useState(true);
  const [sharp, setSharp] = useState(0);
  const [clean, setClean] = useState(true);
  const [crop, setCrop] = useState(false);
  const [bg, setBg] = useState<string | null>(null); // null = transparent
  const [view, setView] = useState<View>("result");
  const [tool, setTool] = useState<Tool>("none");
  const [brush, setBrush] = useState(40); // on-screen px
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redo, setRedo] = useState<Stroke[]>([]);
  const [saving, setSaving] = useState("");

  const worker = useRef<Worker | null>(null);
  const job = useRef(0);
  const cpuOnly = useRef(false); // set after the GPU model fails once
  const pending = useRef<Img | null>(null); // the photo being processed, for a retry on the CPU
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<Stroke | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  const getWorker = useCallback(() => {
    if (worker.current) return worker.current;
    const w = new Worker("/bg/worker.js", { type: "module" });
    w.onmessage = (e) => {
      const d = e.data;
      if (d.type === "progress") setProgress({ loaded: d.loaded, total: d.total });
      else if (d.type === "tier") setTier(d.tier);
      else if (d.type === "status") {
        setProgress(null);
        setStatus(d.text);
      } else if (d.type === "mask") {
        if (d.id !== job.current) return;
        setTier(d.tier);
        setMs(d.ms);
        setMask(d.mask);
        setPhase("done");
      } else if (d.type === "gpu-failed") {
        if (d.id !== undefined && d.id !== job.current) return;
        // Start over in a fresh worker on the standard model.
        cpuOnly.current = true;
        w.terminate();
        worker.current = null;
        setTier("standard");
        setProgress(null);
        setStatus("Your GPU couldn't run the best model. Switching to the standard model…");
        const img = pending.current;
        if (img) createImageBitmap(imgCanvas(img)).then((bitmap) => getWorker().postMessage({ type: "run", id: job.current, bitmap, force: "standard" }, [bitmap]));
      } else if (d.type === "error") {
        if (d.id !== undefined && d.id !== job.current) return;
        setError(d.message || "Something went wrong.");
        setPhase("error");
      }
    };
    w.onerror = () => {
      setError("The AI engine couldn't start in this browser. Try the latest Chrome, Edge, Safari or Firefox.");
      setPhase("error");
      worker.current = null;
    };
    worker.current = w;
    return w;
  }, []);

  const start = async (file: Blob | undefined, fileName: string) => {
    if (!file) return;
    setError("");
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setError("That file isn't an image this browser can open. Try a JPG, PNG or WebP (iPhone HEIC photos: export as JPG first).");
      return;
    }
    const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (bitmap.width * bitmap.height)));
    const img = toImg(bitmap, bitmap.width, bitmap.height, scale);
    setFull(img);
    setShrunk(scale < 1);
    setName(fileName.replace(/\.[^.]+$/, "") || "image");
    setMask(null);
    setStrokes([]);
    setRedo([]);
    setTool("none");
    setView("result");
    setPhase("loading");
    setStatus("Removing the background…");
    setProgress(null);
    pending.current = img;
    const id = ++job.current;
    getWorker().postMessage({ type: "run", id, bitmap, force: cpuOnly.current ? "standard" : undefined }, [bitmap]);
  };

  const sample = async () => {
    const res = await fetch("/bg/sample.jpg");
    start(await res.blob(), "astronaut.jpg");
  };

  // Preview copy: the slow steps run at this size while you adjust, and at full size on download.
  const view0 = useMemo(() => {
    if (!full) return null;
    const s = Math.min(1, VIEW / Math.max(full.w, full.h));
    if (s === 1) return { img: full, scale: 1 };
    return { img: toImg(imgCanvas(full), full.w, full.h, s), scale: s };
  }, [full]);

  const baseAlpha = useMemo(() => (view0 && mask ? sharpen(refineMask(view0.img, mask, 1024, refine), sharp) : null), [view0, mask, refine, sharp]);
  const alpha = useMemo(() => {
    if (!view0 || !baseAlpha) return null;
    return applyEdits(baseAlpha, paintStrokes(strokes, view0.img.w, view0.img.h, view0.scale));
  }, [view0, baseAlpha, strokes]);
  const result = useMemo(() => (view0 && alpha ? cutout(view0.img, alpha, clean) : null), [view0, alpha, clean]);
  const empty = useMemo(() => (alpha ? coverage(alpha) < 0.001 : false), [alpha]);

  // Draw the preview.
  useEffect(() => {
    const c = canvas.current;
    if (!c || !view0) return;
    const { img } = view0;
    c.width = img.w;
    c.height = img.h;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, img.w, img.h);
    if (view === "original" || !result || !alpha) {
      g.putImageData(new ImageData(img.data as Uint8ClampedArray<ArrayBuffer>, img.w, img.h), 0, 0);
      return;
    }
    if (view === "mask") {
      const m = new Uint8ClampedArray(img.w * img.h * 4);
      for (let i = 0; i < alpha.length; i++) {
        const v = Math.round(alpha[i] * 255);
        m[i * 4] = m[i * 4 + 1] = m[i * 4 + 2] = v;
        m[i * 4 + 3] = 255;
      }
      g.putImageData(new ImageData(m, img.w, img.h), 0, 0);
      return;
    }
    const layer = imgCanvas({ w: img.w, h: img.h, data: result });
    if (bg) {
      g.fillStyle = bg;
      g.fillRect(0, 0, img.w, img.h);
    }
    g.drawImage(layer, 0, 0);
  }, [view0, result, alpha, view, bg]);

  // Brush: strokes are kept in full-size image pixels, drawn live on an overlay, applied on release.
  const toImage = (e: React.PointerEvent) => {
    const r = overlay.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * full!.w, y: ((e.clientY - r.top) / r.height) * full!.h, k: full!.w / r.width };
  };
  const paintOverlay = (s: Stroke | null, hover?: { x: number; y: number; size: number }) => {
    const o = overlay.current;
    if (!o || !view0) return;
    o.width = view0.img.w;
    o.height = view0.img.h;
    const g = o.getContext("2d")!;
    const k = view0.scale;
    if (s && s.points.length) {
      g.strokeStyle = s.mode === "keep" ? "rgba(67,214,140,.55)" : "rgba(255,92,122,.55)";
      g.lineWidth = s.size * k;
      g.lineCap = g.lineJoin = "round";
      g.beginPath();
      g.moveTo(s.points[0] * k, s.points[1] * k);
      for (let i = 2; i < s.points.length; i += 2) g.lineTo(s.points[i] * k, s.points[i + 1] * k);
      if (s.points.length === 2) g.lineTo(s.points[0] * k + 0.01, s.points[1] * k);
      g.stroke();
    }
    if (hover) {
      g.strokeStyle = "#fff";
      g.lineWidth = Math.max(1, 1.5 / (o.getBoundingClientRect().width / o.width || 1));
      g.beginPath();
      g.arc(hover.x * k, hover.y * k, (hover.size * k) / 2, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = "#000";
      g.setLineDash([4, 4]);
      g.stroke();
    }
  };
  const onDown = (e: React.PointerEvent) => {
    if (tool === "none" || !full) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toImage(e);
    drawing.current = { mode: tool, size: brush * p.k, points: [p.x, p.y] };
    paintOverlay(drawing.current);
  };
  const onMove = (e: React.PointerEvent) => {
    if (tool === "none" || !full) return;
    const p = toImage(e);
    const s = drawing.current;
    if (s) s.points.push(p.x, p.y);
    paintOverlay(s, { x: p.x, y: p.y, size: brush * p.k });
  };
  const onUp = () => {
    const s = drawing.current;
    drawing.current = null;
    if (s) {
      setStrokes((list) => [...list, s]);
      setRedo([]);
    }
    paintOverlay(null);
  };

  const undo = useCallback(() => {
    setStrokes((list) => {
      if (!list.length) return list;
      setRedo((r) => [...r, list[list.length - 1]]);
      return list.slice(0, -1);
    });
  }, []);
  const redoOne = useCallback(() => {
    setRedo((r) => {
      if (!r.length) return r;
      setStrokes((list) => [...list, r[r.length - 1]]);
      return r.slice(0, -1);
    });
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "done" || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      const t = e.target as HTMLElement;
      if (t.closest("input,textarea")) return;
      e.preventDefault();
      if (e.shiftKey) redoOne();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, undo, redoOne]);

  // Full-size render for download and for the icon generator.
  const render = async (opts: { background: string | null; maxSide?: number; forceCrop?: boolean }) => {
    if (!full || !mask) return null;
    await new Promise((r) => setTimeout(r, 30)); // let the "Preparing" label paint
    const a = applyEdits(sharpen(refineMask(full, mask, 1024, refine), sharp), paintStrokes(strokes, full.w, full.h, 1));
    const rgba = cutout(full, a, clean);
    let box = { x: 0, y: 0, w: full.w, h: full.h };
    if (crop || opts.forceCrop) box = bounds(rgba, full.w, full.h) ?? box;
    const layer = imgCanvas({ w: full.w, h: full.h, data: rgba });
    const s = opts.maxSide ? Math.min(1, opts.maxSide / Math.max(box.w, box.h)) : 1;
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(box.w * s));
    out.height = Math.max(1, Math.round(box.h * s));
    const g = out.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    if (opts.background) {
      g.fillStyle = opts.background;
      g.fillRect(0, 0, out.width, out.height);
    }
    g.drawImage(layer, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
    return out;
  };

  const download = async () => {
    setSaving("Preparing your PNG…");
    try {
      const out = await render({ background: bg });
      if (!out) return;
      const blob = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
      if (!blob) throw new Error();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}-no-bg.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch {
      setError("Couldn't make the PNG. The image may be too big for this device; try a smaller one.");
    } finally {
      setSaving("");
    }
  };

  const toIcons = async () => {
    setSaving("Opening the App Icon Generator…");
    try {
      const out = await render({ background: null, maxSide: 1024, forceCrop: true });
      if (!out) return;
      sessionStorage.setItem(ICON_HANDOFF, JSON.stringify({ name: `${name}-no-bg.png`, url: out.toDataURL("image/png") }));
      window.location.href = "/icons";
    } catch {
      setError("Couldn't hand the image over. Download the PNG and drop it into the App Icon Generator instead.");
      setSaving("");
    }
  };

  const reset = () => {
    job.current++;
    setPhase("idle");
    setFull(null);
    setMask(null);
    setStrokes([]);
    setRedo([]);
    setError("");
  };

  const pct = progress && progress.total ? Math.min(100, Math.round((progress.loaded / progress.total) * 100)) : null;
  const firstTime = progress && progress.loaded < progress.total;

  return (
    <div className="bgr">
      {phase === "idle" && (
        <>
          <label
            className={`qr-drop${drag ? " drag" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files[0];
              start(f, f?.name ?? "image");
            }}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                start(f, f?.name ?? "image");
                e.target.value = "";
              }}
            />
            <b>Drop a photo</b>
            <span>JPG, PNG or WebP · people, pets, products and logos · nothing is uploaded</span>
          </label>
          <button className="mini-tool bgr-sample" type="button" onClick={sample}>
            ★ Try with a sample photo
          </button>
        </>
      )}

      {phase === "loading" && (
        <section className="bgr-wait" aria-live="polite">
          <b>{firstTime ? "Downloading the AI model (first time only)" : status}</b>
          {firstTime && pct !== null && (
            <>
              <div className="bgr-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${pct}%` }} />
              </div>
              <span>
                {mb(progress!.loaded)} / {mb(progress!.total)} MB · it&apos;s saved in your browser, so next time starts right away
              </span>
            </>
          )}
          {!firstTime && <span>{tier === "standard" ? "The standard model runs on your CPU and takes about 10–30 seconds." : "This takes a few seconds."}</span>}
          <button className="mini-tool" type="button" onClick={reset}>
            Cancel
          </button>
        </section>
      )}

      {error && (
        <p className="rt-warn">
          {error}{" "}
          {phase === "error" && (
            <button className="pc-more" type="button" onClick={reset}>
              Try again
            </button>
          )}
        </p>
      )}

      {phase === "done" && view0 && (
        <div className="bgr-work">
          <section className="bgr-stage">
            <div className="bgr-tabs" role="tablist">
              {(["result", "original", "mask"] as View[]).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={`pc-f${view === v ? " on" : ""}`} onClick={() => setView(v)}>
                  {v === "result" ? "Result" : v === "original" ? "Original" : "Mask"}
                </button>
              ))}
            </div>
            <div className={`bgr-canvas${bg || view !== "result" ? "" : " checker"}${tool !== "none" ? " brushing" : ""}`}>
              <canvas ref={canvas} aria-label="Preview" />
              <canvas
                ref={overlay}
                className="bgr-overlay"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onPointerLeave={() => !drawing.current && paintOverlay(null)}
              />
            </div>
            {empty && <p className="rt-warn">No subject was found in this photo. Use the Keep brush to paint what you want to keep.</p>}
            <p className="bgr-meta">
              {tier === "best" ? "Best quality model (BiRefNet) on your GPU" : "Standard model (ISNet) on your CPU"} · {(ms / 1000).toFixed(1)} s · {full!.w} × {full!.h}
              {shrunk && " (scaled down from a bigger photo)"}
            </p>
            {tier === "standard" && <p className="bgr-tip">For sharper hair and fine detail, open this page in Chrome or Edge on a computer with a recent graphics card: it then uses the best model.</p>}
          </section>

          <aside className="bgr-side">
            <section className="bgr-panel">
              <h3>Edges</h3>
              <label className="bgr-check">
                <input type="checkbox" checked={refine} onChange={(e) => setRefine(e.target.checked)} />
                <span>
                  <b>Refine edges</b> Snaps the outline to the photo&apos;s real edges, like hair and fur.
                </span>
              </label>
              <label className="bgr-check">
                <input type="checkbox" checked={clean} onChange={(e) => setClean(e.target.checked)} />
                <span>
                  <b>Remove colour fringe</b> Takes the old background&apos;s colour out of soft edges, so there&apos;s no halo.
                </span>
              </label>
              <label className="bgr-range">
                <span>
                  Edge sharpness <small>{sharp === 0 ? "Natural" : sharp < 0.5 ? "Crisper" : "Hard"}</small>
                </span>
                <input type="range" min={0} max={1} step={0.05} value={sharp} onChange={(e) => setSharp(+e.target.value)} />
              </label>
            </section>

            <section className="bgr-panel">
              <h3>Touch up</h3>
              <div className="bgr-tools">
                <button type="button" className={`pc-f${tool === "keep" ? " on" : ""}`} aria-pressed={tool === "keep"} onClick={() => setTool(tool === "keep" ? "none" : "keep")}>
                  ✚ Keep
                </button>
                <button type="button" className={`pc-f${tool === "erase" ? " on" : ""}`} aria-pressed={tool === "erase"} onClick={() => setTool(tool === "erase" ? "none" : "erase")}>
                  ✖ Erase
                </button>
                <button type="button" className="pc-f" disabled={!strokes.length} onClick={undo} title="Undo (Ctrl+Z)">
                  ↶ Undo
                </button>
                <button type="button" className="pc-f" disabled={!redo.length} onClick={redoOne} title="Redo (Ctrl+Shift+Z)">
                  ↷ Redo
                </button>
              </div>
              <label className="bgr-range">
                <span>
                  Brush size <small>{brush}px</small>
                </span>
                <input type="range" min={6} max={160} step={2} value={brush} onChange={(e) => setBrush(+e.target.value)} />
              </label>
              <small className="bgr-hint">{tool === "none" ? "Pick Keep or Erase, then paint on the photo." : tool === "keep" ? "Paint over parts that went missing." : "Paint over leftover background."}</small>
            </section>

            <section className="bgr-panel">
              <h3>Background</h3>
              <div className="bgr-swatches">
                <button type="button" className={`bgr-sw none${bg === null ? " on" : ""}`} aria-label="Transparent" aria-pressed={bg === null} onClick={() => setBg(null)} />
                {SWATCHES.map((c) => (
                  <button key={c} type="button" className={`bgr-sw${bg === c ? " on" : ""}`} style={{ background: c }} aria-label={c} aria-pressed={bg === c} onClick={() => setBg(c)} />
                ))}
                <label className="bgr-sw pick" title="Pick a colour">
                  <input type="color" value={bg ?? "#ffffff"} onChange={(e) => setBg(e.target.value)} aria-label="Pick a colour" />
                </label>
              </div>
              <label className="bgr-check">
                <input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} />
                <span>
                  <b>Crop to the subject</b> Trims empty space around it.
                </span>
              </label>
            </section>

            <div className="bgr-actions">
              <button className="mini-tool bgr-main" type="button" onClick={download} disabled={!!saving || empty}>
                {saving || "⬇ Download PNG"}
              </button>
              <button className="mini-tool" type="button" onClick={toIcons} disabled={!!saving || empty}>
                Use as app icon →
              </button>
              <button className="mini-tool" type="button" onClick={reset} disabled={!!saving}>
                New photo
              </button>
            </div>
          </aside>
        </div>
      )}

      <details className="r8-tips rt-help">
        <summary>How it works</summary>
        <ul>
          <li>An AI model finds the subject right in your browser. Your photo is never uploaded.</li>
          <li>
            Browsers with WebGPU and 16-bit GPU support (recent Chrome and Edge, Safari 26) get <b>BiRefNet</b>, one of the best open models for clean edges. Others get <b>ISNet</b> on the CPU.
          </li>
          <li>The mask is then refined at your photo&apos;s full size: a guided filter follows the real edges, and colour clean-up removes the old background from soft edges.</li>
          <li>The first run downloads the model once (about 115 MB for BiRefNet, 90 MB for ISNet) and keeps it in your browser.</li>
          <li>
            Models: BiRefNet (MIT licence) and ISNet / DIS (Apache 2.0). Engine: ONNX Runtime Web (MIT).
          </li>
        </ul>
      </details>
    </div>
  );
}
