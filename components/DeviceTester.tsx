"use client";

import { useEffect, useRef, useState } from "react";

const W = 393;
const H = 852;
const BEZEL = 12;
const BORDER = 3;

// Turn "example.com" into "https://example.com/". Only http(s) links are allowed.
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

// Type a URL, press Render, and see the site inside a 393 × 852 phone frame.
export default function DeviceTester() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reloads, setReloads] = useState(0);
  const [scale, setScale] = useState(1);
  const fit = useRef<HTMLDivElement>(null);

  // Shrink the frame on screens narrower than the phone.
  useEffect(() => {
    const el = fit.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(1, e.contentRect.width / (W + 2 * (BEZEL + BORDER)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Open with ?url=… already rendered, so a test can be shared as a link.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("url");
    if (!q) return;
    const n = normalizeUrl(q);
    if (n) {
      setInput(q);
      setUrl(n);
    }
  }, []);

  const render = (e: React.FormEvent) => {
    e.preventDefault();
    const n = normalizeUrl(input);
    if (!n) {
      setError("Enter a web address, like example.com or https://example.com");
      return;
    }
    setError("");
    setUrl(n);
    setReloads((r) => r + 1);
    const q = new URL(window.location.href);
    q.searchParams.set("url", n);
    window.history.replaceState(null, "", q);
  };

  const outerH = H + 2 * (BEZEL + BORDER);

  return (
    <div className="tester">
      <form className="tester-bar" onSubmit={render} noValidate>
        <label className="sr-only" htmlFor="testUrl">
          Website address
        </label>
        <input
          id="testUrl"
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          autoComplete="url"
          spellCheck={false}
          value={input}
          aria-invalid={error ? true : undefined}
          aria-describedby="testErr"
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn btn-gold" type="submit">
          Render ▶
        </button>
      </form>
      <p className="tester-err" id="testErr" role="alert">
        {error}
      </p>

      <div className="tester-tools">
        <span className="tester-size">
          {W} × {H}
        </span>
        {url && (
          <>
            <button className="mini-tool" type="button" onClick={() => setReloads((r) => r + 1)}>
              ↻ Reload
            </button>
            <a className="mini-tool" href={url} target="_blank" rel="noopener noreferrer">
              Open in new tab ↗
            </a>
          </>
        )}
      </div>

      <div className="device-fit" ref={fit} style={{ height: outerH * scale }}>
        <div
          className="device"
          style={{ width: W, height: H, transform: `scale(${scale})`, marginInline: `${(-(W + 2 * (BEZEL + BORDER)) * (1 - scale)) / 2}px` }}
        >
          {url ? (
            <iframe
              key={`${url}#${reloads}`}
              src={url}
              title={`Preview of ${url}`}
              width={W}
              height={H}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : (
            <div className="device-empty">
              <b>Ready</b>
              <span>Type a website address above and press Render.</span>
            </div>
          )}
        </div>
      </div>
      <p className="tester-note">
        Some websites block being shown inside other pages, so they stay blank here. Use <b>Open in new tab</b> for those.
      </p>
    </div>
  );
}
