"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { ICON_HANDOFF } from "@/lib/bgremove";
import { adaptiveForeground, adaptivePreview, buildZip, hasTransparency, loadImage, splashIcon, squareIcon, type IconOptions, type Source } from "@/lib/icons";

const SWATCHES = ["#ffffff", "#06071a", "#f7c948", "#1e88e5", "#43a047", "#e53935", "#8e24aa", "#ff7043"];
const SHAPES = [
  { name: "Circle", radius: "50%" },
  { name: "Squircle", radius: "32%" },
  { name: "Rounded", radius: "18%" },
  { name: "Teardrop", radius: "50% 50% 50% 14%" },
];
// A pixel star, so people can see the tool working before they have a logo ready.
const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#f7c948" d="M7 1h2v3h3v2h3v2h-2v2h1v4h-2v-1h-2v-1H7v1H5v1H3v-4h1V8H2V6h3V4h2z"/><path fill="#c98a1e" d="M9 4h3v2h-3zM11 13h2v1h-2zM3 13h2v1H3z"/><path fill="#fff3c4" d="M7 2h1v2H7z"/></svg>`;

type Previews = { adaptive: string; mono?: string; ios: string; store: string; splash: string; fav: string };

// App icon & splash generator: one image in, every Android / iOS / web / store icon out.
export default function IconTool() {
  const { t } = useLang();
  const [src, setSrc] = useState<Source | null>(null);
  const [fileName, setFileName] = useState("");
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [opt, setOpt] = useState<IconOptions>({ mode: "logo", bg: "#06071a", scale: 0.8, themed: true, name: "My App" });
  const [prev, setPrev] = useState<Previews | null>(null);
  const [busy, setBusy] = useState(false);
  const [small, setSmall] = useState(false);
  const set = (p: Partial<IconOptions>) => setOpt((o) => ({ ...o, ...p }));

  const use = async (file: Blob | undefined, name: string) => {
    if (!file) return;
    setError("");
    try {
      const img = await loadImage(file);
      setSrc(img);
      setFileName(name);
      setSmall(Math.min(img.width, img.height) < 512 && file.type !== "image/svg+xml");
      // A logo with see-through parts goes on a colour; a solid image is already a full icon.
      set({ mode: hasTransparency(img) ? "logo" : "full" });
    } catch {
      setError(t("That file isn't an image we can read. Try a PNG, JPG, WebP or SVG."));
    }
  };

  // A cut-out sent over from the Background Remover.
  useEffect(() => {
    let hand: { name: string; url: string } | null = null;
    try {
      hand = JSON.parse(sessionStorage.getItem(ICON_HANDOFF) || "null");
      sessionStorage.removeItem(ICON_HANDOFF);
    } catch {
      hand = null;
    }
    if (hand?.url?.startsWith("data:image/png;base64,")) fetch(hand.url).then((r) => r.blob()).then((b) => use(b, hand!.name));
  }, []);

  useEffect(() => {
    if (!src) return setPrev(null);
    const id = setTimeout(() => {
      const url = (c: HTMLCanvasElement) => c.toDataURL("image/png");
      setPrev({
        adaptive: url(adaptivePreview(src, opt, 192)),
        mono: opt.themed && opt.mode === "logo" ? url(adaptiveForeground(src, opt, 288, true)) : undefined,
        ios: url(squareIcon(src, opt, 192)),
        store: url(squareIcon(src, opt, 256)),
        splash: url(splashIcon(src, opt, 288)),
        fav: url(squareIcon(src, opt, 32, { shape: "rounded" })),
      });
    }, 60);
    return () => clearTimeout(id);
  }, [src, opt]);

  const download = async () => {
    if (!src) return;
    setBusy(true);
    try {
      const blob = await buildZip(src, opt);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(opt.name || "app").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "app"}-icons.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ic">
      <section className="ic-left">
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
            use(e.dataTransfer.files[0], e.dataTransfer.files[0]?.name ?? "");
          }}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              use(e.target.files?.[0], e.target.files?.[0]?.name ?? "");
              e.target.value = "";
            }}
          />
          <b>{fileName ? `✓ ${fileName}` : t("Drop your logo or icon")}</b>
          <span>{t("PNG, JPG, WebP or SVG · 1024 × 1024 is best · stays on your device")}</span>
        </label>
        {!src && (
          <button type="button" className="mini-tool ic-sample" onClick={() => use(new Blob([SAMPLE], { type: "image/svg+xml" }), "sample-star.svg")}>
            ★ {t("Try with a sample logo")}
          </button>
        )}
        {error && <p className="ic-warn">{error}</p>}
        {small && <p className="ic-warn">⚠️ {t("This image is small, so big icons may look blurry. Use 1024 × 1024 if you can.")}</p>}

        {src && (
          <div className="ic-opts">
            <div className="ic-field">
              <span>{t("My image is")}</span>
              <span className="pj-views">
                {(["logo", "full"] as const).map((m) => (
                  <button key={m} type="button" className={opt.mode === m ? "on" : undefined} onClick={() => set({ mode: m })}>
                    {t(m === "logo" ? "A logo" : "A full icon")}
                  </button>
                ))}
              </span>
              <small>{t(opt.mode === "logo" ? "Your logo is placed on the background colour." : "Your image fills the whole icon.")}</small>
            </div>

            <div className="ic-field">
              <span>{t("Background colour")}</span>
              <div className="ic-colors">
                {SWATCHES.map((c) => (
                  <button key={c} type="button" className={opt.bg === c ? "on" : undefined} style={{ background: c }} onClick={() => set({ bg: c })} aria-label={c} />
                ))}
                <input type="color" value={opt.bg} onChange={(e) => set({ bg: e.target.value })} aria-label={t("Pick a colour")} />
                <code>{opt.bg}</code>
              </div>
            </div>

            {opt.mode === "logo" && (
              <label className="ic-field">
                <span>
                  {t("Logo size")} <b>{Math.round(opt.scale * 100)}%</b>
                </span>
                <input type="range" min={0.4} max={1} step={0.02} value={opt.scale} onChange={(e) => set({ scale: Number(e.target.value) })} />
              </label>
            )}

            <label className="ic-field">
              <span>{t("App name (for the preview)")}</span>
              <input className="ic-name" value={opt.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} />
            </label>

            {opt.mode === "logo" && (
              <label className="ic-check">
                <input type="checkbox" checked={opt.themed} onChange={(e) => set({ themed: e.target.checked })} />
                <span>{t("Themed icon for Android 13+ (takes the wallpaper colours)")}</span>
              </label>
            )}

            <button type="button" className="btn btn-gold ic-dl" onClick={download} disabled={busy}>
              {busy ? t("Making icons…") : `⬇ ${t("Download all icons (.zip)")}`}
            </button>
            <p className="ic-note">{t("The zip uses Flutter's folders (android/, ios/, web/) plus store icons, with a README that says where each file goes.")}</p>
          </div>
        )}
      </section>

      <section className="ic-right">
        {!prev ? (
          <div className="ic-empty">
            <span aria-hidden="true">🖼️</span>
            <p>{t("Your icon previews show up here.")}</p>
          </div>
        ) : (
          <>
            <Card title={t("Android home screen")}>
              <div className="ic-home">
                {SHAPES.map((s) => (
                  <figure key={s.name}>
                    <img src={prev.adaptive} alt="" style={{ borderRadius: s.radius }} />
                    <figcaption>{t(s.name)}</figcaption>
                  </figure>
                ))}
                {prev.mono && (
                  <figure>
                    <span className="ic-mono" style={{ backgroundImage: `url(${prev.mono})` }} />
                    <figcaption>{t("Themed")}</figcaption>
                  </figure>
                )}
              </div>
              <small>{t("Every phone brand cuts the icon to its own shape. Keep important parts away from the edges.")}</small>
            </Card>

            <div className="ic-row">
              <Card title="iPhone">
                <div className="ic-ios">
                  <img src={prev.ios} alt="" />
                  <span>{opt.name}</span>
                </div>
              </Card>
              <Card title={t("Splash screen")}>
                <div className="ic-phone" style={{ background: opt.bg }}>
                  <img src={prev.splash} alt="" />
                </div>
              </Card>
            </div>

            <Card title="Google Play">
              <div className="ic-store">
                <img src={prev.store} alt="" />
                <div>
                  <b>{opt.name}</b>
                  <span>Hang Daro</span>
                  <i>{t("Install")}</i>
                </div>
              </div>
            </Card>

            <Card title={t("Browser tab")}>
              <div className="ic-tab">
                <img src={prev.fav} alt="" width={16} height={16} />
                <span>{opt.name}</span>
                <em>×</em>
              </div>
            </Card>
          </>
        )}
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="ic-card">
      <b className="ic-card-t">{title}</b>
      {children}
    </div>
  );
}
