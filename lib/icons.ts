// App icon & splash generator: draws every icon size from one source image with canvas and zips
// them in the same folders a Flutter project uses (android/, ios/, web/), plus store icons.
// Everything runs in the browser; the image never leaves the device.

import { zlibSync, zipSync } from "fflate";

export type IconMode = "logo" | "full"; // logo: transparent logo placed on a colour; full: image is already a complete icon
export type IconOptions = { mode: IconMode; bg: string; scale: number; themed: boolean; name: string };
export type Source = CanvasImageSource & { width: number; height: number };

export const ANDROID_DENSITIES = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
] as const;

export async function loadImage(file: Blob): Promise<Source> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    // SVGs without a size come back as 0×0: draw them onto a 1024 canvas instead.
    if (!img.naturalWidth || !img.naturalHeight || file.type === "image/svg+xml") {
      const c = canvas(1024);
      const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
      const w = ratio >= 1 ? 1024 : 1024 * ratio;
      const h = ratio >= 1 ? 1024 / ratio : 1024;
      c.getContext("2d")!.drawImage(img, (1024 - w) / 2, (1024 - h) / 2, w, h);
      return c;
    }
    return img as Source;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvas(size: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.round(size);
  return c;
}

// Shrink in halving steps so small icons stay sharp instead of aliased.
const stepCache = new WeakMap<object, Map<number, Source>>();
function sized(src: Source, target: number): Source {
  let cur = src;
  const cache = stepCache.get(src) ?? new Map<number, Source>();
  stepCache.set(src, cache);
  while (Math.max(cur.width, cur.height) > target * 2) {
    const w = Math.max(1, Math.round(cur.width / 2));
    const h = Math.max(1, Math.round(cur.height / 2));
    const hit = cache.get(w);
    if (hit) {
      cur = hit;
      continue;
    }
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(cur, 0, 0, w, h);
    cache.set(w, c);
    cur = c;
  }
  return cur;
}

// Draw the image fitted inside a box (contain) or filling it (cover), centred at (cx, cy).
function place(g: CanvasRenderingContext2D, src: Source, cx: number, cy: number, box: number, cover: boolean) {
  const r = src.width / src.height;
  const fit = cover ? (r > 1 ? [box * r, box] : [box, box / r]) : r > 1 ? [box, box / r] : [box * r, box];
  const s = sized(src, Math.max(fit[0], fit[1]));
  g.imageSmoothingQuality = "high";
  g.drawImage(s, cx - fit[0] / 2, cy - fit[1] / 2, fit[0], fit[1]);
}

function roundRect(g: CanvasRenderingContext2D, size: number, radius: number) {
  g.beginPath();
  g.roundRect(0, 0, size, size, radius);
}

// A full square icon: colour background plus the logo (or the full image). Used for iOS, stores and web.
export function squareIcon(src: Source, o: IconOptions, size: number, opts: { shape?: "square" | "rounded" | "circle"; safe?: number } = {}) {
  const c = canvas(size);
  const g = c.getContext("2d")!;
  const shape = opts.shape ?? "square";
  if (shape === "circle") {
    g.beginPath();
    g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    g.clip();
  } else if (shape === "rounded") {
    roundRect(g, size, size * 0.18);
    g.clip();
  }
  g.fillStyle = o.bg;
  g.fillRect(0, 0, size, size);
  if (o.mode === "full") place(g, src, size / 2, size / 2, size, true);
  else place(g, src, size / 2, size / 2, size * o.scale * (opts.safe ?? 1), false);
  return c;
}

// Adaptive icon foreground: 108dp canvas, only the centre 72dp is visible and 66dp is always safe.
export function adaptiveForeground(src: Source, o: IconOptions, size: number, mono = false) {
  const c = canvas(size);
  const g = c.getContext("2d")!;
  // A full icon fills the visible 72dp; the launcher's mask trims its corners.
  if (o.mode === "full") place(g, src, size / 2, size / 2, size * (72 / 108), true);
  else place(g, src, size / 2, size / 2, size * (66 / 108) * o.scale, false);
  if (mono) {
    // Themed icons (Android 13+) use only the shape: paint every visible pixel white.
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, size, size);
  }
  return c;
}

