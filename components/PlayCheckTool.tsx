"use client";

import { useEffect, useMemo, useState } from "react";
import { checkPlayReadiness, GROUPS, type Check, type PlayReport, type Status } from "@/lib/playcheck";
import { SAMPLE_PLAY_APK_BASE64, SAMPLE_PLAY_APK_NAME } from "@/data/playCheckSample";

const LABEL: Record<Status, string> = { fail: "Must fix", warn: "Check", declare: "Declare", pass: "Passed", na: "N/A" };
const ICON: Record<Status, string> = { fail: "✗", warn: "!", declare: "✎", pass: "✓", na: "–" };
const CONF = { certain: "Certain", likely: "Likely", check: "Test on a device" } as const;
type Filter = "all" | Status;

// Play Store Readiness Check: one APK in, every Google Play requirement checked.
export default function PlayCheckTool() {
  const [report, setReport] = useState<PlayReport | null>(null);
  const [step, setStep] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const run = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setReport(null);
    setBusy(true);
    try {
      const r = await checkPlayReadiness(file, async (label) => {
        setStep(label);
        await new Promise((res) => setTimeout(res, 0));
      });
      setReport(r);
      setFilter(r.counts.fail ? "fail" : "all");
    } catch (e) {
      const m = (e as Error).message;
      setError(
        m === "aab"
          ? "This is an App Bundle (.aab). Drop the APK instead: run ./gradlew assembleRelease, or turn the AAB into a universal APK with bundletool (build-apks --mode=universal)."
          : m === "not-apk"
            ? "This isn't an Android APK."
            : "Couldn't read this APK's manifest. The file may be damaged.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sample = () => run(new File([Uint8Array.from(atob(SAMPLE_PLAY_APK_BASE64), (c) => c.charCodeAt(0))], SAMPLE_PLAY_APK_NAME));

  const r = report;
  const shown = useMemo(() => (r ? r.checks.filter((c) => filter === "all" || c.status === filter) : []), [r, filter]);
  const text = useMemo(() => (r ? reportText(r) : ""), [r]);
  const [dl, setDl] = useState("");
  useEffect(() => {
    if (!text) return setDl("");
    const u = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
    setDl(u);
    return () => URL.revokeObjectURL(u);
  }, [text]);

  return (
    <div className="pc">
      {!r && (
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
              run(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              onChange={(e) => {
                run(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <b>{busy ? `${step || "Checking"}…` : "Drop your release APK"}</b>
            <span>Native Android app (Kotlin / Java) · build it with ./gradlew assembleRelease · nothing is uploaded</span>
          </label>
          {!busy && (
            <button className="mini-tool pc-sample" type="button" onClick={sample}>
              ★ Try with a sample APK
            </button>
          )}
        </>
      )}
      {error && <p className="rt-warn">{error}</p>}

      {r && (
        <>
          <section className={`pc-summary ${r.counts.fail ? "s-fail" : r.counts.warn ? "s-warn" : "s-pass"}`}>
            <div className="pc-head">
              <div>
                <h3>{r.counts.fail ? `Not ready: ${r.counts.fail} to fix` : r.counts.warn ? "Almost ready" : "Ready for Google Play"}</h3>
                <p>
                  <b>{r.packageName}</b> · version {r.versionName} ({r.versionCode}) · targetSdk {r.targetSdk ?? "?"} · minSdk {r.minSdk ?? "?"}
                </p>
              </div>
              <div className="pc-score" aria-label={`${r.passed} of ${r.total} checks passed`}>
                <b>
                  {r.passed}/{r.total}
                </b>
                <small>checks passed</small>
              </div>
            </div>
            <div className="pc-filters" role="tablist">
              {(["all", "fail", "warn", "declare", "pass"] as Filter[]).map((f) => {
                const n = f === "all" ? r.checks.length : r.counts[f as Status];
                if (f !== "all" && !n) return null;
                return (
                  <button key={f} type="button" role="tab" aria-selected={filter === f} className={`pc-f f-${f}${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
                    {f === "all" ? "All" : `${ICON[f as Status]} ${LABEL[f as Status]}`} <i>{n}</i>
                  </button>
                );
              })}
            </div>
            <div className="pc-actions">
              <a className="mini-tool" href={dl} download={`${r.packageName || "app"}-play-check.md`}>
                ⬇ Download report
              </a>
              <button className="mini-tool" type="button" onClick={() => setReport(null)}>
                Check another APK
              </button>
              <small>Rules as of {r.rulesAsOf}</small>
            </div>
          </section>

          {GROUPS.map((g) => {
            const list = shown.filter((c) => c.group === g.id);
            if (!list.length) return null;
            return (
              <section key={g.id} className="pc-group">
                <h3>{g.title}</h3>
                <p>{g.blurb}</p>
                {list.map((c) => (
                  <CheckCard key={c.id} c={c} />
                ))}
              </section>
            );
          })}

          <section className="pc-manual">
            <h3>Not in the APK: check these in Play Console</h3>
            <ul>
              <li>Privacy policy link, and the Data safety form answers</li>
              <li>Account deletion option (in the app and on the web) if users can create accounts</li>
              <li>Content rating, target audience and the ads declaration</li>
              <li>Financial features declaration (banking, loans, payments, wallets)</li>
              <li>Android vitals: user-perceived crash rate under 1.09% and ANR rate under 0.47%</li>
            </ul>
          </section>
        </>
      )}

      <details className="r8-tips rt-help">
        <summary>How this check works</summary>
        <ul>
          <li>It reads the APK in your browser: the compiled AndroidManifest.xml, resources.arsc, the code (DEX) and the signature. Nothing is uploaded.</li>
          <li>
            <b>Certain</b> results come straight from the manifest or signature. <b>Likely</b> ones come from names found in the code, which R8 can sometimes hide. <b>Test on a device</b> means the APK can&apos;t show how the screens look.
          </li>
          <li>Rules follow Google Play&apos;s requirements for native Android apps and are updated when Google changes them. Flutter and React Native specifics aren&apos;t covered.</li>
          <li>For an AAB, check the APK built from it (bundletool build-apks --mode=universal).</li>
        </ul>
      </details>
    </div>
  );
}

function CheckCard({ c }: { c: Check }) {
  const [open, setOpen] = useState(false);
  const many = (c.items?.length ?? 0) > 6;
  const items = c.items && (many && !open ? c.items.slice(0, 5) : c.items);
  return (
    <article className={`pc-card st-${c.status}`}>
      <span className="pc-ico" aria-label={LABEL[c.status]}>
        {ICON[c.status]}
      </span>
      <div className="pc-body">
        <header>
          <b>{c.title}</b>
          {c.status !== "pass" && <i className={`pc-conf c-${c.confidence}`}>{CONF[c.confidence]}</i>}
        </header>
        <p>{c.detail}</p>
        {items && items.length > 0 && (
          <ul className="pc-items">
            {items.map((x) => (
              <li key={x}>{x}</li>
            ))}
            {many && (
              <li>
                <button type="button" className="pc-more" onClick={() => setOpen((v) => !v)}>
                  {open ? "Show less" : `Show all ${c.items!.length}`}
                </button>
              </li>
            )}
          </ul>
        )}
        {c.fix && c.status !== "pass" && (
          <p className="pc-fix">
            <b>How to fix:</b> {c.fix}
          </p>
        )}
      </div>
    </article>
  );
}

function reportText(r: PlayReport): string {
  const lines = [
    `# Play Store Readiness Check: ${r.packageName}`,
    ``,
    `Version ${r.versionName} (${r.versionCode}) · targetSdk ${r.targetSdk ?? "?"} · minSdk ${r.minSdk ?? "?"} · file ${r.fileName}`,
    `Result: ${r.passed} of ${r.total} checks passed · ${r.counts.fail} must fix · ${r.counts.warn} to check · ${r.counts.declare} Play Console declarations`,
    `Rules as of ${r.rulesAsOf}. Made with Hang Daro's Play Store Readiness Check.`,
  ];
  for (const g of GROUPS) {
    const list = r.checks.filter((c) => c.group === g.id);
    if (!list.length) continue;
    lines.push("", `## ${g.title}`, "");
    for (const c of list) {
      lines.push(`- **[${LABEL[c.status]}] ${c.title}**${c.status !== "pass" ? ` _(${CONF[c.confidence]})_` : ""}`, `  ${c.detail}`);
      for (const x of c.items ?? []) lines.push(`  - ${x}`);
      if (c.fix && c.status !== "pass") lines.push(`  - Fix: ${c.fix}`);
    }
  }
  return lines.join("\n") + "\n";
}
