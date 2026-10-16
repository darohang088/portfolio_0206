"use client";

import { useEffect, useRef, useState } from "react";

const W = 393;
const H = 852;
const FRAME = 2 * (12 + 3); // bezel + border on each side
const OUTER_W = W + FRAME;
const OUTER_H = H + FRAME;
const GAP = 20;
const MAX_PER_ROW = 4;
const MAX_SCREENS = 12;
// Rapid-click guard: this many Renders inside the window triggers a cooldown.
const SPAM_CLICKS = 5;
const SPAM_WINDOW = 4000;
const COOLDOWN = 10;
// Lines typed out one by one in the spam warning's "terminal".
const TRACE = [
  "> Tracing IP address ..... FOUND",
  "> Locating lat, long ..... FOUND",
  "> Copying cookies ........ DONE",
];

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

const clampScreens = (n: number) => Math.min(MAX_SCREENS, Math.max(1, Math.round(n) || 1));

// Type a URL and how many screens, press Render, and see the site in that many
// 393 × 852 phone frames, at most 4 per row. With fixedUrl the address is filled in and locked.
export default function DeviceTester({ fixedUrl }: { fixedUrl?: string }) {
  const [input, setInput] = useState(fixedUrl ?? "");
  const [countInput, setCountInput] = useState("1");
  const [url, setUrl] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  const [reloads, setReloads] = useState(0);
  const [width, setWidth] = useState(0);
  const grid = useRef<HTMLDivElement>(null);
  const clicks = useRef<number[]>([]);
  const [cooldown, setCooldown] = useState(0);
  const [spamCount, setSpamCount] = useState(0);
  const warn = useRef<HTMLDialogElement>(null);
  const [trace, setTrace] = useState(0);
  const [sent, setSent] = useState(0);
  const okClose = useRef(false);

  // Type the trace lines one at a time after the warning opens.
  useEffect(() => {
    if (!trace || trace > TRACE.length) return;
    const t = setTimeout(() => setTrace((n) => n + 1), 550);
    return () => clearTimeout(t);
  }, [trace]);

  // Then count the fake "sending report" progress from 1 to 100 %.
  useEffect(() => {
    if (trace <= TRACE.length || sent >= 100) return;
    const t = setTimeout(() => setSent((n) => Math.min(100, n + 1 + Math.floor(Math.random() * 3))), 30);
    return () => clearTimeout(t);
  }, [trace, sent]);

  // Count the cooldown down once a second; the Render button stays locked until it hits 0.
  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Open with ?url=…&screens=… already rendered, so a test can be shared as a link.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = fixedUrl ? null : normalizeUrl(params.get("url") ?? "");
    const c = clampScreens(Number(params.get("screens") ?? 1));
    if (!n) return;
    setInput(params.get("url") ?? "");
    setCountInput(String(c));
    setUrl(n);
    setCount(c);
  }, [fixedUrl]);

  const render = (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < SPAM_WINDOW), now];
    if (cooldown || clicks.current.length >= SPAM_CLICKS) {
      setSpamCount(clicks.current.length);
      if (!cooldown) setCooldown(COOLDOWN);
      if (!warn.current?.open) {
        setTrace(1);
        setSent(0);
        warn.current?.showModal();
      }
      return;
    }
    const n = normalizeUrl(input);
    if (!n) {
      setError("Enter a web address, like example.com or https://example.com");
      return;
    }
    const c = clampScreens(Number(countInput));
    setError("");
    setCountInput(String(c));
    setUrl(n);
    setCount(c);
    setReloads((r) => r + 1);
    const q = new URL(window.location.href);
    q.searchParams.set("url", n);
    q.searchParams.set("screens", String(c));
    window.history.replaceState(null, "", q);
  };

  // Columns: up to 4, fewer on narrow screens so phones stay readable.
  const fitCols = width ? Math.max(1, Math.floor((width + GAP) / (OUTER_W * 0.42 + GAP))) : 1;
  const cols = Math.min(url ? count : 1, MAX_PER_ROW, fitCols);
  const scale = width ? Math.min(1, (width - GAP * (cols - 1)) / (cols * OUTER_W)) : 1;
  const screens = url ? count : 1;

  return (
    <div className="tester">
      <form className="tester-bar" onSubmit={render} noValidate>
        <label className="sr-only" htmlFor="testUrl">
          Website address
        </label>
        <input
          id="testUrl"
          className="tester-url"
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          autoComplete="url"
          spellCheck={false}
          value={input}
          readOnly={!!fixedUrl}
          aria-readonly={fixedUrl ? true : undefined}
          title={fixedUrl ? "This project's address is fixed" : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby="testErr"
          onChange={(e) => setInput(e.target.value)}
        />
        <label className="tester-count">
          <span>Screens</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_SCREENS}
            value={countInput}
            onChange={(e) => setCountInput(e.target.value)}
            onBlur={() => setCountInput(String(clampScreens(Number(countInput))))}
          />
        </label>
        <button className="btn btn-gold" type="submit" aria-disabled={cooldown > 0 || undefined}>
          {cooldown ? `Wait ${cooldown}s` : "Render ▶"}
        </button>
      </form>
      <p className="tester-err" id="testErr" role="alert">
        {error}
      </p>

      <div className="tester-tools">
        <span className="tester-size">
          {W} × {H}
        </span>
        <span className="tester-hint">Up to {MAX_PER_ROW} per row · max {MAX_SCREENS}</span>
        {url && (
          <>
            <button className="mini-tool" type="button" onClick={() => setReloads((r) => r + 1)}>
              ↻ Reload all
            </button>
            <a className="mini-tool" href={url} target="_blank" rel="noopener noreferrer">
              Open in new tab ↗
            </a>
          </>
        )}
      </div>

      <div className="device-grid" ref={grid} style={{ gridTemplateColumns: `repeat(${cols}, ${OUTER_W * scale}px)`, gap: GAP }}>
        {Array.from({ length: screens }, (_, i) => (
          <div className="device-cell" key={i} style={{ width: OUTER_W * scale, height: OUTER_H * scale + 28 }}>
            {url && screens > 1 && <span className="device-num">#{i + 1}</span>}
            <div className="device" style={{ width: W, height: H, transform: `scale(${scale})` }}>
              {url ? (
                <iframe
                  key={`${url}#${reloads}`}
                  src={url}
                  title={`Preview ${i + 1} of ${url}`}
                  width={W}
                  height={H}
                  loading={i < 4 ? "eager" : "lazy"}
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
        ))}
      </div>
      {/* Only the OK button closes it: no outside click, and Escape is blocked. */}
      <dialog
        className="spam-dialog"
        ref={warn}
        aria-labelledby="spamTitle"
        onCancel={(e) => e.preventDefault()}
        onClose={() => {
          // Chrome lets a repeated Escape close it anyway, so reopen unless OK was pressed.
          if (okClose.current) okClose.current = false;
          else warn.current?.showModal();
        }}
      >
        <p className="spam-tag">⚠ Spam detected</p>
        <h3 id="spamTitle">Caught you!</h3>
        <p>
          You hit Render <b>{spamCount} times</b> in a few seconds. Every click reloads all the phone screens, and that makes this page lag.
        </p>
        <div className="spam-term" aria-live="polite">
          {TRACE.slice(0, trace).map((l) => (
            <div key={l}>{l}</div>
          ))}
          {trace > TRACE.length && (
            <div>
              {"> Sending report to Daro "}
              {String(Math.max(1, sent)).padStart(3)}%
              <span className="spam-bar">
                <i style={{ transform: `scaleX(${sent / 100})` }} />
              </span>
            </div>
          )}
          {sent >= 100 ? (
            <div className="spam-sent">✔ Your IP, location and cookies have been sent to Daro.</div>
          ) : (
            <span className="spam-cursor" />
          )}
        </div>
        <p className="spam-timer">{cooldown ? `Try again in ${cooldown}s` : "You can render again now."}</p>
        <button className="btn btn-gold" type="button" autoFocus
          onClick={() => {
            okClose.current = true;
            warn.current?.close();
          }}
        >
          OK, I'll wait
        </button>
      </dialog>

      <p className="tester-note">
        Some websites block being shown inside other pages, so they stay blank here. Use <b>Open in new tab</b> for those.
      </p>
    </div>
  );
}
