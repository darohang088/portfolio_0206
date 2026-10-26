"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import type { AppInfo } from "@/lib/apk/appInfo";
import { api, androidVersion, cpuName, EXPIRY_DAYS, MAX_APK, mb, SECRET_KEY, timeLeft, uploadApk, warningsFor, type Build } from "@/lib/buildShare";
import QrImage from "./QrImage";

type Step = { kind: "idle" } | { kind: "reading" } | { kind: "ready"; file: File; info: AppInfo } | { kind: "uploading"; file: File; info: AppInfo; sent: number } | { kind: "done"; url: string; info: AppInfo };

// Build Share (owner page): drop an APK, get a short download link + QR for testers.
export default function BuildShare() {
  const { t } = useLang();
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [builds, setBuilds] = useState<Build[]>([]);
  const [usage, setUsage] = useState<{ used: number; cap: number } | null>(null);
  const [step, setStep] = useState<Step>({ kind: "idle" });
  const [days, setDays] = useState<number>(3);
  const [note, setNote] = useState("");
  const [listed, setListed] = useState(true);
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async () => {
      try {
        const { status, data } = await api<{ builds: Build[]; used: number; cap: number }>("/api/builds");
        if (status === 401) return "wrong" as const;
        if (!data.ok) return data.error ?? t("Something went wrong.");
        setBuilds(data.builds);
        setUsage({ used: data.used, cap: data.cap });
        return "ok" as const;
      } catch {
        return t("Couldn't reach the server.");
      }
    },
    [t],
  );

  useEffect(() => {
    // Remove credentials saved by older versions; authentication now uses HttpOnly cookies.
    try { sessionStorage.removeItem(SECRET_KEY); localStorage.removeItem(SECRET_KEY); } catch {}
    refresh().then(r => { if (r === "ok") setAuthenticated(true); setChecked(true); });
  }, [refresh]);

  // Start fresh each time the page is opened, also when coming back with the browser's Back button.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      setStep({ kind: "idle" });
      setError("");
      setNote("");
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const lock = async () => {
    const { data } = await api("/api/session", { method: "DELETE" });
    if (!data.ok) { setError(data.error ?? "Couldn't sign out. Try again."); return; }
    setAuthenticated(false);
    setBuilds([]);
    setStep({ kind: "idle" });
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (!/\.apk$/i.test(f.name)) return setError(t(/\.aab$/i.test(f.name) ? "This is an Android App Bundle (.aab). Testers can't install it directly: build an APK instead." : "Please choose an .apk file."));
    if (f.size > MAX_APK) return setError(t("That APK is {size}. The limit is {max}.", { size: mb(f.size), max: mb(MAX_APK) }));
    setStep({ kind: "reading" });
    try {
      const { readAppInfo } = await import("@/lib/apk/appInfo");
      const info = await readAppInfo(new Uint8Array(await f.arrayBuffer()));
      setStep({ kind: "ready", file: f, info });
    } catch (e) {
      setStep({ kind: "idle" });
      setError(t(e instanceof Error ? e.message : "Couldn't read this APK."));
    }
  };

  const create = async () => {
    if (step.kind !== "ready" || !authenticated) return;
    const { file, info } = step;
    setError("");
    setStep({ kind: "uploading", file, info, sent: 0 });
    const { icon, ...rest } = info;
    try {
      const { status, data } = await api<{ id: string; partSize: number }>("/api/builds", { method: "POST", body: JSON.stringify({ info: rest, icon, size: file.size, fileName: file.name, days, note, listed }) });
      if (status === 401) return lock();
      if (!data.ok) throw new Error(data.error);
      const up = await uploadApk(data.id, file, data.partSize, (sent) => setStep({ kind: "uploading", file, info, sent }));
      if (!up.ok || !up.url) throw new Error(up.error);
      setStep({ kind: "done", url: up.url, info });
      setNote("");
      refresh();
    } catch (e) {
      setStep({ kind: "ready", file, info });
      setError(t(e instanceof Error && e.message ? e.message : "Upload failed. Try again."));
    }
  };

  // Show or hide a build on the public All APKs page (updates the row right away, then saves).
  const setVisible = async (b: Build, on: boolean) => {
    if (!authenticated) return;
    setBuilds((list) => list.map((x) => (x.id === b.id ? { ...x, listed: on } : x)));
    const { data } = await api("/api/builds/" + b.id, { method: "PATCH", body: JSON.stringify({ listed: on }) });
    if (!data.ok) {
      setError(data.error ?? t("Couldn't save. Try again."));
      refresh();
    }
  };

  const remove = async (b: Build) => {
    if (!authenticated || !confirm(t("Delete {name} {version}? The link will stop working.", { name: b.label, version: b.versionName }))) return;
    const { status, data } = await api("/api/builds/" + b.id, { method: "DELETE" });
    if (status === 401) return lock();
    if (!data.ok) { setError(data.error ?? "Couldn't delete this build."); return; }
    refresh();
  };

  if (!checked) return null;
  if (!authenticated) return <Unlock onUnlock={() => setAuthenticated(true)} check={refresh} />;

  return (
    <div className="bs">
      {step.kind === "done" ? (
        <LinkCard url={step.url} info={step.info} onAgain={() => setStep({ kind: "idle" })} />
      ) : step.kind === "ready" || step.kind === "uploading" ? (
        <section className="bs-card">
          <AppHead info={step.info} size={step.file.size} />
          <Warnings info={step.info} />
          <div className="bs-options">
            <fieldset className="bs-days">
              <legend>{t("Link expires after")}</legend>
              {EXPIRY_DAYS.map((d) => (
                <button key={d} type="button" className={days === d ? "on" : undefined} aria-pressed={days === d} onClick={() => setDays(d)} disabled={step.kind === "uploading"}>
                  {t(d === 1 ? "1 day" : "{n} days", { n: d })}
                </button>
              ))}
            </fieldset>
            <label className="field">
              <span>{t("Notes for testers (optional)")}</span>
              <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("What's new in this build, what to test…")} disabled={step.kind === "uploading"} />
            </label>
            <label className="bs-listed">
              <input type="checkbox" checked={listed} onChange={(e) => setListed(e.target.checked)} disabled={step.kind === "uploading"} />
              <span>
                <b>{t("Show on the All APKs page")}</b>
                <small>{t("Anyone with the All APKs link can see and download it. Untick for a private build: only people you send the link to can get it.")}</small>
              </span>
            </label>
          </div>
          {step.kind === "uploading" ? (
            <div className="bs-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((step.sent / step.file.size) * 100)}>
              <span style={{ width: `${(step.sent / step.file.size) * 100}%` }} />
              <b>{t("Uploading… {sent} of {total}", { sent: mb(step.sent), total: mb(step.file.size) })}</b>
            </div>
          ) : (
            <div className="bs-actions">
              <button className="btn btn-gold" type="button" onClick={create}>
                {t("Create link ▶")}
              </button>
              <button className="mini-tool" type="button" onClick={() => setStep({ kind: "idle" })}>
                {t("Choose another APK")}
              </button>
            </div>
          )}
        </section>
      ) : (
        <label
          className={`apk-drop${drag ? " drag" : ""}${step.kind === "reading" ? " busy" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={input}
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="apk-drop-icon" aria-hidden="true">
            {step.kind === "reading" ? "⌛" : "📲"}
          </span>
          <b>{t(step.kind === "reading" ? "Reading the APK…" : drag ? "Drop it!" : "Drag & drop the APK to share")}</b>
          <span>{t("or choose a file · up to {max}", { max: mb(MAX_APK) })}</span>
        </label>
      )}

      <p className="tester-err" role="alert">
        {error}
      </p>

      <section className="bs-list">
        <header>
          <h3>{t("Active links")}</h3>
          <a className="mini-tool bs-all" href="/apks" target="_blank" rel="noopener noreferrer">
            📂 {t("See all APKs")}
          </a>
          {usage && (
            <span className="bs-usage" title={t("Storage used")}>
              <i style={{ width: `${Math.min(100, (usage.used / usage.cap) * 100)}%` }} />
              {t("{used} of {cap} used", { used: mb(usage.used), cap: mb(usage.cap) })}
            </span>
          )}
          <button className="mini-tool" type="button" onClick={lock}>
            🔒 {t("Lock")}
          </button>
        </header>
        {builds.filter((b) => b.ready !== false).length === 0 ? (
          <p className="bs-empty">{t("No active links. Shared builds show up here until they expire.")}</p>
        ) : (
          <ul>
            {builds
              .filter((b) => b.ready !== false)
              .map((b) => (
                <BuildRow key={b.id} b={b} onDelete={() => remove(b)} onVisible={(on) => setVisible(b, on)} />
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Unlock({ onUnlock, check }: { onUnlock: () => void; check: () => Promise<string> }) {
  const { t } = useLang();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="bs-unlock"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!value || busy) return;
        setBusy(true);
        setError("");
        const { data } = await api("/api/session", { method: "POST", body: JSON.stringify({ password: value }) });
        setValue("");
        const r = data.ok ? await check() : data.error ?? "Sign in failed.";
        setBusy(false);
        if (r === "wrong") return setError(t("Wrong password. Try again."));
        if (r !== "ok") return setError(r);
        onUnlock();
      }}
    >
      <span className="pin-icon" aria-hidden="true">
        📲
      </span>
      <h3>{t("Owner only")}</h3>
      <p>{t("Enter your owner password to share builds. Your session expires after one hour.")}</p>
      <input type="password" autoComplete="current-password" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("Upload password")} aria-label={t("Upload password")} autoFocus />
      <button className="btn btn-gold" type="submit" disabled={busy}>
        {t(busy ? "Checking…" : "Unlock ▶")}
      </button>
      <p className="pin-msg" role="alert">
        {error}
      </p>
    </form>
  );
}

export function AppHead({ info, size }: { info: Pick<AppInfo, "icon" | "label" | "packageName" | "versionName" | "versionCode" | "minSdk" | "abis">; size: number }) {
  const { t } = useLang();
  const android = androidVersion(info.minSdk);
  return (
    <header className="bs-app">
      {info.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={info.icon} alt="" width={72} height={72} />
      ) : (
        <span className="bs-noicon" aria-hidden="true">
          🤖
        </span>
      )}
      <div>
        <h3>{info.label}</h3>
        <p>
          {t("Version {v} (build {code})", { v: info.versionName, code: info.versionCode })}
        </p>
        <ul className="bs-facts">
          <li>
            <code>{info.packageName}</code>
          </li>
          <li>{mb(size)}</li>
          {android && <li>{t("Android {v}+", { v: android })}</li>}
          <li>{info.abis.length ? info.abis.map(cpuName).map((c) => t(c)).join(", ") : t("All phones")}</li>
        </ul>
      </div>
    </header>
  );
}

function Warnings({ info }: { info: AppInfo }) {
  const { t } = useLang();
  const list = warningsFor(info);
  if (!list.length) return <p className="diff-ok">{t("✓ Looks ready to install on testers' phones.")}</p>;
  return (
    <ul className="bs-warn">
      {list.map((w) => (
        <li key={w.title} className={`w-${w.level}`}>
          <span className={`sev sev-${w.level === "info" ? "info" : w.level}`}>{t(w.level === "high" ? "Won't install" : w.level === "medium" ? "Check" : "Note")}</span>
          <b>{t(w.title)}</b>
          <p>{t(w.detail)}</p>
        </li>
      ))}
    </ul>
  );
}

function LinkCard({ url, info, onAgain }: { url: string; info: AppInfo; onAgain: () => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <section className="bs-card bs-done">
      <p className="diff-ok">{t("✓ Link ready. Send it to your testers, or let them scan the QR code.")}</p>
      <div className="bs-link">
        <QrImage text={url} size={200} alt={t("QR code for the download page")} />
        <div>
          <h3>
            {info.label} <small>{info.versionName}</small>
          </h3>
          <code className="bs-url">{url}</code>
          <div className="bs-actions">
            <button className="btn btn-gold" type="button" onClick={copy}>
              {t(copied ? "✓ Copied" : "Copy link")}
            </button>
            <a className="mini-tool" href={url} target="_blank" rel="noopener noreferrer">
              {t("Open page ↗")}
            </a>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button className="mini-tool" type="button" onClick={() => navigator.share({ title: `${info.label} ${info.versionName}`, url }).catch(() => {})}>
                {t("Share…")}
              </button>
            )}
          </div>
        </div>
      </div>
      <button className="mini-tool" type="button" onClick={onAgain}>
        {t("Share another build")}
      </button>
    </section>
  );
}

function BuildRow({ b, onDelete, onVisible }: { b: Build; onDelete: () => void; onVisible: (on: boolean) => void }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const url = typeof location !== "undefined" ? `${location.origin}/i/${b.id}` : `/i/${b.id}`;
  const left = timeLeft(b.expires);
  return (
    <li className="bs-row">
      {b.icon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b.icon} alt="" width={44} height={44} />
      ) : (
        <span className="bs-noicon small" aria-hidden="true">
          🤖
        </span>
      )}
      <div className="bs-row-main">
        <b>
          {b.label} <small>{b.versionName} ({b.versionCode})</small>
        </b>
        <span>
          {b.listed === false ? <em className="bs-hidden">🙈 {t("Hidden from All APKs")}</em> : <em className="bs-shown">📂 {t("On All APKs")}</em>} ·{" "}
          {t(left.unit === "day" ? "Expires in {n} days" : left.unit === "hour" ? "Expires in {n} hours" : "Expires in {n} minutes", { n: left.n })} ·{" "}
          {t(b.downloads === 1 ? "{n} download" : "{n} downloads", { n: b.downloads >= 999 ? "999+" : b.downloads })} · {mb(b.size)}
        </span>
      </div>
      <div className="bs-row-actions">
        <button
          className="mini-tool"
          type="button"
          onClick={() =>
            navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          {t(copied ? "✓ Copied" : "Copy link")}
        </button>
        <a className="mini-tool" href={url} target="_blank" rel="noopener noreferrer">
          {t("Open ↗")}
        </a>
        <button className="mini-tool" type="button" onClick={() => onVisible(b.listed === false)} aria-pressed={b.listed !== false} title={t("Show or hide this build on the All APKs page")}>
          {t(b.listed === false ? "Show" : "Hide")}
        </button>
        <button className="mini-tool danger" type="button" onClick={onDelete}>
          {t("Delete")}
        </button>
      </div>
    </li>
  );
}
