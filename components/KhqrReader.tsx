"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { decodeKhqr, type KhqrResult, type Tlv } from "@/lib/khqr";
import CopyButton from "./CopyButton";

type Mode = "upload" | "url" | "camera" | "paste";
const MODES: { id: Mode; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "url", label: "URL" },
  { id: "camera", label: "Camera" },
  { id: "paste", label: "Paste" },
];

// Find a QR code in an image, trying a couple of sizes because tiny or huge images can fail.
function readQr(img: CanvasImageSource & { width: number; height: number }): string | null {
  const c = document.createElement("canvas");
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return null;
  for (const max of [1200, 800, 1800, 500]) {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    c.width = Math.max(1, Math.round(img.width * k));
    c.height = Math.max(1, Math.round(img.height * k));
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height);
    const hit = jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" });
    if (hit?.data) return hit.data;
  }
  return null;
}

async function blobToBitmap(blob: Blob) {
  if ("createImageBitmap" in window) return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

// KHQR Reader: get a QR from an image, link, camera or clipboard and show what's inside.
export default function KhqrReader() {
  const [mode, setMode] = useState<Mode>("upload");
  const [result, setResult] = useState<KhqrResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  const show = useCallback((data: string) => {
    setError("");
    setResult(decodeKhqr(data));
  }, []);

  // Text from the camera, the URL box or Paste has no picture of its own, so drop any old one.
  const showText = useCallback(
    (data: string) => {
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return null;
      });
      show(data);
    },
    [show],
  );

  // Start clean: clear the last result, picture and inputs.
  const reset = useCallback(() => {
    setResult(null);
    setError("");
    setUrl("");
    setText("");
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, []);

  // Coming back with the browser's Back button can restore the old page; clear it then too.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && reset();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [reset]);

  const fromBlob = useCallback(
    async (blob: Blob) => {
      setBusy(true);
      setError("");
      setResult(null);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      try {
        const bmp = await blobToBitmap(blob);
        const data = readQr(bmp);
        if (data) show(data);
        else setError("No QR code found in this image. Try a sharper or closer picture.");
      } catch {
        setError("Couldn't open this image.");
      } finally {
        setBusy(false);
      }
    },
    [show],
  );

  // Paste an image (or KHQR text) anywhere on the page while on the Paste tab.
  useEffect(() => {
    if (mode !== "paste") return;
    const onPaste = (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      if (item) {
        e.preventDefault();
        const f = item.getAsFile();
        if (f) fromBlob(f);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode, fromBlob]);

  const loadUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!v) return;
    if (/^000201/.test(v)) return showText(v); // they pasted the KHQR text itself
    setBusy(true);
    setError("");
    try {
      const res = await fetch(v, { mode: "cors" });
      if (!res.ok) throw new Error(String(res.status));
      await fromBlob(await res.blob());
    } catch {
      setBusy(false);
      setError("Couldn't load that image. Many sites block other pages from reading their images: save it and use Upload instead.");
    }
  };

  return (
    <div className="qr-tool">
      <div className="qr-tabs" role="tablist" aria-label="How to read the QR">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            className={mode === m.id ? "on" : undefined}
            onClick={() => {
              if (m.id !== mode) reset();
              setMode(m.id);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "upload" && (
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
            if (f) fromBlob(f);
          }}
        >
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && fromBlob(e.target.files[0])} />
          <b>{busy ? "Reading…" : "Click to upload"}</b>
          <span>or drag &amp; drop a KHQR image</span>
        </label>
      )}

      {mode === "url" && (
        <form className="qr-row" onSubmit={loadUrl}>
          <input className="tester-url" type="url" inputMode="url" placeholder="https://… link to a QR image" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? "Reading…" : "Read ▶"}
          </button>
        </form>
      )}

      {mode === "camera" && <CameraScan onFound={showText} />}

      {mode === "paste" && (
        <div className="qr-paste">
          <div className="qr-drop small" tabIndex={0}>
            <b>Press Ctrl+V / ⌘V</b>
            <span>to paste a screenshot of the QR</span>
          </div>
          <form
            className="qr-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) showText(text);
            }}
          >
            <input className="tester-url" placeholder="…or paste the KHQR text (starts with 000201)" value={text} onChange={(e) => setText(e.target.value)} />
            <button className="btn btn-gold" type="submit">
              Decode ▶
            </button>
          </form>
        </div>
      )}

      <p className="tester-err" role="alert">
        {error}
      </p>

      {result && <KhqrView r={result} preview={preview} />}
    </div>
  );
}

