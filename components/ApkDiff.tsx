"use client";

import { useState } from "react";
import type { Change, Component, ManifestDiff, ManifestSummary } from "@/lib/apk/manifest";

const DANGEROUS = /(SMS|CALL_LOG|CONTACTS|LOCATION|CAMERA|RECORD_AUDIO|READ_PHONE|BODY_SENSORS|CALENDAR|STORAGE|MEDIA_|ACCOUNTS|INSTALL_PACKAGES|SYSTEM_ALERT_WINDOW|QUERY_ALL_PACKAGES|ACCESSIBILITY|NEARBY|BLUETOOTH_SCAN|POST_NOTIFICATIONS)/;
const SIGN = { added: "+", removed: "−", changed: "~", same: "=" } as const;

// Manifest diff: drop the old and new APK (or AndroidManifest.xml) and see what changed.
export default function ApkDiff() {
  const [a, setA] = useState<ManifestSummary | null>(null);
  const [b, setB] = useState<ManifestSummary | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<"a" | "b" | null>(null);
  const [showSame, setShowSame] = useState(false);
  const [diff, setDiff] = useState<ManifestDiff | null>(null);

  const load = async (slot: "a" | "b", f: File | undefined) => {
    if (!f) return;
    setErr("");
    setBusy(slot);
    try {
      const { readManifest, diffManifests } = await import("@/lib/apk/manifest");
      const s = await readManifest(f);
      const na = slot === "a" ? s : a;
      const nb = slot === "b" ? s : b;
      slot === "a" ? setA(s) : setB(s);
      setDiff(na && nb ? diffManifests(na, nb) : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setBusy(null);
    }
  };

  const swap = async () => {
    const { diffManifests } = await import("@/lib/apk/manifest");
    setA(b);
    setB(a);
    if (a && b) setDiff(diffManifests(b, a));
  };

  return (
    <div className="qr-tool">
      <div className="diff-slots">
        <Slot label="Old version" tag="A" s={a} busy={busy === "a"} onFile={(f) => load("a", f)} />
        <button className="mini-tool diff-swap" type="button" onClick={swap} disabled={!a && !b} aria-label="Swap old and new">
          ⇄
        </button>
        <Slot label="New version" tag="B" s={b} busy={busy === "b"} onFile={(f) => load("b", f)} />
      </div>
      <p className="tester-err" role="alert">
        {err}
      </p>
      {diff && a && b && <Report d={diff} a={a} b={b} showSame={showSame} setShowSame={setShowSame} />}
      <p className="apk-private fp-private">🔒 Compared in your browser. Nothing is uploaded.</p>
    </div>
  );
}

function Slot({ label, tag, s, busy, onFile }: { label: string; tag: string; s: ManifestSummary | null; busy: boolean; onFile: (f: File | undefined) => void }) {
  const [drag, setDrag] = useState(false);
  return (
    <label
      className={`qr-drop diff-slot${drag ? " drag" : ""}${s ? " filled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFile(e.dataTransfer.files[0]);
      }}
    >
      <input
        type="file"
        accept=".apk,.xml"
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <span className="diff-tag">{tag}</span>
      <b>{busy ? "Reading…" : s ? s.fileName : label}</b>
      <span>{s ? `${s.packageName} · v${s.versionName} (${s.versionCode}) · ${s.source}` : "Drop an .apk or AndroidManifest.xml"}</span>
    </label>
  );
}

function Report({ d, a, b, showSame, setShowSame }: { d: ManifestDiff; a: ManifestSummary; b: ManifestSummary; showSame: boolean; setShowSame: (v: boolean) => void }) {
  const count = (list: Change<unknown>[], st: Change["status"]) => list.filter((c) => c.status === st).length;
  const newlyExported = d.components.filter((c) => (c.status === "added" && c.item.exported && !c.item.permission) || (c.status === "changed" && c.after === "exported"));
  const addedDanger = d.permissions.filter((p) => p.status === "added" && DANGEROUS.test(p.item));
  const filter = <T,>(list: Change<T>[]) => (showSame ? list : list.filter((c) => c.status !== "same"));

  return (
    <section className="diff-report">
      <div className="khqr-badges">
        <span className="sev sev-pass">+{count(d.permissions, "added")} permissions</span>
        <span className="sev sev-high">−{count(d.permissions, "removed")} permissions</span>
        <span className="sev sev-info">
          {count(d.components, "added")} new · {count(d.components, "removed")} removed components
        </span>
        {newlyExported.length > 0 && <span className="sev sev-medium">{newlyExported.length} newly exported</span>}
        {addedDanger.length > 0 && <span className="sev sev-medium">{addedDanger.length} new sensitive permission{addedDanger.length > 1 ? "s" : ""}</span>}
      </div>

      {d.signerChanged === true && (
        <p className="diff-alert">
          ⚠ <b>Different signing key.</b> Android won&apos;t install B as an update over A. Old: {a.signer?.sha256.slice(0, 23)}… New: {b.signer?.sha256.slice(0, 23)}…
        </p>
      )}
      {d.signerChanged === false && <p className="diff-ok">✓ Same signing key ({b.signer?.subject})</p>}

      <label className="diff-same">
        <input type="checkbox" checked={showSame} onChange={(e) => setShowSame(e.target.checked)} /> Show unchanged items
      </label>

      <DiffTable title="App" rows={filter(d.info).concat(filter(d.flags))} />
      <DiffTable title="Permissions" rows={filter(d.permissions)} danger />
      <DiffTable
        title="Components"
        rows={filter(d.components).map((c) => ({
          ...c,
          item: `${c.item.kind} · ${c.item.name}${c.status === "added" || c.status === "removed" || c.status === "same" ? (c.item.exported ? (c.item.permission ? " (exported, protected)" : " (exported)") : "") : ""}`,
        }))}
      />
      {(d.features.some((f) => f.status !== "same") || showSame) && <DiffTable title="Hardware features" rows={filter(d.features)} />}
    </section>
  );
}

function DiffTable({ title, rows, danger }: { title: string; rows: Change<string | Component>[]; danger?: boolean }) {
  return (
    <div className="diff-table">
      <h3>
        {title} <small>{rows.length ? `${rows.length} shown` : "no changes"}</small>
      </h3>
      {rows.length > 0 && (
        <ul>
          {rows.map((r, i) => {
            const label = typeof r.item === "string" ? r.item : r.item.name;
            return (
              <li key={`${label}-${i}`} className={`d-${r.status}`}>
                <span className="d-sign" aria-label={r.status}>
                  {SIGN[r.status]}
                </span>
                <span className="d-item">
                  {label.replace("android.permission.", "")}
                  {danger && r.status === "added" && DANGEROUS.test(label) && <em> sensitive</em>}
                </span>
                {r.status === "changed" && (
                  <span className="d-change">
                    {r.before} → <b>{r.after}</b>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
