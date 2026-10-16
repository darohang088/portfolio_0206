"use client";

import { useState } from "react";
import type { Finding, PrivacyReport } from "@/lib/apk/privacy";
import type { Level } from "@/data/playPolicy";

type Mode = "file" | "paste";
const LEVEL: Record<Level, { label: string; sev: string }> = {
  restricted: { label: "Restricted", sev: "sev-high" },
  high: { label: "High risk", sev: "sev-medium" },
  medium: { label: "Medium", sev: "sev-low" },
  low: { label: "Low", sev: "sev-pass" },
};
const DISCLOSURE = {
  required: "Prominent disclosure required",
  "if-not-obvious": "Disclose if the use isn't obvious",
  no: "No disclosure needed",
};

const docs = (f: Finding) => (/^[A-Z_]+$/.test(f.key) ? `https://developer.android.com/reference/android/Manifest.permission#${f.key}` : null);
const policy = (f: Finding) => `https://support.google.com/googleplay/android-developer/search?q=${encodeURIComponent(f.rule.title + " permission policy")}`;

function checklist(r: PrivacyReport) {
  const lines = [`# Play permissions checklist: ${r.packageName}`, ""];
  for (const f of r.findings.filter((x) => x.level !== "low")) {
    lines.push(`- [ ] **${f.rule.title}** (${f.key}) · ${LEVEL[f.level].label}`);
    lines.push(`  - Play Console: ${f.rule.play}`);
    if (f.rule.disclosure === "required") lines.push("  - Add a prominent disclosure screen before the permission request");
    if (f.rule.alternative) lines.push(`  - Or avoid it: ${f.rule.alternative}`);
  }
  return lines.join("\n");
}

// Permissions & privacy explainer: what Google Play will ask about each sensitive permission.
export default function PrivacyExplainer() {
  const [mode, setMode] = useState<Mode>("file");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [report, setReport] = useState<(PrivacyReport & { name: string }) | null>(null);
  const [copied, setCopied] = useState(false);

  const run = async (bytes: Uint8Array, name: string) => {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const { loadManifestRoot } = await import("@/lib/apk/manifest");
      const { checkPrivacy } = await import("@/lib/apk/privacy");
      const { root } = loadManifestRoot(bytes, name);
      setReport({ ...checkPrivacy(root), name });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read this file.");
    } finally {
      setBusy(false);
    }
  };

  const fromFile = async (f?: File) => f && run(new Uint8Array(await f.arrayBuffer()), f.name);

  return (
    <div className="qr-tool">
      <div className="qr-tabs two" role="tablist" aria-label="Input">
        {(["file", "paste"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? "on" : undefined}
            onClick={() => {
              if (m !== mode) {
                setReport(null);
                setError("");
              }
              setMode(m);
            }}
          >
            {m === "file" ? "Drop a file" : "Paste manifest"}
          </button>
        ))}
      </div>

      {mode === "file" ? (
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
            fromFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            type="file"
            accept=".apk,.xml"
            onChange={(e) => {
              fromFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <b>{busy ? "Checking…" : "Drop AndroidManifest.xml or an APK"}</b>
          <span>Tip: use the merged manifest (build/intermediates/merged_manifests) or the APK, so permissions added by libraries are included.</span>
        </label>
      ) : (
        <form
          className="qr-paste"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) run(new TextEncoder().encode(text), "Pasted manifest");
          }}
        >
          <textarea className="fp-paste" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={'<manifest xmlns:android="http://schemas.android.com/apk/res/android" …>\n  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>\n  …\n</manifest>'} />
          <button className="btn btn-gold" type="submit" disabled={busy}>
            Check ▶
          </button>
        </form>
      )}

      <p className="tester-err" role="alert">
        {error}
      </p>

      {report && (
        <section className="pp-report">
          <div className="pp-head">
            <div>
              <h3>{report.packageName}</h3>
              <p>
                {report.name} · target SDK {report.targetSdk ?? "not set (it's in Gradle)"} · {report.findings.length + report.others.length} permissions and features checked
              </p>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() =>
                navigator.clipboard.writeText(checklist(report)).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
              }
            >
              {copied ? "✓ Copied" : "Copy checklist"}
            </button>
          </div>

          <div className="pp-stats">
            <Stat n={report.declarations} label="Play Console declarations" tone="high" />
            <Stat n={report.disclosures} label="Prominent disclosures" tone="medium" />
            <Stat n={report.findings.filter((f) => f.level === "restricted").length} label="Restricted permissions" tone="high" />
            <Stat n={report.findings.filter((f) => f.level === "high").length} label="High-risk permissions" tone="medium" />
          </div>

          {report.findings.length === 0 && <p className="diff-ok">✓ No sensitive permissions found. Google Play shouldn&apos;t ask for any permission declarations.</p>}

          <div className="pp-list">
            {report.findings.map((f) => (
              <Card key={f.key} f={f} />
            ))}
          </div>

          {report.others.length > 0 && (
            <div className="pp-others">
              <b>Other permissions</b> <small>(normal or custom, no Play action needed)</small>
              <div className="test-tags">
                {report.others.map((p) => (
                  <i key={p}>{p}</i>
                ))}
              </div>
            </div>
          )}
          <p className="pp-note">
            Based on Google Play&apos;s policies as of 2025. Play updates these rules often, so check each linked policy before you submit. Unused permissions added by libraries can be removed with{" "}
            <code>tools:node=&quot;remove&quot;</code>.
          </p>
        </section>
      )}
      <p className="apk-private fp-private">🔒 Checked in your browser. Nothing is uploaded.</p>
    </div>
  );
}