// The adaptive icon as a launcher shows it: background + foreground, cropped to the visible 72dp.
export function adaptivePreview(src: Source, o: IconOptions, size: number) {
  const full = Math.round((size * 108) / 72);
  const c = canvas(size);
  const g = c.getContext("2d")!;
  g.fillStyle = o.bg;
  g.fillRect(0, 0, size, size);
  g.drawImage(adaptiveForeground(src, o, full), -(full - size) / 2, -(full - size) / 2);
  return c;
}

// Android 12+ splash icon: 288dp canvas; the icon must fit in the 192dp circle in the middle.
export function splashIcon(src: Source, o: IconOptions, size: number) {
  const c = canvas(size);
  const g = c.getContext("2d")!;
  const circle = (size * 192) / 288;
  if (o.mode === "full") {
    g.beginPath();
    g.arc(size / 2, size / 2, circle / 2, 0, Math.PI * 2);
    g.clip();
    place(g, src, size / 2, size / 2, circle, true);
  } else place(g, src, size / 2, size / 2, (circle / Math.SQRT2) * Math.min(1, o.scale + 0.2), false);
  return c;
}

export function hasTransparency(src: Source): boolean {
  const c = canvas(64);
  const g = c.getContext("2d", { willReadFrequently: true })!;
  place(g, src, 32, 32, 64, false);
  const px = g.getImageData(0, 0, 64, 64).data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 250) return true;
  return false;
}

const png = (c: HTMLCanvasElement) =>
  new Promise<Uint8Array>((ok, bad) => c.toBlob((b) => (b ? b.arrayBuffer().then((a) => ok(new Uint8Array(a)), bad) : bad(new Error("PNG export failed"))), "image/png"));

// Apple rejects App Store icons that have an alpha channel (ITMS-90717), even fully opaque ones,
// and canvas always exports RGBA. So these are encoded here as plain RGB PNGs.
const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(b: Uint8Array) {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngRGB(c: HTMLCanvasElement): Uint8Array {
  const { width: w, height: h } = c;
  const px = c.getContext("2d")!.getImageData(0, 0, w, h).data;
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0, o = 0; y < h; y++) {
    raw[o++] = 0; // no filter
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      raw[o++] = px[i];
      raw[o++] = px[i + 1];
      raw[o++] = px[i + 2];
    }
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4);
    out.set(data, 8);
    v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, w);
  v.setUint32(4, h);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlibSync(raw, { level: 6 })), chunk("IEND", new Uint8Array())];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  parts.reduce((o, p) => (out.set(p, o), o + p.length), 0);
  return out;
}

const text = (s: string) => new TextEncoder().encode(s);