function CameraScan({ onFound }: { onFound: (data: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState("");
  const stream = useRef<MediaStream | null>(null);

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setOn(false);
  };

  useEffect(() => stop, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      const v = video.current;
      if (v && v.readyState >= 2 && t - last > 200) {
        last = t;
        const data = readQrVideo(v);
        if (data) {
          stop();
          onFound(data);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, onFound]);

  const start = async () => {
    setMsg("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      stream.current = s;
      if (video.current) {
        video.current.srcObject = s;
        await video.current.play();
      }
      setOn(true);
    } catch {
      setMsg("Camera not available. Allow camera access, or use Upload instead.");
    }
  };

  return (
    <div className="qr-cam">
      <div className={`qr-cam-view${on ? " on" : ""}`}>
        <video ref={video} playsInline muted />
        {on && <span className="qr-cam-box" aria-hidden="true" />}
        {!on && (
          <button className="btn btn-gold" type="button" onClick={start}>
            📷 Start camera
          </button>
        )}
      </div>
      {on && (
        <button className="mini-tool" type="button" onClick={stop}>
          Stop camera
        </button>
      )}
      <p className="qr-note">{msg || "Point the camera at a KHQR. It reads it automatically."}</p>
    </div>
  );
}

function readQrVideo(v: HTMLVideoElement) {
  const c = document.createElement("canvas");
  c.width = v.videoWidth;
  c.height = v.videoHeight;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g || !c.width) return null;
  g.drawImage(v, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return jsQR(d.data, d.width, d.height, { inversionAttempts: "dontInvert" })?.data ?? null;
}

function KhqrView({ r, preview }: { r: KhqrResult; preview: string | null }) {
  const [tech, setTech] = useState(false);
  const zoom = useRef<HTMLDialogElement>(null);
  const amount = r.fields.find((f) => f.label === "Amount");
  return (
    <section className="khqr-result" aria-label="Decoded QR">
      <div className="khqr-badges">
        <span className={`sev ${r.isKhqr ? "sev-pass" : "sev-info"}`}>{r.isKhqr ? "✓ KHQR" : "Not KHQR"}</span>
        {r.crcOk !== null && <span className={`sev ${r.crcOk ? "sev-pass" : "sev-high"}`}>{r.crcOk ? "✓ Checksum valid" : "✗ Checksum wrong"}</span>}
        {r.isKhqr && <span className="sev sev-low">{r.type}</span>}
      </div>

      {r.isKhqr || r.fields.length > 2 ? (
        <div className="khqr-card">
          {preview && (
            <button className="khqr-thumb-btn" type="button" onClick={() => zoom.current?.showModal()} aria-label="View the QR image larger">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="khqr-thumb" src={preview} alt="The QR image you gave" />
              <span aria-hidden="true">🔍 Tap to view</span>
            </button>
          )}
          <div className="khqr-main">
            <p className="khqr-to">Pay to</p>
            <h3>{r.merchantName ?? "Unknown"}</h3>
            <p className="khqr-amount">{amount?.value ?? "—"}</p>
            <dl className="khqr-fields">
              {r.fields
                .filter((f) => !["Merchant name", "Amount"].includes(f.label))
                .map((f) => (
                  <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>
                      {f.value}
                      {f.hint && <small> · {f.hint}</small>}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        </div>
      ) : (
        <div className="khqr-card plain">
          <p>This QR code holds:</p>
          {/^https?:\/\//.test(r.raw) ? (
            <a href={r.raw} target="_blank" rel="noopener noreferrer nofollow">
              {r.raw} ↗
            </a>
          ) : (
            <pre>{r.raw}</pre>
          )}
        </div>
      )}

      {r.crcOk === false && <p className="tester-err">The checksum doesn&apos;t match (expected {r.crcExpected}). This QR may have been edited. Don&apos;t pay with it.</p>}
      {r.errors.map((e) => (
        <p key={e} className="tester-err">
          {e}
        </p>
      ))}

      {preview && (
        <dialog ref={zoom} className="img-zoom" onClick={(e) => e.target === e.currentTarget && zoom.current?.close()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="The QR image you gave, full size" />
          <button className="img-zoom-close" type="button" onClick={() => zoom.current?.close()} aria-label="Close">
            ✕
          </button>
        </dialog>
      )}

      <div className="khqr-raw">
        <div className="khqr-raw-head">
          <b>Raw data</b>
          <CopyButton text={r.raw} targetId="khqrRaw" />
          <button className="mini-tool" type="button" onClick={() => setTech((t) => !t)}>
            {tech ? "Hide" : "Show"} technical details
          </button>
        </div>
        <code id="khqrRaw">{r.raw}</code>
        {tech && <TlvTable items={r.tree} />}
      </div>
    </section>
  );
}

function TlvTable({ items, depth = 0 }: { items: Tlv[]; depth?: number }) {
  return (
    <table className={`tlv${depth ? " sub" : ""}`}>
      {!depth && (
        <thead>
          <tr>
            <th>Tag</th>
            <th>Name</th>
            <th>Len</th>
            <th>Value</th>
          </tr>
        </thead>
      )}
      <tbody>
        {items.map((t, i) => (
          <tr key={`${t.tag}-${i}`}>
            <td>{t.tag}</td>
            <td>{t.label}</td>
            <td>{t.length}</td>
            <td>{t.children?.length ? <TlvTable items={t.children} depth={depth + 1} /> : t.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
