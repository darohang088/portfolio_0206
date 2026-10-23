"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMapping, parseMappingFile, resultText, retrace, type Frame, type Mapping } from "@/lib/retrace";
import { SAMPLE_MAPPING, SAMPLE_TRACE } from "@/data/retraceSample";

type Loaded = { mapping: Mapping; name: string; size: number };
const MB = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// Crash stack trace deobfuscator: mapping.txt + obfuscated trace → readable trace. All in the browser.
export default function RetraceTool() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [trace, setTrace] = useState("");
  const [hideLib, setHideLib] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const mapping = await parseMappingFile(file, (done, total) => setProgress(total ? done / total : 1));
      if (!mapping.classCount) throw new Error("empty");
      setLoaded({ mapping, name: file.name, size: file.size });
    } catch {
      setError("This doesn't look like a mapping.txt. Use the file from app/build/outputs/mapping/release/.");
    } finally {
      setProgress(null);
    }
  };

  const sample = () => {
    setLoaded({ mapping: parseMapping(SAMPLE_MAPPING), name: "sample mapping.txt", size: SAMPLE_MAPPING.length });
    setTrace(SAMPLE_TRACE);
    setError("");
  };

  const result = useMemo(() => (loaded && trace.trim() ? retrace(loaded.mapping, trace) : null), [loaded, trace]);
  const text = useMemo(() => (result ? resultText(result) : ""), [result]);

  const [dl, setDl] = useState("");
  useEffect(() => {
    if (!text) return setDl("");
    const u = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    setDl(u);
    return () => URL.revokeObjectURL(u);
  }, [text]);

  const copy = () =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });

  const m = loaded?.mapping;

  return (
    <div className="rt">
      <div className="rt-inputs">
        <section className="rt-card">
          <header className="rt-step">
            <b>1</b> mapping.txt
          </header>
          {loaded && m ? (
            <div className="rt-loaded">
              <span className="rt-file" aria-hidden="true">
                🗺️
              </span>
              <div>
                <b>{loaded.name}</b>
                <span>
                  {m.classCount.toLocaleString()} classes · {m.methodCount.toLocaleString()} methods · {MB(loaded.size)}
                </span>
                {(m.compiler || m.mapId) && (
                  <span>
                    {m.compiler && <>Made by {m.compiler}</>}
                    {m.compiler && m.mapId && " · "}
                    {m.mapId && <>map id {m.mapId}</>}
                  </span>
                )}
              </div>
              <button className="mini-tool" type="button" onClick={() => setLoaded(null)}>
                Change
              </button>
            </div>
          ) : (
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
                load(e.dataTransfer.files[0]);
              }}
            >
              <input
                type="file"
                accept=".txt,.map,text/plain"
                onChange={(e) => {
                  load(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <b>{progress !== null ? `Reading… ${Math.round(progress * 100)}%` : "Drop your mapping.txt"}</b>
              <span>From the same release build as the crash · big files are fine · stays on your device</span>
            </label>
          )}
          {error && <p className="rt-warn">{error}</p>}
          {!m && (
            <button className="mini-tool rt-sample" type="button" onClick={sample}>
              ★ Try with a sample crash
            </button>
          )}
        </section>

        <section className="rt-card">
          <header className="rt-step">
            <b>2</b> Crash stack trace
          </header>
          <textarea
            className="fp-paste rt-trace"
            rows={9}
            value={trace}
            onChange={(e) => setTrace(e.target.value)}
            spellCheck={false}
            placeholder={"java.lang.NullPointerException: ...\n    at a.b.c.a(SourceFile:12)\n    at a.b.d.b(SourceFile:40)\n\nPaste it from Crashlytics, Play Console or logcat."}
          />
        </section>
      </div>

      {!m && trace.trim() && <p className="rt-note">Add the mapping.txt to see the readable version.</p>}

      {result && (
        <section className="rt-card rt-result">
          <header className="rt-result-head">
            <b>Readable stack trace</b>
            <span className="rt-stats">
              {result.mapped} of {result.frames} lines deobfuscated
              {result.ambiguous > 0 && <> · {result.ambiguous} with several possible methods</>}
            </span>
            <span className="eh-head-actions">
              <label className="rt-toggle">
                <input type="checkbox" checked={hideLib} onChange={(e) => setHideLib(e.target.checked)} /> Hide library lines
              </label>
              <button className="mini-tool" type="button" onClick={copy}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
              {dl && (
                <a className="mini-tool" href={dl} download="retraced-stacktrace.txt">
                  ⬇ Download
                </a>
              )}
            </span>
          </header>

          {result.frames === 0 ? (
            <p className="rt-warn">No stack trace lines found. Lines should look like &quot;at a.b.c(SourceFile:12)&quot;.</p>
          ) : result.mapped === 0 ? (
            <p className="rt-warn">None of these classes are in this mapping.txt. Make sure it&apos;s from the exact same build (same version code) as the crash.</p>
          ) : null}

          <pre className="rt-out">
            {result.lines.map((l, i) => {
              if (l.kind === "text")
                return (
                  <div key={i} className={`rt-line${l.changed ? " rt-changed" : ""}${/^\s*(Caused by|[\w$.]+(Exception|Error)\b)/.test(l.text) ? " rt-head" : ""}`}>
                    {l.text || " "}
                  </div>
                );
              if (!l.mapped) return hideLib ? null : <div key={i} className="rt-line rt-lib">{l.original}</div>;
              return (
                <div key={i} className="rt-group" title={l.original.trim()}>
                  {l.frames.map((f, j) => (
                    <FrameLine key={j} indent={l.indent} at={l.at} f={f} />
                  ))}
                  {l.alternatives.map((alt, a) =>
                    alt.map((f, j) => <FrameLine key={`${a}-${j}`} indent={l.indent} at={l.at} f={f} or={j === 0} />),
                  )}
                </div>
              );
            })}
          </pre>
          <p className="rt-legend">
            <i className="rt-k-app">gold bar</i> your app&apos;s code, deobfuscated
            <i className="rt-k-inl">inlined</i> R8 merged this method into the one below it
            <i className="rt-k-or">or</i> the mapping fits more than one method
          </p>
        </section>
      )}

      <details className="r8-tips rt-help">
        <summary>Where do I find mapping.txt?</summary>
        <ul>
          <li>
            After a release build it&apos;s in <code>app/build/outputs/mapping/release/mapping.txt</code>. It changes with every build, so keep a copy for each version you ship.
          </li>
          <li>Lost it? Google Play keeps the one you uploaded: Play Console → your app → App bundle explorer → pick the version → Downloads → ReTrace mapping file.</li>
          <li>Crashlytics deobfuscates for you if the Crashlytics Gradle plugin uploads the mapping file. Use this tool for crashes from Play Console, testers and logcat.</li>
          <li>
            Flutter: this tool reads Java and Kotlin frames. Dart code built with <code>--obfuscate</code> needs <code>flutter symbolize</code> with your <code>--split-debug-info</code> files.
          </li>
        </ul>
      </details>
    </div>
  );
}

function FrameLine({ indent, at, f, or }: { indent: string; at: boolean; f: Frame; or?: boolean }) {
  return (
    <div className={`rt-line rt-app${or ? " rt-or" : ""}`}>
      {indent}
      {or ? <em className="rt-k-or">or</em> : at ? "at " : ""}
      {or ? " " : ""}
      <span className="rt-cls">{f.cls}.</span>
      <b className="rt-m">{f.method}</b>({f.file}
      {f.line !== null && <span className="rt-ln">:{f.line}</span>})
      {f.inlined && <em className="rt-k-inl">inlined</em>}
    </div>
  );
}
