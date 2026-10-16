"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { base64ToBytes, bytesToBase64, bytesToText, HASHES, hashBytes, hmac, HMACS, keyBytes, sniff, textToBase64, toHex, urlDecode, urlEncode, urlParts, utf8, type HashAlgo, type HmacAlgo } from "@/lib/encode";

type Tab = "base64" | "url" | "hash" | "hmac";
type Dir = "encode" | "decode";
type Loaded = { name: string; bytes: Uint8Array };

const TABS: { id: Tab; label: string }[] = [
  { id: "base64", label: "Base64" },
  { id: "url", label: "URL" },
  { id: "hash", label: "Hash" },
  { id: "hmac", label: "HMAC" },
];
const MAX_FILE = 200 * 1024 * 1024;

const size = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) =>
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
    });
  return { copied, copy };
}

// Encode & Hash: Base64, URL encoding, hashes (MD5…SHA-512) and HMAC, for text or files.
export default function EncodeTool() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("base64");
  return (
    <div className="pj eh">
      <div className="qr-tabs" role="tablist" aria-label={t("Tool")}>
        {TABS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? "on" : undefined} onClick={() => setTab(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      {tab === "base64" && <Base64Tab />}
      {tab === "url" && <UrlTab />}
      {tab === "hash" && <HashTab />}
      {tab === "hmac" && <HmacTab />}
      <p className="pj-status">{t("🔒 Runs in your browser. Nothing you type or drop is uploaded.")}</p>
    </div>
  );
}

// Shared input pane: a textarea, or a file card when a file was dropped or loaded.
function InputPane({ label, value, onChange, file, onFile, placeholder, allowFile = true }: { label: string; value: string; onChange: (v: string) => void; file: Loaded | null; onFile: (f: Loaded | null) => void; placeholder: string; allowFile?: boolean }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const load = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE) return setError(t("That file is too big."));
    setError("");
    onFile({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
  };
  return (
    <section className="pj-pane">
      <header className="pj-head">
        <b>{label}</b>
        <span className="eh-head-actions">
          {!file && value && <small>{size(utf8(value).length)}</small>}
          {allowFile && (
            <button className="mini-tool" type="button" onClick={() => input.current?.click()}>
              {t("Load file")}
            </button>
          )}
          <button className="mini-tool" type="button" onClick={() => (onChange(""), onFile(null))} disabled={!value && !file}>
            {t("Clear")}
          </button>
        </span>
        <input
          ref={input}
          type="file"
          hidden
          onChange={(e) => {
            load(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </header>
      {file ? (
        <div className="eh-file">
          <span aria-hidden="true">📄</span>
          <div>
            <b>{file.name}</b>
            <small>
              {size(file.bytes.length)}
              {sniff(file.bytes) ? ` · ${t(sniff(file.bytes)!.label)}` : ""}
            </small>
          </div>
          <button className="mini-tool" type="button" onClick={() => onFile(null)}>
            {t("Remove")}
          </button>
        </div>
      ) : (
        <textarea
          className="pj-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onDragOver={(e) => allowFile && e.preventDefault()}
          onDrop={(e) => {
            const f = e.dataTransfer.files[0];
            if (allowFile && f) {
              e.preventDefault();
              load(f);
            }
          }}
          placeholder={t(placeholder)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={label}
        />
      )}
      {error && <p className="tester-err eh-err">{error}</p>}
    </section>
  );
}

function DirToggle({ dir, setDir }: { dir: Dir; setDir: (d: Dir) => void }) {
  const { t } = useLang();
  return (
    <>
      {(["encode", "decode"] as Dir[]).map((d) => (
        <button key={d} className={`mini-tool${dir === d ? " on" : ""}`} type="button" aria-pressed={dir === d} onClick={() => setDir(d)}>
          {t(d === "encode" ? "Encode" : "Decode")}
        </button>
      ))}
    </>
  );
}

function OutputPane({ label, text, children, error }: { label: string; text?: string; children?: React.ReactNode; error?: string }) {
  const { t } = useLang();
  const { copied, copy } = useCopy();
  return (
    <section className="pj-pane">
      <header className="pj-head">
        <b>{label}</b>
        <span className="eh-head-actions">
          {text && <small>{size(utf8(text).length)}</small>}
          {text !== undefined && (
            <button className="mini-tool" type="button" onClick={() => copy("out", text)} disabled={!text}>
              {copied === "out" ? t("✓ Copied") : t("Copy")}
            </button>
          )}
        </span>
      </header>
      <div className="pj-output">
        {error ? (
          <div className="pj-error" role="alert">
            <b>✗ {t(error)}</b>
          </div>
        ) : text !== undefined && !children ? (
          text ? <pre className="wrap">{text}</pre> : <p className="pj-empty">{t("The result shows up here.")}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

// ---------- Base64 ----------
function Base64Tab() {
  const { t } = useLang();
  const [dir, setDir] = useState<Dir>("encode");
  const [text, setText] = useState("");
  const [file, setFile] = useState<Loaded | null>(null);
  const [urlSafe, setUrlSafe] = useState(false);
  const [dataUrl, setDataUrl] = useState(false);

  const result = useMemo(() => {
    try {
      if (dir === "encode") {
        if (file) {
          const b64 = bytesToBase64(file.bytes, urlSafe && !dataUrl);
          return { text: dataUrl ? `data:${sniff(file.bytes)?.mime ?? "application/octet-stream"};base64,${b64}` : b64 };
        }
        return { text: text ? textToBase64(text, urlSafe) : "" };
      }
      if (!text.trim()) return { text: "" };
      const bytes = base64ToBytes(text);
      const asText = bytesToText(bytes);
      return asText !== null ? { text: asText } : { bytes };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't decode this." };
    }
  }, [dir, text, file, urlSafe, dataUrl]);

  return (
    <>
      <div className="pj-bar" role="toolbar">
        <DirToggle
          dir={dir}
          setDir={(d) => {
            setDir(d);
            setFile(null);
          }}
        />
        <span className="pj-sep" aria-hidden="true" />
        {dir === "encode" && (
          <>
            <label className="eh-check">
              <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe(e.target.checked)} disabled={!!file && dataUrl} /> {t("URL-safe (- and _, no =)")}
            </label>
            {file && (
              <label className="eh-check">
                <input type="checkbox" checked={dataUrl} onChange={(e) => setDataUrl(e.target.checked)} /> {t("As a data: URL")}
              </label>
            )}
          </>
        )}
        <button
          className="mini-tool"
          type="button"
          disabled={!result.text}
          onClick={() => {
            setText(result.text ?? "");
            setFile(null);
            setDir(dir === "encode" ? "decode" : "encode");
          }}
        >
          ⇄ {t("Use result as input")}
        </button>
      </div>
      <div className="pj-panes">
        <InputPane
          label={t(dir === "encode" ? "Text or file" : "Base64")}
          value={text}
          onChange={setText}
          file={dir === "encode" ? file : null}
          onFile={(f) => {
            setFile(f);
            if (f) setDataUrl(!!sniff(f.bytes)?.mime.startsWith("image/"));
          }}
          allowFile={dir === "encode"}
          placeholder={dir === "encode" ? "Type or paste text, or drop a file to turn it into Base64" : "Paste Base64 (or a data: URL) to decode it"}
        />
        <OutputPane label={t(dir === "encode" ? "Base64" : "Decoded")} text={result.bytes ? undefined : (result.text ?? "")} error={result.error}>
          {result.bytes && <BinaryResult bytes={result.bytes} />}
        </OutputPane>
      </div>
    </>
  );
}

// Decoded Base64 that isn't text: show what it is, a preview for images, and a download.
function BinaryResult({ bytes }: { bytes: Uint8Array }) {
  const { t } = useLang();
  const kind = sniff(bytes);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([bytes.slice()], { type: kind?.mime ?? "application/octet-stream" }));
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [bytes, kind?.mime]);
  return (
    <div className="eh-binary">
      <p>
        <b>{t(kind?.label ?? "Binary data")}</b> · {size(bytes.length)}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {kind?.mime.startsWith("image/") && url && <img src={url} alt={t("Decoded image")} />}
      {url && (
        <a className="mini-tool" href={url} download={`decoded.${kind?.ext ?? "bin"}`}>
          ⬇ {t("Download file")}
        </a>
      )}
      <details>
        <summary>{t("Show as hex")}</summary>
        <pre className="wrap">{toHex(bytes.subarray(0, 4096)).replace(/(..)/g, "$1 ").trim() + (bytes.length > 4096 ? " …" : "")}</pre>
      </details>
    </div>
  );
}

// ---------- URL ----------
function UrlTab() {
  const { t } = useLang();
  const [dir, setDir] = useState<Dir>("encode");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"component" | "full">("component");
  const [plus, setPlus] = useState(true);
  const result = useMemo(() => {
    if (!text) return { text: "" };
    try {
      return { text: dir === "encode" ? urlEncode(text, mode) : urlDecode(text, plus) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't decode this." };
    }
  }, [dir, text, mode, plus]);
  const parts = useMemo(() => urlParts(dir === "decode" ? (result.text ?? "") : text), [dir, text, result.text]);

  return (
    <>
      <div className="pj-bar" role="toolbar">
        <DirToggle dir={dir} setDir={setDir} />
        <span className="pj-sep" aria-hidden="true" />
        {dir === "encode" ? (
          <label className="pj-indent">
            <span>{t("Encode")}</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "component" | "full")}>
              <option value="component">{t("A value (encodes / ? & = too)")}</option>
              <option value="full">{t("A whole URL (keeps / ? & =)")}</option>
            </select>
          </label>
        ) : (
          <label className="eh-check">
            <input type="checkbox" checked={plus} onChange={(e) => setPlus(e.target.checked)} /> {t("Treat + as a space")}
          </label>
        )}
        <button
          className="mini-tool"
          type="button"
          disabled={!result.text}
          onClick={() => {
            setText(result.text ?? "");
            setDir(dir === "encode" ? "decode" : "encode");
          }}
        >
          ⇄ {t("Use result as input")}
        </button>
      </div>
      <div className="pj-panes">
        <InputPane label={t(dir === "encode" ? "Text" : "Encoded")} value={text} onChange={setText} file={null} onFile={() => {}} allowFile={false} placeholder={dir === "encode" ? "Type text or a URL to encode, e.g. name=Hang Daro&city=ភ្នំពេញ" : "Paste an encoded URL or text, e.g. %E1%9E%97%E1%9F%92"} />
        <OutputPane label={t(dir === "encode" ? "Encoded" : "Decoded")} text={result.text ?? ""} error={result.error} />
      </div>
      {parts && (
        <section className="eh-parts">
          <h3>{t("URL parts")}</h3>
          <table>
            <tbody>
              {parts.parts.map(([k, v]) => (
                <tr key={k}>
                  <th>{t(k)}</th>
                  <td>
                    <code>{v}</code>
                  </td>
                </tr>
              ))}
              {parts.params.map(([k, v], i) => (
                <tr key={`${k}-${i}`}>
                  <th>
                    ?<code>{k}</code>
                  </th>
                  <td>
                    <code>{v}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}

// ---------- Hash ----------
function HashTab() {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [file, setFile] = useState<Loaded | null>(null);
  const [format, setFormat] = useState<"hex" | "HEX" | "base64">("hex");
  const [expected, setExpected] = useState("");
  const [hashes, setHashes] = useState<Partial<Record<HashAlgo, Uint8Array>>>({});
  const [busy, setBusy] = useState(false);
  const { copied, copy } = useCopy();

  useEffect(() => {
    let alive = true;
    const bytes = file ? file.bytes : text ? utf8(text) : null;
    if (!bytes) return setHashes({});
    setBusy(true);
    // Let the "Hashing…" state paint before a big file is hashed.
    const id = setTimeout(async () => {
      const out: Partial<Record<HashAlgo, Uint8Array>> = {};
      for (const a of HASHES) out[a] = await hashBytes(bytes, a);
      if (alive) {
        setHashes(out);
        setBusy(false);
      }
    }, file ? 30 : 0);
    return () => {
      alive = false;
      clearTimeout(id);
    };
  }, [text, file]);

  const show = (b: Uint8Array) => (format === "base64" ? bytesToBase64(b) : format === "HEX" ? toHex(b).toUpperCase() : toHex(b));
  const want = expected.trim().replace(/\s+/g, "");
  const match = (b: Uint8Array) => !!want && (want.toLowerCase() === toHex(b) || want === bytesToBase64(b) || want === bytesToBase64(b, true));
  const anyMatch = HASHES.some((a) => hashes[a] && match(hashes[a]!));

  return (
    <>
      <div className="pj-bar" role="toolbar">
        <label className="pj-indent">
          <span>{t("Show as")}</span>
          <select value={format} onChange={(e) => setFormat(e.target.value as "hex" | "HEX" | "base64")}>
            <option value="hex">{t("hex (lowercase)")}</option>
            <option value="HEX">{t("HEX (uppercase)")}</option>
            <option value="base64">Base64</option>
          </select>
        </label>
      </div>
      <div className="pj-panes">
        <InputPane label={t("Text or file")} value={text} onChange={setText} file={file} onFile={setFile} placeholder="Type text, or drop any file (an APK, an image…) to get its checksum" />
        <OutputPane label={t("Hashes")}>
          {busy && !Object.keys(hashes).length ? (
            <p className="pj-empty">{t("Hashing…")}</p>
          ) : !Object.keys(hashes).length ? (
            <p className="pj-empty">{t("The result shows up here.")}</p>
          ) : (
            <ul className="eh-hashes">
              {HASHES.map((a) =>
                hashes[a] ? (
                  <li key={a} className={match(hashes[a]!) ? "match" : undefined}>
                    <span>
                      {a} {match(hashes[a]!) && <em>✓ {t("matches")}</em>}
                    </span>
                    <code>{show(hashes[a]!)}</code>
                    <button className="mini-tool" type="button" onClick={() => copy(a, show(hashes[a]!))}>
                      {copied === a ? t("✓ Copied") : t("Copy")}
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          )}
          <label className="field eh-compare">
            <span>{t("Compare with an expected hash (optional)")}</span>
            <input value={expected} onChange={(e) => setExpected(e.target.value)} placeholder={t("Paste the checksum from the download page")} spellCheck={false} />
            {want && Object.keys(hashes).length > 0 && <small className={anyMatch ? "ok" : "bad"}>{anyMatch ? t("✓ Match: the file or text is exactly the same.") : t("✗ No match with any hash above.")}</small>}
          </label>
        </OutputPane>
      </div>
    </>
  );
}

// ---------- HMAC ----------
function HmacTab() {
  const { t } = useLang();
  const [text, setText] = useState("");
  const [file, setFile] = useState<Loaded | null>(null);
  const [key, setKey] = useState("");
  const [keyAs, setKeyAs] = useState<"text" | "hex" | "base64">("text");
  const [algo, setAlgo] = useState<HmacAlgo>("SHA-256");
  const [out, setOut] = useState<{ sig?: Uint8Array; error?: string }>({});
  const { copied, copy } = useCopy();

  useEffect(() => {
    let alive = true;
    const msg = file ? file.bytes : text ? utf8(text) : null;
    if (!msg || !key) return setOut({});
    let k: Uint8Array;
    try {
      k = keyBytes(key, keyAs);
    } catch (e) {
      return setOut({ error: e instanceof Error ? e.message : "Bad key." });
    }
    hmac(msg, k, algo).then((sig) => alive && setOut({ sig }));
    return () => {
      alive = false;
    };
  }, [text, file, key, keyAs, algo]);

  return (
    <>
      <div className="pj-bar" role="toolbar">
        <label className="pj-indent">
          <span>{t("Algorithm")}</span>
          <select value={algo} onChange={(e) => setAlgo(e.target.value as HmacAlgo)}>
            {HMACS.map((a) => (
              <option key={a} value={a}>
                HMAC-{a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="pj-panes">
        <div className="eh-stack">
          <InputPane label={t("Message")} value={text} onChange={setText} file={file} onFile={setFile} placeholder="The message or request body to sign" />
          <label className="field eh-key">
            <span>{t("Secret key")}</span>
            <div>
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder={t("Your secret key")} autoComplete="off" spellCheck={false} />
              <select value={keyAs} onChange={(e) => setKeyAs(e.target.value as "text" | "hex" | "base64")} aria-label={t("Key format")}>
                <option value="text">{t("Text")}</option>
                <option value="hex">Hex</option>
                <option value="base64">Base64</option>
              </select>
            </div>
          </label>
        </div>
        <OutputPane label={t("Signature")} error={out.error}>
          {!out.sig ? (
            <p className="pj-empty">{t("Enter a message and a secret key to see the signature.")}</p>
          ) : (
            <ul className="eh-hashes">
              {(
                [
                  ["Hex", toHex(out.sig)],
                  ["Base64", bytesToBase64(out.sig)],
                  ["Base64 URL", bytesToBase64(out.sig, true)],
                ] as [string, string][]
              ).map(([label, v]) => (
                <li key={label}>
                  <span>{label}</span>
                  <code>{v}</code>
                  <button className="mini-tool" type="button" onClick={() => copy(label, v)}>
                    {copied === label ? t("✓ Copied") : t("Copy")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </OutputPane>
      </div>
    </>
  );
}
