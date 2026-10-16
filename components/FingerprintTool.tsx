"use client";

import { useRef, useState } from "react";
import CopyButton from "./CopyButton";
import type { CertInfo } from "@/lib/crypto/x509";

type Mode = "file" | "paste";
const ACCEPT = ".jks,.keystore,.p12,.pfx,.apk,.pem,.crt,.cer,.der,.rsa,.dsa,.ec,.p7b";

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// Keystore fingerprints: drop a keystore, APK or certificate and get MD5 / SHA-1 / SHA-256.
export default function FingerprintTool() {
  const [mode, setMode] = useState<Mode>("file");
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needPw, setNeedPw] = useState(false);
  const [pw, setPw] = useState("");
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ kind: string; name: string; certs: CertInfo[] } | null>(null);
  const pending = useRef<{ bytes: Uint8Array; name: string } | null>(null);

  const run = async (bytes: Uint8Array, name: string, password?: string) => {
    setBusy(true);
    setError("");
    try {
      const { findCertificates, NeedPassword } = await import("@/lib/crypto/keystore");
      try {
        const r = await findCertificates(bytes, password);
        setResult({ ...r, name });
        setNeedPw(false);
        setPw("");
        pending.current = null;
      } catch (e) {
        if (e instanceof NeedPassword) {
          pending.current = { bytes, name };
          setNeedPw(true);
          setResult(null);
          if (password !== undefined) setError(e.message);
        } else throw e;
      }
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : "Couldn't read this file.");
    } finally {
      setBusy(false);
    }
  };

  const fromFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 300 * 1024 * 1024) return setError("That file is too big.");
    setNeedPw(false);
    setPw("");
    run(new Uint8Array(await f.arrayBuffer()), f.name);
  };

  const reset = () => {
    setResult(null);
    setError("");
    setNeedPw(false);
    setPw("");
    setText("");
    pending.current = null;
  };

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
              if (m !== mode) reset();
              setMode(m);
            }}
          >
            {m === "file" ? "Drop a file" : "Paste"}
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
            accept={ACCEPT}
            onChange={(e) => {
              fromFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <b>{busy ? "Reading…" : "Drop a keystore, APK or certificate"}</b>
          <span>.jks · .keystore · .p12 · .apk · .pem · .crt · META-INF/*.RSA</span>
        </label>
      ) : (
        <form
          className="qr-paste"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) run(new TextEncoder().encode(text), "Pasted text");
          }}
        >
          <textarea className="fp-paste" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"-----BEGIN CERTIFICATE-----\nMIID…\n-----END CERTIFICATE-----\n\n…or a base64 keystore"} />
          <button className="btn btn-gold" type="submit" disabled={busy}>
            Read ▶
          </button>
          <PasteHelp />
        </form>
      )}

      {needPw && (
        <form
          className="fp-pw"
          onSubmit={(e) => {
            e.preventDefault();
            if (pending.current) run(pending.current.bytes, pending.current.name, pw);
          }}
        >
          <label className="field">
            <span>🔑 Store password for {pending.current?.name}</span>
            <input type="password" autoComplete="off" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Keystore password" />
          </label>
          <button className="btn btn-gold" type="submit" disabled={busy}>
            Unlock ▶
          </button>
          <small>Used only in your browser to read the certificates. The private key is never decrypted.</small>
        </form>
      )}

      <p className="tester-err" role="alert">
        {error}
      </p>

      {result && (
        <section className="fp-result">
          <p className="fp-kind">
            <b>{result.name}</b> · {result.kind} · {result.certs.length} certificate{result.certs.length > 1 ? "s" : ""}
          </p>
          {result.certs.map((c, i) => (
            <CertCard key={c.sha256} c={c} i={i} />
          ))}
          <div className="fp-help">
            <b>Where to paste these</b>
            <ul>
              <li>
                <b>Firebase</b> (Project settings → Your apps): SHA-1 and SHA-256
              </li>
              <li>
                <b>Google Sign-In / Maps / Google Cloud API keys</b>: SHA-1 with your package name
              </li>
              <li>
                <b>Facebook Login</b>: the key hash
              </li>
              <li>
                <b>Play App Signing</b>: Google re-signs your app, so also add the <i>app signing key</i> fingerprints from Play Console → Setup → App signing.
              </li>
            </ul>
          </div>
        </section>
      )}

      <p className="apk-private fp-private">🔒 Read in your browser. Your keystore and password are never uploaded.</p>
    </div>
  );
}

function CertCard({ c, i }: { c: CertInfo; i: number }) {
  const now = Date.now();
  const expired = c.validTo.getTime() < now;
  const soon = !expired && c.validTo.getTime() - now < 1000 * 60 * 60 * 24 * 365;
  const rows: [string, string][] = [
    ["SHA-1", c.sha1],
    ["SHA-256", c.sha256],
    ["MD5", c.md5],
    ["Key hash (Facebook)", c.facebookKeyHash],
  ];
  return (
    <article className="fp-card">
      <header>
        <h3>{c.alias ?? c.subject.match(/CN=([^,]+)/)?.[1] ?? `Certificate ${i + 1}`}</h3>
        <div className="khqr-badges">
          {c.source.split(" · ").map((s) => (
            <span key={s} className="sev sev-info">
              {s}
            </span>
          ))}
          {c.debug && <span className="sev sev-high">Debug key</span>}
          {expired && <span className="sev sev-high">Expired</span>}
          {soon && <span className="sev sev-low">Expires within a year</span>}
        </div>
      </header>
      <dl className="khqr-fields fp-meta">
        <div>
          <dt>Owner</dt>
          <dd>{c.subject}</dd>
        </div>
        {!c.selfSigned && (
          <div>
            <dt>Issuer</dt>
            <dd>{c.issuer}</dd>
          </div>
        )}
        <div>
          <dt>Valid</dt>
          <dd>
            {fmtDate(c.validFrom)} → {fmtDate(c.validTo)}
          </dd>
        </div>
        <div>
          <dt>Key</dt>
          <dd>
            {c.keyType} · {c.signature}
          </dd>
        </div>
        <div>
          <dt>Serial</dt>
          <dd>{c.serial}</dd>
        </div>
      </dl>
      {c.debug && <p className="tester-err">This is Android&apos;s debug key. Use it for development only, never for a Play Store release.</p>}
      <div className="fp-prints">
        {rows.map(([label, value]) => {
          const id = `fp-${i}-${label.replace(/\W/g, "")}`;
          return (
            <div key={label} className="fp-row">
              <span>{label}</span>
              <code id={id}>{value}</code>
              <CopyButton text={value} targetId={id} />
            </div>
          );
        })}
      </div>
    </article>
  );
}

// Where to get something to paste: the commands, each with a Copy button.
const HELP: { title: string; note: string; cmds?: [string, string][] }[] = [
  {
    title: "Certificate from your keystore (recommended)",
    note: "Run in a terminal (it asks for the keystore password), then copy everything from -----BEGIN CERTIFICATE----- to -----END CERTIFICATE-----. Change my-release.jks and upload to your file name and key alias.",
    cmds: [["Terminal (macOS, Linux, Windows)", "keytool -exportcert -rfc -keystore my-release.jks -alias upload"]],
  },
  {
    title: "Whole keystore as base64",
    note: "Turns the keystore file into text and copies it. After pasting, you'll be asked for the store password.",
    cmds: [
      ["macOS", "base64 -i my-release.jks | pbcopy"],
      ["Linux (then copy the output)", "base64 -w0 my-release.jks"],
      ["Windows (PowerShell)", '[Convert]::ToBase64String([IO.File]::ReadAllBytes("my-release.jks")) | Set-Clipboard'],
    ],
  },
  {
    title: "Google Play app signing key",
    note: "Play Console → your app → Test and release → Setup → App signing → App signing key certificate → Download certificate. Drop the downloaded deployment_cert.der in the Drop a file tab.",
  },
  {
    title: "Not sure? Skip pasting",
    note: "Switch to Drop a file and drop your .jks, .keystore, .p12 or .apk directly. It's read in your browser too.",
  },
];

function PasteHelp() {
  return (
    <details className="paste-help">
      <summary>💡 How do I get this? Where do I copy it from?</summary>
      <ol>
        {HELP.map((h, i) => (
          <li key={h.title}>
            <b>{h.title}</b>
            <p>{h.note}</p>
            {h.cmds?.map(([label, cmd], k) => (
              <Cmd key={label} id={`help-${i}-${k}`} label={label} cmd={cmd} />
            ))}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Cmd({ id, label, cmd }: { id: string; label: string; cmd: string }) {
  return (
    <div className="paste-cmd">
      <span>{label}</span>
      <code id={id}>{cmd}</code>
      <CopyButton text={cmd} targetId={id} />
    </div>
  );
}
