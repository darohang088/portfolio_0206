"use client";

import { useState } from "react";
import { alignText, checkPageSize, type LibResult, type PageSizeReport } from "@/lib/pagesize";
import { SAMPLE_APK_BASE64, SAMPLE_APK_NAME } from "@/data/pageSizeSample";

const MB = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
const KIND: Record<PageSizeReport["kind"], string> = { apk: "APK", aab: "App Bundle (AAB)", apks: "Split APK bundle", so: "Native library" };

// 16 KB page size checker: the same ELF and zip alignment checks Google uses, in the browser.
export default function PageSizeTool() {
  const [report, setReport] = useState<PageSizeReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [show32, setShow32] = useState(false);

  const run = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusy(true);
    setReport(null);
    try {
      setReport(await checkPageSize(file));
    } catch (e) {
      setError(
        (e as Error).message === "not-supported" || (e as Error).message === "not-zip"
          ? "This isn't an APK, AAB, .apks / .xapk bundle or .so file."
          : "Couldn't read this file. It may be damaged or use an unusual zip format.",
      );
    } finally {
      setBusy(false);
    }
  };

  const sample = () => {
    const bytes = Uint8Array.from(atob(SAMPLE_APK_BASE64), (c) => c.charCodeAt(0));
    run(new File([bytes], SAMPLE_APK_NAME));
  };

  const r = report;
  const libs = r ? [...r.libs].sort((a, b) => rank(a) - rank(b) || a.path.localeCompare(b.path)) : [];
  const shown = libs.filter((l) => l.is64 || show32);
  const count32 = libs.filter((l) => !l.is64).length;
  const hints = r ? [...new Set(r.elfFail.map((l) => l.hint).filter((h): h is string => !!h))] : [];
  const ownCode = r ? r.elfFail.some((l) => !l.hint) : false;

  return (
    <div className="ps">
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
          accept=".apk,.aab,.apks,.xapk,.so,application/vnd.android.package-archive"
          onChange={(e) => {
            run(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <b>{busy ? "Checking…" : "Drop an APK, AAB or .so file"}</b>
        <span>Also .apks / .xapk split bundles · checked in your browser, nothing is uploaded</span>
      </label>
      {!r && !busy && (
        <button className="mini-tool ps-sample" type="button" onClick={sample}>
          ★ Try with a sample APK
        </button>
      )}
      {error && <p className="rt-warn">{error}</p>}

      {r && (
        <>
          <section className={`ps-verdict v-${r.verdict}`}>
            <span className="ps-icon" aria-hidden="true">
              {r.verdict === "fail" ? "✗" : "✓"}
            </span>
            <div>
              <h3>{r.verdict === "fail" ? "Not ready for 16 KB devices" : r.verdict === "pass" ? "Ready for 16 KB devices" : "No native code: nothing to do"}</h3>
              <p>
                {r.verdict === "no-native"
                  ? "This app has no 64-bit native libraries, so it already works on 16 KB devices."
                  : r.verdict === "pass"
                    ? `All ${r.needed.length} 64-bit native ${r.needed.length === 1 ? "library is" : "libraries are"} 16 KB aligned${r.kind === "apk" || r.kind === "apks" ? ", and the uncompressed ones are aligned inside the APK" : ""}.`
                    : [
                        r.elfFail.length && `${r.elfFail.length} of ${r.needed.length} 64-bit ${r.needed.length === 1 ? "library" : "libraries"} ${r.elfFail.length === 1 ? "is" : "are"} built with 4 KB alignment`,
                        r.zipFail.length && `${r.zipFail.length} uncompressed ${r.zipFail.length === 1 ? "library isn't" : "libraries aren't"} 16 KB aligned inside the APK`,
                      ]
                        .filter(Boolean)
                        .join(", and ") + "."}
              </p>
              {r.verdict === "fail" && <p className="ps-why">Google Play requires 16 KB support for new apps and updates that target Android 15 or higher. On 16 KB phones these libraries fail to load and the app can crash at start.</p>}
              <p className="ps-meta">
                {r.fileName} · {KIND[r.kind]} · {r.libs.length} native {r.libs.length === 1 ? "library" : "libraries"}
                {r.kind === "aab" && " · zip alignment is done by Google Play when it builds the APKs"}
              </p>
            </div>
            <button className="mini-tool" type="button" onClick={() => setReport(null)}>
              Check another
            </button>
          </section>

          {libs.length > 0 && (
            <section className="ps-libs">
              <header>
                <b>Native libraries</b>
                {count32 > 0 && (
                  <label className="rt-toggle">
                    <input type="checkbox" checked={show32} onChange={(e) => setShow32(e.target.checked)} /> Show {count32} 32-bit {count32 === 1 ? "library" : "libraries"} (not required)
                  </label>
                )}
              </header>
              <div className="ps-table" role="table">
                <div className="ps-row ps-th" role="row">
                  <span role="columnheader">Library</span>
                  <span role="columnheader">ELF alignment</span>
                  <span role="columnheader">In the APK</span>
                </div>
                {shown.map((l) => (
                  <LibRow key={l.path} l={l} />
                ))}
              </div>
            </section>
          )}

          {r.verdict === "fail" && (
            <section className="ps-fix">
              <h3>How to fix it</h3>
              {r.elfFail.length > 0 && (
                <>
                  <b>Libraries built with 4 KB alignment</b>
                  {hints.length > 0 && (
                    <ul>
                      {hints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                  {(ownCode || !hints.length) && (
                    <ul>
                      <li>Your own C/C++ code: build with Android NDK r28 or newer, which uses 16 KB alignment by default.</li>
                      <li>
                        NDK r27: add <code>-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON</code> to your CMake arguments (or <code>APP_SUPPORT_FLEXIBLE_PAGE_SIZES := true</code> in Application.mk).
                      </li>
                      <li>
                        Older NDK: link with <code>-Wl,-z,max-page-size=16384</code>.
                      </li>
                      <li>A library from someone else: update it to the latest version, or ask the vendor for a 16 KB build.</li>
                    </ul>
                  )}
                </>
              )}
              {r.zipFail.length > 0 && (
                <>
                  <b>Uncompressed libraries not aligned in the APK</b>
                  <ul>
                    <li>Update the Android Gradle Plugin to 8.5.1 or newer. It aligns uncompressed native libraries to 16 KB automatically.</li>
                    <li>
                      Check a built APK with <code>zipalign -c -P 16 -v 4 app.apk</code>.
                    </li>
                  </ul>
                </>
              )}
              <p className="ps-test">
                Then test on a 16 KB device: in Android Studio, create an emulator with an Android 15+ &quot;16 KB Page Size&quot; system image, or turn on the 16 KB option in Developer options on Pixel 8 and newer.
              </p>
            </section>
          )}
        </>
      )}

      <details className="r8-tips rt-help">
        <summary>How this check works</summary>
        <ul>
          <li>
            It runs the same two checks as Google: the <code>check_elf_alignment.sh</code> script (every LOAD segment of each 64-bit native library must be aligned to 16 KB or more) and <code>zipalign -c -P 16</code> (native libraries stored uncompressed must start at a 16 KB boundary in the APK).
          </li>
          <li>Only 64-bit libraries (arm64-v8a, x86_64) need 16 KB support. 32-bit ones (armeabi-v7a, x86) never run on 16 KB devices, so they don&apos;t count.</li>
          <li>Compressed libraries are unpacked when the app installs, so only their ELF alignment matters.</li>
          <li>For an AAB, Google Play builds the APKs and handles zip alignment, so only the ELF check applies.</li>
          <li>Apps without native code (only Java/Kotlin) already work on 16 KB devices.</li>
        </ul>
      </details>
    </div>
  );
}

// Failing 64-bit libraries first, then passing ones, then 32-bit.
const rank = (l: LibResult) => (!l.is64 ? 3 : !l.elfOk || l.zipOk === false ? 0 : 1);

function LibRow({ l }: { l: LibResult }) {
  const bad = l.is64 && (!l.elfOk || l.zipOk === false);
  return (
    <div className={`ps-row${bad ? " bad" : ""}${l.is64 ? "" : " old"}`} role="row">
      <span className="ps-lib" role="cell">
        <b>{l.name}</b>
        <small>
          {l.abi} · {MB(l.size)}
          {l.path !== l.name && ` · ${l.path}`}
        </small>
        {bad && l.hint && <small className="ps-hint">💡 {l.hint}</small>}
      </span>
      <span role="cell">
        {!l.is64 ? (
          <i className="ps-tag t-na">{alignText(l.elfAlign)} · not required</i>
        ) : (
          <i className={`ps-tag ${l.elfOk ? "t-ok" : "t-bad"}`}>
            {l.elfOk ? "✓" : "✗"} {alignText(l.elfAlign)}
          </i>
        )}
      </span>
      <span role="cell">
        {l.zipOk === null ? (
          <i className="ps-tag t-na">{l.compressed ? "compressed · OK" : "n/a"}</i>
        ) : (
          <i className={`ps-tag ${l.zipOk || !l.is64 ? "t-ok" : "t-bad"}`}>{l.zipOk ? "✓ 16 KB aligned" : "✗ not aligned"}</i>
        )}
      </span>
    </div>
  );
}
