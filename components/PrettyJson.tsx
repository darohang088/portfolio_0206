"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";

type Indent = "2" | "4" | "tab";
type View = "text" | "tree";
type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
type Parsed = { ok: true; value: Json } | { ok: false; message: string; line?: number; col?: number };

const SAMPLE = '{"name":"Hang Daro","role":"Android Engineer","skills":["Kotlin","Flutter","Jetpack Compose"],"apps":[{"title":"Tos","users":12000,"live":true}],"remote":null}';
const MAX_HIGHLIGHT = 1_000_000; // above this the output is shown as plain text so the page stays fast

// JSON.parse is fast but its error messages differ by browser and often have no position,
// so on failure a small checker walks the text to find the exact spot and say what's wrong.
function parse(text: string): Parsed {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    const { at, message } = findError(text);
    const before = text.slice(0, at).split("\n");
    return { ok: false, message, line: before.length, col: before[before.length - 1].length + 1 };
  }
}

function findError(s: string): { at: number; message: string } {
  let i = 0;
  const fail = (message: string, at = i): never => {
    throw { at, message };
  };
  const ws = () => {
    while (i < s.length && " \t\n\r".includes(s[i])) i++;
  };
  const show = (c: string | undefined) => (c === undefined ? "end of text" : c === '"' ? `'"'` : `"${c}"`);
  const value = (): void => {
    ws();
    const c = s[i];
    if (c === "{") {
      i++;
      ws();
      if (s[i] === "}") return void i++;
      for (;;) {
        ws();
        if (s[i] !== '"') fail(s[i] === "}" ? "Trailing comma before }" : `Expected a "key" in double quotes, found ${show(s[i])}`);
        string();
        ws();
        if (s[i] !== ":") fail(`Expected : after the key, found ${show(s[i])}`);
        i++;
        value();
        ws();
        if (s[i] === ",") i++;
        else if (s[i] === "}") return void i++;
        else fail(`Expected , or } after a value, found ${show(s[i])}`);
      }
    }
    if (c === "[") {
      i++;
      ws();
      if (s[i] === "]") return void i++;
      for (;;) {
        ws();
        if (s[i] === "]") fail("Trailing comma before ]");
        value();
        ws();
        if (s[i] === ",") i++;
        else if (s[i] === "]") return void i++;
        else fail(`Expected , or ] after a value, found ${show(s[i])}`);
      }
    }
    if (c === '"') return string();
    if (c === "'") fail("Strings must use double quotes, not single quotes");
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(s.slice(i, i + 400));
    if (m && m[0] !== "-") return void (i += m[0].length);
    for (const w of ["true", "false", "null"]) if (s.startsWith(w, i)) return void (i += w.length);
    fail(c === undefined ? "Unexpected end of text: something is missing" : `Unexpected ${show(c)}`);
  };
  const string = () => {
    const start = i++;
    while (i < s.length && s[i] !== '"') {
      if (s[i] === "\n") fail("Strings can't contain line breaks (use \\n)");
      if (s[i] === "\\") {
        i++;
        if (s[i] === "u" ? !/^u[0-9a-fA-F]{4}/.test(s.slice(i, i + 5)) : !'"\\/bfnrt'.includes(s[i])) fail("Invalid escape in a string", i - 1);
      }
      i++;
    }
    if (i >= s.length) fail("String is never closed", start);
    i++;
  };
  try {
    value();
    ws();
    if (i < s.length) fail(`Unexpected ${show(s[i])} after the end of the JSON`);
    return { at: 0, message: "Invalid JSON" };
  } catch (e) {
    return e as { at: number; message: string };
  }
}

// Colour the formatted JSON: keys, strings, numbers, true/false/null.
function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const cls = m[1] ? (m[2] ? "j-key" : "j-str") : m[3] ? "j-bool" : m[0] === "null" ? "j-null" : "j-num";
    out.push(
      <span key={m.index} className={cls}>
        {m[1] ?? m[0]}
      </span>,
    );
    if (m[2]) out.push(m[2]);
    last = re.lastIndex;
  }
  out.push(src.slice(last));
  return out;
}