export async function buildZip(src: Source, o: IconOptions): Promise<Blob> {
  const files: Record<string, Uint8Array> = {};
  const res = "android/app/src/main/res";
  const themed = o.themed && o.mode === "logo";

  for (const [d, k] of ANDROID_DENSITIES) {
    files[`${res}/mipmap-${d}/ic_launcher.png`] = await png(squareIcon(src, o, 48 * k, { shape: "rounded", safe: 0.85 }));
    files[`${res}/mipmap-${d}/ic_launcher_round.png`] = await png(squareIcon(src, o, 48 * k, { shape: "circle", safe: 0.8 }));
    files[`${res}/mipmap-${d}/ic_launcher_foreground.png`] = await png(adaptiveForeground(src, o, 108 * k));
    if (themed) files[`${res}/mipmap-${d}/ic_launcher_monochrome.png`] = await png(adaptiveForeground(src, o, 108 * k, true));
    files[`${res}/drawable-${d}/splash_icon.png`] = await png(splashIcon(src, o, 288 * k));
  }
  const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />${themed ? '\n    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />' : ""}
</adaptive-icon>
`;
  files[`${res}/mipmap-anydpi-v26/ic_launcher.xml`] = text(adaptive);
  files[`${res}/mipmap-anydpi-v26/ic_launcher_round.xml`] = text(adaptive);
  files[`${res}/values/ic_launcher_background.xml`] = text(`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${o.bg}</color>
</resources>
`);

  // iOS: Xcode 14+ needs only the 1024 icon. It must not be transparent, so it's drawn on the colour.
  const ios = "ios/Runner/Assets.xcassets/AppIcon.appiconset";
  files[`${ios}/AppIcon-1024.png`] = pngRGB(squareIcon(src, o, 1024));
  files[`${ios}/Contents.json`] = text(
    JSON.stringify({ images: [{ filename: "AppIcon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" }], info: { author: "xcode", version: 1 } }, null, 2) + "\n",
  );

  // Web (Flutter web names), including maskable icons with a safe margin.
  files["web/favicon.png"] = await png(squareIcon(src, o, 32, { shape: "rounded" }));
  files["web/icons/Icon-192.png"] = await png(squareIcon(src, o, 192, { shape: "rounded", safe: 0.9 }));
  files["web/icons/Icon-512.png"] = await png(squareIcon(src, o, 512, { shape: "rounded", safe: 0.9 }));
  files["web/icons/Icon-maskable-192.png"] = await png(squareIcon(src, o, 192, { safe: 0.8 }));
  files["web/icons/Icon-maskable-512.png"] = await png(squareIcon(src, o, 512, { safe: 0.8 }));
  files["web/apple-touch-icon.png"] = pngRGB(squareIcon(src, o, 180));

  files["store/play-store-512.png"] = await png(squareIcon(src, o, 512));
  files["store/app-store-1024.png"] = pngRGB(squareIcon(src, o, 1024));
  files["README.txt"] = text(readme(o, themed));

  return new Blob([zipSync(files, { level: 0 }) as BlobPart], { type: "application/zip" });
}

function readme(o: IconOptions, themed: boolean) {
  return `App icons for ${o.name || "your app"}
Made with Hang Daro's App Icon & Splash Generator.

The folders match a Flutter project. Copy android/, ios/ and web/ over your project's
folders (say yes to replace). For a native Android app, copy android/app/src/main/res
into your app's res folder. For a native iOS app, replace AppIcon.appiconset in your
Assets.xcassets.

ANDROID
- mipmap-*/ic_launcher.png, ic_launcher_round.png: icons for Android 7 and older.
- mipmap-anydpi-v26/: adaptive icon for Android 8+ (background colour + foreground).${themed ? "\n- ic_launcher_monochrome: themed icon for Android 13+ (matches the wallpaper colours)." : ""}
- values/ic_launcher_background.xml: the background colour ${o.bg}.
- AndroidManifest.xml should have:
    android:icon="@mipmap/ic_launcher"
    android:roundIcon="@mipmap/ic_launcher_round"

SPLASH SCREEN (Android 12+)
drawable-*/splash_icon.png is ready for the Android 12 splash screen. Add this to
res/values-v31/styles.xml inside your LaunchTheme (Flutter) or app theme:
    <item name="android:windowSplashScreenBackground">${o.bg}</item>
    <item name="android:windowSplashScreenAnimatedIcon">@drawable/splash_icon</item>

Using the flutter_native_splash package instead? In pubspec.yaml:
    flutter_native_splash:
      color: "${o.bg}"
      image: assets/splash_icon.png      # copy drawable-xxxhdpi/splash_icon.png here
      android_12:
        color: "${o.bg}"
        image: assets/splash_icon.png
Then run: dart run flutter_native_splash:create

iOS
AppIcon-1024.png has no transparency, as Apple requires. Xcode 14+ makes every other size.

STORES
- store/play-store-512.png: Google Play listing icon (512 x 512). Google adds the rounded corners.
- store/app-store-1024.png: App Store icon (1024 x 1024). Apple adds the rounded corners.

WEB
favicon.png, apple-touch-icon.png and icons/ for a PWA (Flutter web uses these names).
`;
}