function Stat({ n, label, tone }: { n: number; label: string; tone: "high" | "medium" }) {
  return (
    <div className={`pp-stat${n ? ` t-${tone}` : ""}`}>
      <b>{n}</b>
      <span>{label}</span>
    </div>
  );
}

function Card({ f }: { f: Finding }) {
  const r = f.rule;
  const link = docs(f);
  return (
    <details className={`pp-card l-${f.level}`} open={f.level === "restricted" || f.level === "high"}>
      <summary>
        <span className={`sev ${LEVEL[f.level].sev}`}>{LEVEL[f.level].label}</span>
        <b>{r.title}</b>
        <code>{f.key === "fgs" || f.key === "health" ? f.name : f.key}</code>
      </summary>
      <div className="pp-body">
        <p>{r.what}</p>
        {f.good && <p className="pp-good">{f.good}</p>}
        {f.extra && (
          <ul className="apk-items">
            {f.extra.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
        <div className="pp-block">
          <span>Play Console</span>
          <p>{r.play}</p>
        </div>
        <div className={`pp-disclosure d-${r.disclosure}`}>{DISCLOSURE[r.disclosure]}</div>
        {r.disclosure === "required" && (
          <div className="pp-block">
            <span>Example disclosure (show before the permission prompt)</span>
            <p className="pp-sample">
              &quot;[App name] uses {r.title.toLowerCase()} to [feature the user gets]{f.key.includes("BACKGROUND") ? ", even when the app is closed or not in use" : ""}. [What you collect] is [how it's used / not shared].&quot;
            </p>
          </div>
        )}
        {r.rejections.length > 0 && (
          <div className="pp-block">
            <span>Why apps get rejected</span>
            <ul>
              {r.rejections.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
        {r.alternative && (
          <div className="pp-block">
            <span>Safer option</span>
            <p>{r.alternative}</p>
          </div>
        )}
        {r.note && <p className="pp-good">{r.note}</p>}
        <p className="pp-links">
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer">
              Android docs ↗
            </a>
          )}
          <a href={policy(f)} target="_blank" rel="noopener noreferrer">
            Play policy ↗
          </a>
        </p>
      </div>
    </details>
  );
}
