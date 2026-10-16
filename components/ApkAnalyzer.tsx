"use client";

import { useRef, useState } from "react";
import type { ApkReport, Finding, Severity } from "@/lib/apk/analyze";

const STEPS = ["Unzipping APK", "Reading the manifest", "Checking the signature", "Scanning code for secrets", "Building the report"];
const LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low", info: "Info", pass: "Pass" };
const MAX_MB = 300;

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// APK page: drop an APK, it's checked in the browser, and a security report appears.
export default function ApkAnalyzer() {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ApkReport | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const run = async (file: File | undefined) => {
    if (!file || busy) return;
    setError("");
    setReport(null);
    if (!/\.apk$/i.test(file.name)) return setError("Please choose an .apk file.");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`That file is over ${MAX_MB} MB. Try a smaller APK.`);
    setDone([]);
    try {
      // Load the analyzer only when needed, so the page itself stays light.
      const { analyzeApk } = await import("@/lib/apk/analyze");
      const r = await analyzeApk(file, async (label) => {
        setBusy((prev) => {
          if (prev) setDone((d) => [...d, prev]);
          return label;
        });
        await new Promise((res) => setTimeout(res, 120)); // let the progress paint
      });
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read this APK.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="apk">
      <label
        className={`apk-drop${drag ? " drag" : ""}${busy ? " busy" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          run(e.dataTransfer.files[0]);
        }}
      >
        <input ref={input} type="file" accept=".apk,application/vnd.android.package-archive" onChange={(e) => run(e.target.files?.[0])} disabled={!!busy} />
        <span className="apk-drop-icon" aria-hidden="true">
          {busy ? "⌛" : "📦"}
        </span>
        {busy ? (
          <ul className="apk-steps" aria-live="polite">
            {STEPS.map((s) => (
              <li key={s} className={done.includes(s) ? "ok" : s === busy ? "now" : ""}>
                {done.includes(s) ? "✓" : s === busy ? "▶" : "·"} {s}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <b>{drag ? "Drop it!" : "Drag & drop your APK here"}</b>
            <span>
              or <u>choose a file</u> · up to {MAX_MB} MB
            </span>
          </>
        )}
        <span className="apk-private">🔒 Checked in your browser. The APK is never uploaded.</span>
      </label>
      <p className="tester-err" role="alert">
        {error}
      </p>

      {report && <Report r={report} onAgain={() => input.current?.click()} />}
    </div>
  );
}

function Report({ r, onAgain }: { r: ApkReport; onAgain: () => void }) {
  const counts = (["high", "medium", "low", "pass"] as Severity[]).map((s) => [s, r.findings.filter((f) => f.severity === s).length] as const);
  return (
    <section className="apk-report" aria-label="Security report">
      <div className="apk-summary">
        <div className={`apk-grade g-${r.grade}`} style={{ "--score": r.score } as React.CSSProperties}>
          <b>{r.grade}</b>
          <span>{r.score}/100</span>
        </div>
        <div className="apk-info">
          <h3>{r.packageName}</h3>
          <p>
            v{r.versionName} ({r.versionCode}) · {r.framework} · {mb(r.fileSize)}
          </p>
          <dl>
            <div>
              <dt>Min SDK</dt>
              <dd>{r.minSdk ?? "—"}</dd>
            </div>
            <div>
              <dt>Target SDK</dt>
              <dd>{r.targetSdk ?? "—"}</dd>
            </div>
            <div>
              <dt>Permissions</dt>
              <dd>{r.permissions.length}</dd>
            </div>
            <div>
              <dt>Screens</dt>
              <dd>{r.counts.activities}</dd>
            </div>
            <div>
              <dt>DEX files</dt>
              <dd>{r.counts.dexFiles}</dd>
            </div>
            <div>
              <dt>CPU</dt>
              <dd>{r.abis.join(", ") || "any"}</dd>
            </div>
          </dl>
          <div className="apk-counts">
            {counts.map(([s, n]) => (
              <span key={s} className={`sev sev-${s}`}>
                {n} {LABEL[s]}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ul className="apk-findings">
        {r.findings.map((f) => (
          <FindingRow key={f.id} f={f} />
        ))}
      </ul>

      <div className="apk-foot">
        <p>
          This is a quick static check based on common OWASP mobile checks. It reads the manifest, signature and code strings, but doesn&apos;t run the app, so it can miss
          issues and some results need a human to confirm.
        </p>
        <button className="btn btn-gold" type="button" onClick={onAgain}>
          Check another APK
        </button>
      </div>
    </section>
  );
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <li className={`apk-finding sev-${f.severity}`}>
      <details open={f.severity === "high"}>
        <summary>
          <span className={`sev sev-${f.severity}`}>{LABEL[f.severity]}</span>
          <b>{f.title}</b>
        </summary>
        <p>{f.detail}</p>
        {f.fix && (
          <p className="apk-fix">
            <span>Fix:</span> {f.fix}
          </p>
        )}
        {f.items && (
          <ul className="apk-items">
            {f.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </details>
    </li>
  );
}
