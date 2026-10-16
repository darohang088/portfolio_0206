"use client";

import { useLang } from "@/lib/i18n";
import { useRef, useState } from "react";
import type { ApkReport, Finding, Severity } from "@/lib/apk/analyze";

const STEPS = ["Unzipping APK", "Reading the manifest", "Checking the signature", "Scanning code for secrets", "Building the report"];
const LABEL: Record<Severity, string> = { high: "High", medium: "Medium", low: "Low", info: "Info", pass: "Pass" };
const MAX_MB = 300;

const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// APK page: drop an APK, it's checked in the browser, and a security report appears.
export default function ApkAnalyzer() {
  const { t, tr } = useLang();
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
    if (!/\.apk$/i.test(file.name)) return setError(t("Please choose an .apk file."));
    if (file.size > MAX_MB * 1024 * 1024) return setError(t("That file is over {max} MB. Try a smaller APK.", { max: MAX_MB }));
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
      setError(t(e instanceof Error ? e.message : "Couldn't read this APK."));
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
                {done.includes(s) ? "✓" : s === busy ? "▶" : "·"} {t(s)}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <b>{t(drag ? "Drop it!" : "Drag & drop your APK here")}</b>
            <span>
              {tr("or {choose} · up to {max} MB", { choose: <u>{t("choose a file")}</u>, max: MAX_MB })}
            </span>
          </>
        )}
        <span className="apk-private">{t("🔒 Checked in your browser. The APK is never uploaded.")}</span>
      </label>
      <p className="tester-err" role="alert">
        {error}
      </p>

      {report && <Report r={report} onAgain={() => input.current?.click()} />}
    </div>
  );
}

function Report({ r, onAgain }: { r: ApkReport; onAgain: () => void }) {
  const { t } = useLang();
  const counts = (["high", "medium", "low", "pass"] as Severity[]).map((s) => [s, r.findings.filter((f) => f.severity === s).length] as const);
  return (
    <section className="apk-report" aria-label={t("Security report")}>
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
              <dt>{t("Min SDK")}</dt>
              <dd>{r.minSdk ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("Target SDK")}</dt>
              <dd>{r.targetSdk ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("Permissions")}</dt>
              <dd>{r.permissions.length}</dd>
            </div>
            <div>
              <dt>{t("Screens")}</dt>
              <dd>{r.counts.activities}</dd>
            </div>
            <div>
              <dt>{t("DEX files")}</dt>
              <dd>{r.counts.dexFiles}</dd>
            </div>
            <div>
              <dt>{t("CPU")}</dt>
              <dd>{r.abis.join(", ") || t("any")}</dd>
            </div>
          </dl>
          <div className="apk-counts">
            {counts.map(([s, n]) => (
              <span key={s} className={`sev sev-${s}`}>
                {n} {t(LABEL[s])}
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
          {t("This is a quick static check based on common OWASP mobile checks. It reads the manifest, signature and code strings, but doesn't run the app, so it can miss")}
          {t("issues and some results need a human to confirm.")}
        </p>
        <button className="btn btn-gold" type="button" onClick={onAgain}>
          {t("Check another APK")}
        </button>
      </div>
    </section>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const { t } = useLang();
  return (
    <li className={`apk-finding sev-${f.severity}`}>
      <details open={f.severity === "high"}>
        <summary>
          <span className={`sev sev-${f.severity}`}>{t(LABEL[f.severity])}</span>
          <b>{t(f.title)}</b>
        </summary>
        <p>{t(f.detail)}</p>
        {f.fix && (
          <p className="apk-fix">
            <span>{t("Fix:")}</span> {t(f.fix)}
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