const sizeOf = (s: string) => {
  const n = new TextEncoder().encode(s).length;
  return n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
};

// Pretty JSON: paste on the left, the formatted (or minified) JSON appears on the right.
export default function PrettyJson() {
  const { t } = useLang();
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<Indent>("2");
  const [minify, setMinify] = useState(false);
  const [view, setView] = useState<View>("text");
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const parsed = useMemo<Parsed | null>(() => (input.trim() ? parse(input) : null), [input]);
  const output = useMemo(() => {
    if (!parsed?.ok) return "";
    return JSON.stringify(parsed.value, null, minify ? undefined : indent === "tab" ? "\t" : Number(indent));
  }, [parsed, indent, minify]);

  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(""), 2500);
    return () => clearTimeout(id);
  }, [note]);

  // Put the cursor on the error so it is easy to find in the input.
  const jumpToError = () => {
    if (!parsed || parsed.ok || !parsed.line || !area.current) return;
    const lines = input.split("\n");
    const at = lines.slice(0, parsed.line - 1).reduce((n, l) => n + l.length + 1, 0) + (parsed.col ?? 1) - 1;
    area.current.focus();
    area.current.setSelectionRange(at, Math.min(at + 1, input.length));
  };

  const paste = async () => {
    try {
      setInput(await navigator.clipboard.readText());
      setMinify(false);
    } catch {
      area.current?.focus();
      setNote(t("Your browser blocked reading the clipboard. Press Ctrl+V / ⌘V in the input instead."));
    }
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setNote(t("Couldn't copy. Select the output and copy it by hand.")),
    );
  };

  const load = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) return setNote(t("That file is too big."));
    setInput(await f.text());
    setMinify(false);
  };

  const stats = parsed?.ok ? describe(parsed.value) : null;

  return (
    <div className="pj">
      <div className="pj-bar" role="toolbar" aria-label={t("JSON actions")}>
        <button className="mini-tool" type="button" onClick={paste}>
          {t("Paste")}
        </button>
        <button className="mini-tool" type="button" onClick={copy} disabled={!output}>
          {copied ? t("✓ Copied") : t("Copy")}
        </button>
        <span className="pj-sep" aria-hidden="true" />
        <button className={`mini-tool${!minify ? " on" : ""}`} type="button" onClick={() => setMinify(false)} aria-pressed={!minify}>
          {t("Format")}
        </button>
        <button className={`mini-tool${minify ? " on" : ""}`} type="button" onClick={() => setMinify(true)} aria-pressed={minify}>
          {t("Remove white space")}
        </button>
        <label className="pj-indent">
          <span>{t("Indent")}</span>
          <select value={indent} onChange={(e) => setIndent(e.target.value as Indent)} disabled={minify}>
            <option value="2">{t("2 spaces")}</option>
            <option value="4">{t("4 spaces")}</option>
            <option value="tab">{t("Tab")}</option>
          </select>
        </label>
        <span className="pj-sep" aria-hidden="true" />
        <button className="mini-tool" type="button" onClick={() => setInput("")} disabled={!input}>
          {t("Clear")}
        </button>
        <button className="mini-tool" type="button" onClick={() => file.current?.click()}>
          {t("Load JSON data")}
        </button>
        <button className="mini-tool" type="button" onClick={() => setInput(SAMPLE)}>
          {t("Sample")}
        </button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          onChange={(e) => {
            load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="pj-panes">
        <section className="pj-pane">
          <header className="pj-head">
            <b>{t("Input")}</b>
            {input && <small>{sizeOf(input)}</small>}
          </header>
          <textarea
            ref={area}
            className={`pj-input${parsed && !parsed.ok ? " bad" : ""}`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const f = e.dataTransfer.files[0];
              if (f) {
                e.preventDefault();
                load(f);
              }
            }}
            placeholder={t("Paste the JSON code here (your code is not saved anywhere)")}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label={t("JSON input")}
          />
        </section>

        <section className="pj-pane">
          <header className="pj-head">
            <div className="pj-views" role="tablist" aria-label={t("Output view")}>
              {(["text", "tree"] as View[]).map((v) => (
                <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? "on" : undefined} onClick={() => setView(v)}>
                  {t(v === "text" ? "Text" : "Viewer")}
                </button>
              ))}
            </div>
            {output && <small>{sizeOf(output)}</small>}
          </header>
          <div className="pj-output" tabIndex={0} aria-label={t("Formatted JSON")}>
            {!parsed ? (
              <p className="pj-empty">{t("The formatted JSON shows up here.")}</p>
            ) : !parsed.ok ? (
              <div className="pj-error" role="alert">
                <b>✗ {t("Invalid JSON")}</b>
                {parsed.line && <span>{t("Line {line}, column {col}", { line: parsed.line, col: parsed.col ?? 1 })}</span>}
                <code>{t(parsed.message)}</code>
                {parsed.line && (
                  <button className="mini-tool" type="button" onClick={jumpToError}>
                    {t("Show me where")}
                  </button>
                )}
              </div>
            ) : view === "text" ? (
              <pre className={minify ? "wrap" : undefined}>{output.length > MAX_HIGHLIGHT ? output : highlight(output)}</pre>
            ) : (
              <div className="pj-tree">
                <Node value={parsed.value} depth={0} />
              </div>
            )}
          </div>
        </section>
      </div>

      <p className={`pj-status${parsed && !parsed.ok ? " bad" : parsed?.ok ? " ok" : ""}`} aria-live="polite">
        {note ||
          (stats
            ? `✓ ${t("Valid JSON")} · ${t(stats.kind)} · ${t("{n} items", { n: stats.count })} · ${t("{n} levels deep", { n: stats.depth })}`
            : parsed
              ? t("Fix the error to see the formatted JSON.")
              : t("🔒 Formatted in your browser. Nothing is uploaded."))}
      </p>
    </div>
  );
}

