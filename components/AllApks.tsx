"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { androidVersion, mb, timeLeft, type PublicBuild } from "@/lib/buildShare";
import { profile } from "@/data/profile";
import QrImage from "./QrImage";
import LangToggle from "./LangToggle";

type State = { kind: "loading" } | { kind: "busy" } | { kind: "error" } | { kind: "ok"; builds: PublicBuild[] };

// The public All APKs page (/apks): every shared test build that the owner left visible,
// so testers and clients can find and download builds by themselves.
export default function AllApks() {
  const { t } = useLang();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [q, setQ] = useState("");
  const [here, setHere] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const load = () => {
    setState({ kind: "loading" });
    fetch("/api/builds/public")
      .then(async (r) => {
        if (r.status === 429) return setState({ kind: "busy" });
        const data = await r.json();
        setState(data.ok ? { kind: "ok", builds: data.builds } : { kind: "error" });
      })
      .catch(() => setState({ kind: "error" }));
  };

  useEffect(() => {
    setHere(location.href.split("#")[0]);
    load();
  }, []);

  const shown = useMemo(() => {
    if (state.kind !== "ok") return [];
    const s = q.trim().toLowerCase();
    return s ? state.builds.filter((b) => `${b.label} ${b.packageName} ${b.versionName} ${b.note}`.toLowerCase().includes(s)) : state.builds;
  }, [state, q]);

  const copy = () =>
    navigator.clipboard.writeText(here).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });

  return (
    <div className="ip aa">
      <header className="ip-top">
        <a href="/" className="ip-brand">
          {profile.name}
        </a>
        <LangToggle />
      </header>

      <section className="aa-head">
        <h1>📂 {t("All APKs")}</h1>
        <p>{t("Test builds you can download and install on Android. Each one disappears when its link expires, so grab the newest version.")}</p>
        <div className="aa-tools">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search apps…")} aria-label={t("Search apps")} />
          <button className="mini-tool" type="button" onClick={copy}>
            {t(copied ? "✓ Copied" : "Copy page link")}
          </button>
          <button className="mini-tool" type="button" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
            {t(showQr ? "Hide QR" : "QR code")}
          </button>
        </div>
        {showQr && here && (
          <div className="aa-qr">
            <QrImage text={here} size={180} alt={t("QR code for the All APKs page")} />
            <span>{t("Scan with a phone camera to open this page.")}</span>
          </div>
        )}
      </section>

      {state.kind === "loading" ? (
        <section className="ip-card ip-msg">
          <p>{t("Loading…")}</p>
        </section>
      ) : state.kind !== "ok" ? (
        <section className="ip-card ip-msg">
          <span className="ip-big" aria-hidden="true">
            {state.kind === "busy" ? "⌛" : "📡"}
          </span>
          <h1>{t(state.kind === "busy" ? "Too many requests" : "Couldn't load the builds")}</h1>
          <p>{t(state.kind === "busy" ? "Wait a minute, then reload the page." : "Check your connection and reload the page.")}</p>
          <button className="mini-tool" type="button" onClick={load}>
            {t("Try again")}
          </button>
        </section>
      ) : state.builds.length === 0 ? (
        <section className="ip-card ip-msg">
          <span className="ip-big" aria-hidden="true">
            📭
          </span>
          <h1>{t("No builds right now")}</h1>
          <p>{t("New test builds show up here when they're shared. Check back later.")}</p>
        </section>
      ) : (
        <>
          <p className="aa-count">{t(shown.length === 1 ? "{n} build" : "{n} builds", { n: shown.length })}</p>
          {shown.length === 0 && <p className="aa-none">{t("No app matches \"{q}\".", { q })}</p>}
          <ul className="aa-list">
            {shown.map((b) => (
              <ApkCard key={b.id} b={b} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ApkCard({ b }: { b: PublicBuild }) {
  const { t } = useLang();
  const left = timeLeft(b.expires);
  const android = androidVersion(b.minSdk);
  const fresh = Date.now() - b.created < 24 * 60 * 60 * 1000;
  return (
    <li className="ip-card aa-card">
      <div className="aa-top">
        {b.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={b.icon} alt="" width={56} height={56} />
        ) : (
          <span className="bs-noicon" aria-hidden="true">
            🤖
          </span>
        )}
        <div className="aa-main">
          <b>
            {b.label} {fresh && <i className="aa-new">{t("New")}</i>}
          </b>
          <span>
            {t("Version")} {b.versionName} ({b.versionCode}) · {mb(b.size)}
          </span>
          <span>
            {android && <>{t("Android {v}+", { v: android })} · </>}
            {t(left.unit === "day" ? "Expires in {n} days" : left.unit === "hour" ? "Expires in {n} hours" : "Expires in {n} minutes", { n: left.n })}
          </span>
        </div>
      </div>
      {b.note && <p className="aa-note">{b.note}</p>}
      <div className="aa-actions">
        <a className="btn btn-gold" href={`/api/builds/${b.id}/download`}>
          ⬇ {t("Download APK")}
        </a>
        <a className="mini-tool" href={`/i/${b.id}`}>
          {t("Install help & QR")}
        </a>
      </div>
    </li>
  );
}
