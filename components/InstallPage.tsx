"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { androidVersion, mb, timeLeft, warningsFor, type Build } from "@/lib/buildShare";
import { profile } from "@/data/profile";
import { AppHead } from "./BuildShare";
import QrImage from "./QrImage";

type State = { kind: "loading" } | { kind: "missing" } | { kind: "expired" } | { kind: "busy" } | { kind: "error" } | { kind: "ok"; build: Build };
type Device = "android" | "ios" | "desktop";

// The page testers open from a Build Share link (/i/<id>): app details, Download button, QR code and install help.
export default function InstallPage() {
  const { t, lang } = useLang();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [device, setDevice] = useState<Device>("desktop");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const ua = navigator.userAgent;
    setDevice(/android/i.test(ua) ? "android" : /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1) ? "ios" : "desktop");
    setUrl(location.href.split("#")[0]);
    const id = /^\/i\/([a-z0-9]+)/.exec(location.pathname)?.[1] ?? new URLSearchParams(location.search).get("id");
    if (!id) return setState({ kind: "missing" });
    fetch(`/api/builds/${id}`)
      .then(async (r) => {
        if (r.status === 410) return setState({ kind: "expired" });
        if (r.status === 429) return setState({ kind: "busy" });
        if (r.status === 404) return setState({ kind: "missing" });
        const data = await r.json();
        setState(data.ok ? { kind: "ok", build: data.build } : { kind: "error" });
        if (data.ok) document.title = `${data.build.label} ${data.build.versionName} · ${t("Install test build")}`;
      })
      .catch(() => setState({ kind: "error" }));
  }, [t]);

  return (
    <div className="ip">
      <header className="ip-top">
        <a href="/" className="ip-brand">
          {profile.name}
        </a>
      </header>

      {state.kind === "loading" ? (
        <section className="ip-card ip-msg">
          <p>{t("Loading…")}</p>
        </section>
      ) : state.kind !== "ok" ? (
        <section className="ip-card ip-msg">
          <span className="ip-big" aria-hidden="true">
            {state.kind === "expired" || state.kind === "busy" ? "⌛" : "🔍"}
          </span>
          <h1>{t(state.kind === "expired" ? "This link has expired" : state.kind === "missing" ? "Link not found" : state.kind === "busy" ? "Too many requests" : "Couldn't load this build")}</h1>
          <p>{t(state.kind === "busy" ? "Wait a minute, then reload the page." : state.kind === "error" ? "Check your connection and reload the page." : "Test links only work for a few days. Ask for a new link to get the latest build.")}</p>
        </section>
      ) : (
        <Ready build={state.build} device={device} url={url} lang={lang} />
      )}

      <p className="ip-foot">
        {t("Test build shared by {name}. Not from the Play Store.", { name: profile.name })}
      </p>
    </div>
  );
}

function Ready({ build: b, device, url, lang }: { build: Build; device: Device; url: string; lang: string }) {
  const { t } = useLang();
  const [showQr, setShowQr] = useState(false);
  const left = timeLeft(b.expires);
  const android = androidVersion(b.minSdk);
  const until = new Date(b.expires).toLocaleString(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const problems = warningsFor({ ...b, debugKey: b.debugKey ?? null }).filter((w) => w.level !== "info");

  return (
    <>
      <section className="ip-card">
        <AppHead info={b} size={b.size} />
        <p className="ip-exp">{t(left.unit === "day" ? "Link expires in {n} days ({until})" : left.unit === "hour" ? "Link expires in {n} hours ({until})" : "Link expires in {n} minutes ({until})", { n: left.n, until })}</p>

        {b.note && (
          <div className="ip-note">
            <b>{t("Notes from the developer")}</b>
            <p>{b.note}</p>
          </div>
        )}

        {device === "ios" && <p className="ip-alert">{t("This is an Android app. Open this link on an Android phone, or scan the QR code below with one.")}</p>}

        <div className={`ip-get${device === "android" ? "" : " wide"}`}>
          <a className="btn btn-gold ip-download" href={`/api/builds/${b.id}/download`} download>
            ⬇ {t("Download APK")} <small>{mb(b.size)}</small>
          </a>
          {device === "android" ? (
            <button className="mini-tool" type="button" onClick={() => setShowQr((v) => !v)}>
              {t(showQr ? "Hide QR code" : "Show QR code for another phone")}
            </button>
          ) : null}
          {(device !== "android" || showQr) && url && (
            <figure className="ip-qr">
              <QrImage text={url} size={200} alt={t("QR code for this page")} />
              <figcaption>{t(device === "android" ? "Scan with another Android phone" : "Scan with your Android phone's camera")}</figcaption>
            </figure>
          )}
        </div>

        {problems.length > 0 && (
          <ul className="bs-warn">
            {problems.map((w) => (
              <li key={w.title} className={`w-${w.level}`}>
                <b>{t(w.title)}</b>
                <p>{t(w.detail)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ip-card ip-help">
        <h2>{t("How to install")}</h2>
        <ol>
          <li>{t("Tap Download APK and wait for it to finish.")}</li>
          <li>{t("Open the file: tap the download notification, or find it in Files → Downloads.")}</li>
          <li>{t("If Android asks, allow \"Install unknown apps\" for your browser or Files app, then go back.")}</li>
          <li>{t("Tap Install. If Play Protect warns you, tap More details → Install anyway (test builds aren't from the Play Store).")}</li>
        </ol>
        <details>
          <summary>{t("Seeing \"App not installed\"?")}</summary>
          <ul>
            <li>{t("Uninstall the old version of the app first, especially one from the Play Store. Builds signed with a different key can't update it.")}</li>
            {android && <li>{t("Your phone needs Android {v} or newer (Settings → About phone).", { v: android })}</li>}
            <li>{t("Make sure the download finished and your phone has enough free space.")}</li>
            <li>{t("Still stuck? Send a screenshot to whoever shared this link.")}</li>
          </ul>
        </details>
      </section>
    </>
  );
}