function describe(v: Json) {
  let count = 0;
  const depth = (x: Json): number => {
    if (x && typeof x === "object") {
      const kids = Array.isArray(x) ? x : Object.values(x);
      count += kids.length;
      return 1 + Math.max(0, ...kids.map(depth));
    }
    return 0;
  };
  const d = depth(v);
  return { kind: Array.isArray(v) ? "Array" : v && typeof v === "object" ? "Object" : "Value", count, depth: d };
}

// Collapsible tree for the Viewer tab. The first two levels start open.
function Node({ name, value, depth }: { name?: string; value: Json; depth: number }) {
  const { t } = useLang();
  const label = name !== undefined && <span className="j-key">{name}</span>;
  if (value && typeof value === "object") {
    const entries: [string, Json][] = Array.isArray(value) ? value.map((v, i) => [String(i), v]) : Object.entries(value);
    const open = Array.isArray(value) ? "[" : "{";
    return (
      <details open={depth < 2}>
        <summary>
          {label}
          {label && ": "}
          <span className="j-punct">{open}</span>
          <small>{t(entries.length === 1 ? "{n} item" : "{n} items", { n: entries.length })}</small>
        </summary>
        <div className="pj-kids">
          {entries.map(([k, v]) => (
            <Node key={k} name={k} value={v} depth={depth + 1} />
          ))}
        </div>
      </details>
    );
  }
  const cls = typeof value === "string" ? "j-str" : typeof value === "number" ? "j-num" : value === null ? "j-null" : "j-bool";
  return (
    <div className="pj-leaf">
      {label}
      {label && ": "}
      <span className={cls}>{JSON.stringify(value)}</span>
    </div>
  );
}
