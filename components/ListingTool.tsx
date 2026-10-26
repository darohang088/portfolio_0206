"use client";

import { useEffect, useMemo, useState } from "react";
import { charCount, checkFeature, checkIcon, checkScreens, checkText, LIMITS, readImage, type Field, type ImageInfo, type Issue } from "@/lib/listing";

const DRAFT = "listing-checker-draft";
const FIELD_NAME: Record<Field, string> = { title: "App name", short: "Short description", full: "Full description", icon: "App icon", feature: "Feature graphic", screens: "Phone screenshots" };

const SAMPLE = {
  title: "BEST Shop App #1 🔥 FREE!!!",
  short: "Download now! The #1 best shopping app, 50% off today only 🔥🔥🔥",
  full: 'shop shop shop cheap shop deals shop online shop app shop now best shop shop\n"Amazing app, changed my life" - John ★★★★★\nGuaranteed income every day! Earn money fast.\nAlso on the App Store, or download the APK from our website.\nphone, shoes, bags, clothes, watch, cheap, sale, deals, offers, discount, coupon',
};

// Store Listing Checker: Play metadata policy + graphic specs, with a store preview.
export default function ListingTool() {
  const [title, setTitle] = useState("");
  const [short, setShort] = useState("");
  const [full, setFull] = useState("");
  const [icon, setIcon] = useState<ImageInfo | null>(null);
  const [feature, setFeature] = useState<ImageInfo | null>(null);
  const [screens, setScreens] = useState<ImageInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Keep the text as a draft in this browser.
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || "null");
      if (d) {
        setTitle(d.title ?? "");
        setShort(d.short ?? "");
        setFull(d.full ?? "");
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ title, short, full }));
    } catch {}
  }, [title, short, full, loaded]);

  const textIssues = useMemo(() => checkText(title, short, full), [title, short, full]);
  const issues: Issue[] = [...textIssues, ...(icon ? checkIcon(icon) : []), ...(feature ? checkFeature(feature) : []), ...(screens.length ? checkScreens(screens) : [])];
  const errors = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warn").length;
  const started = title || short || full || icon || feature || screens.length;
  const fieldLevel = (f: Field) => (issues.some((i) => i.field === f && i.level === "error") ? " bad" : issues.some((i) => i.field === f && i.level === "warn") ? " warn" : "");

  const loadOne = async (f: File | undefined, set: (i: ImageInfo) => void) => {
    if (!f) return;
    try {
      set(await readImage(f));
    } catch {}
  };
  const addScreens = async (files: FileList | File[] | null) => {
    if (!files) return;
    const out: ImageInfo[] = [];
    for (const f of Array.from(files)) {
      try {
        out.push(await readImage(f));
      } catch {}
    }
    setScreens((s) => [...s, ...out]);
  };

  const sample = async () => {
    setTitle(SAMPLE.title);
    setShort(SAMPLE.short);
    setFull(SAMPLE.full);
    // Images with typical mistakes: transparent icon corners, wrong feature size, a too-tall screenshot.
    const make = async (w: number, h: number, name: string, draw: (g: CanvasRenderingContext2D) => void, type = "image/png") => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      draw(c.getContext("2d")!);
      const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), type, 0.9));
      return readImage(new File([blob], name, { type }));
    };
    const screen = (label: string) => (g: CanvasRenderingContext2D) => {
      const { width: w, height: h } = g.canvas;
      g.fillStyle = "#1b2a6b";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f7c948";
      g.font = `bold ${Math.round(w / 9)}px sans-serif`;
      g.textAlign = "center";
      g.fillText(label, w / 2, h / 2);
    };
    setIcon(
      await make(512, 512, "icon.png", (g) => {
        g.fillStyle = "#f7c948";
        g.beginPath();
        g.roundRect(0, 0, 512, 512, 110);
        g.fill();
      }),
    );
    setFeature(await make(1000, 500, "feature.jpg", screen("SHOP"), "image/jpeg"));
    setScreens([await make(1080, 1920, "home.jpg", screen("Home"), "image/jpeg"), await make(1080, 2400, "cart.jpg", screen("Cart"), "image/jpeg")]);
  };

  const clear = () => {
    setTitle("");
    setShort("");
    setFull("");
    setIcon(null);
    setFeature(null);
    setScreens([]);
  };

  return (
    <div className="ls">
      <section className="ls-form">
        <div className="ls-row-actions">
          <button className="mini-tool" type="button" onClick={sample}>
            ★ Try a sample listing
          </button>
          {started ? (
            <button className="mini-tool" type="button" onClick={clear}>
              Clear
            </button>
          ) : null}
        </div>
        <Text label="App name" value={title} set={setTitle} max={LIMITS.title} cls={fieldLevel("title")} placeholder="Merchant - POS for Shops" />
        <Text label="Short description" value={short} set={setShort} max={LIMITS.short} cls={fieldLevel("short")} placeholder="Sell, take KHQR payments and track revenue across all your shops." />
        <Text label="Full description" value={full} set={setFull} max={LIMITS.full} cls={fieldLevel("full")} rows={10} placeholder="What the app does, its main features and who it's for…" />

        <div className="ls-images">
          <ImageDrop label="App icon" hint="512 × 512 PNG" cls={fieldLevel("icon")} img={icon} onFile={(f) => loadOne(f, setIcon)} onClear={() => setIcon(null)} />
          <ImageDrop label="Feature graphic" hint="1024 × 500 JPEG/PNG" cls={fieldLevel("feature")} img={feature} wide onFile={(f) => loadOne(f, setFeature)} onClear={() => setFeature(null)} />
        </div>
        <div className={`ls-shots${fieldLevel("screens")}`}>
          <span className="ls-label">
            Phone screenshots <small>2 to 8 · JPEG or 24-bit PNG</small>
          </span>
          <div className="ls-shot-row">
            {screens.map((s, i) => (
              <figure key={s.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt={s.name} />
                <figcaption>
                  {s.width}×{s.height}
                </figcaption>
                <button type="button" aria-label={`Remove ${s.name}`} onClick={() => setScreens((l) => l.filter((_, j) => j !== i))}>
                  ×
                </button>
              </figure>
            ))}
            <label className="ls-add">
              <input
                type="file"
                accept="image/png,image/jpeg"
                multiple
                onChange={(e) => {
                  addScreens(e.target.files);
                  e.target.value = "";
                }}
              />
              + Add
            </label>
          </div>
        </div>
      </section>

      <section className="ls-side">
        {!started ? (
          <div className="ic-empty">
            <span aria-hidden="true">🏪</span>
            <p>Type your listing or add graphics. Results update as you type.</p>
          </div>
        ) : (
          <>
            <div className={`ls-summary ${errors ? "s-fail" : warns ? "s-warn" : "s-pass"}`}>
              <b>{errors ? `${errors} problem${errors > 1 ? "s" : ""} Play will reject` : warns ? "No blockers, a few things to improve" : "Looks good for Google Play"}</b>
              <span>
                {errors} error{errors === 1 ? "" : "s"} · {warns} warning{warns === 1 ? "" : "s"}
              </span>
            </div>
            <div className="ls-issues">
              {(["title", "short", "full", "icon", "feature", "screens"] as Field[]).map((f) => {
                const list = issues.filter((i) => i.field === f);
                if (!list.length) return null;
                return (
                  <div key={f} className="ls-group">
                    <h4>{FIELD_NAME[f]}</h4>
                    {list.map((i, k) => (
                      <article key={k} className={`pc-card st-${i.level === "error" ? "fail" : i.level}`}>
                        <span className="pc-ico">{i.level === "error" ? "✗" : i.level === "warn" ? "!" : "✓"}</span>
                        <div className="pc-body">
                          <header>
                            <b>{i.title}</b>
                          </header>
                          <p>{i.detail}</p>
                          {i.hits && i.hits.length > 0 && (
                            <p className="ls-hits">
                              {i.hits.map((h) => (
                                <mark key={h}>{h}</mark>
                              ))}
                            </p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
            <Preview title={title} short={short} full={full} icon={icon} feature={feature} screens={screens} />
          </>
        )}
        <details className="r8-tips rt-help">
          <summary>What this checks</summary>
          <ul>
            <li>Lengths and words that Google Play&apos;s metadata policy doesn&apos;t allow: emojis and repeated symbols in the name, ranking claims (&quot;best&quot;, &quot;#1&quot;), promotions (&quot;free&quot;, &quot;50% off&quot;), calls to action, keyword stuffing, anonymous testimonials, misleading claims and links to other stores.</li>
            <li>Graphic specs: icon 512 × 512 32-bit PNG up to 1 MB, feature graphic 1024 × 500 without transparency, 2–8 phone screenshots between 320 and 3840 px with at most a 2:1 ratio.</li>
            <li>It can&apos;t judge everything a reviewer does (for example whether screenshots show the real app), but it catches the common reasons listings get rejected. Your text is saved only in this browser.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}

function Text({ label, value, set, max, cls, rows, placeholder }: { label: string; value: string; set: (v: string) => void; max: number; cls: string; rows?: number; placeholder: string }) {
  const n = charCount(value);
  return (
    <label className={`ls-field${cls}`}>
      <span className="ls-label">
        {label}
        <small className={n > max ? "over" : ""}>
          {n}/{max}
        </small>
      </span>
      {rows ? <textarea rows={rows} value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} /> : <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />}
    </label>
  );
}

function ImageDrop({ label, hint, cls, img, wide, onFile, onClear }: { label: string; hint: string; cls: string; img: ImageInfo | null; wide?: boolean; onFile: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div className={`ls-img${cls}${wide ? " wide" : ""}`}>
      <span className="ls-label">
        {label} <small>{hint}</small>
      </span>
      {img ? (
        <div className="ls-img-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt={label} />
          <small>
            {img.width}×{img.height} · {img.type}
            {img.alpha ? " · has transparency" : ""}
          </small>
          <button className="mini-tool" type="button" onClick={onClear}>
            Remove
          </button>
        </div>
      ) : (
        <label className="ls-drop">
          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          + Choose image
        </label>
      )}
    </div>
  );
}

function Preview({ title, short, full, icon, feature, screens }: { title: string; short: string; full: string; icon: ImageInfo | null; feature: ImageInfo | null; screens: ImageInfo[] }) {
  const [more, setMore] = useState(false);
  return (
    <div className="ls-preview" aria-label="Google Play preview">
      <span className="ls-label">Google Play preview</span>
      <div className="ls-phone">
        {feature && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ls-feature" src={feature.url} alt="" />
        )}
        <div className="ls-app">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon.url} alt="" />
          ) : (
            <span className="ls-noicon" />
          )}
          <div>
            <b>{title || "App name"}</b>
            <span>Your company</span>
          </div>
        </div>
        <i className="ls-install">Install</i>
        {screens.length > 0 && (
          <div className="ls-strip">
            {screens.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={s.url} src={s.url} alt="" />
            ))}
          </div>
        )}
        <b className="ls-about">About this app →</b>
        <p className="ls-short">{short || "Short description"}</p>
        {full && (
          <>
            <p className={`ls-full${more ? " open" : ""}`}>{full}</p>
            <button type="button" className="pc-more" onClick={() => setMore((v) => !v)}>
              {more ? "Less" : "More"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
