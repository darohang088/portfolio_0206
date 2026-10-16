// Reads what a tester's download page needs from an APK: name, icon, versions, CPU types and warnings.
// Runs in the browser (the icon is drawn on a canvas).

import { unzipSync } from "fflate";
import { parseAxml, findAll, type XmlNode } from "./axml";
import { parseArsc, resolveDeep, type ResTable } from "./arsc";

export type AppInfo = {
  label: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk?: number;
  targetSdk?: number;
  abis: string[];
  debuggable: boolean;
  testOnly: boolean;
  split: boolean;
  debugKey: boolean | null; // null when the signature couldn't be read
  signed: boolean;
  icon: string | null; // PNG data URL, 192 × 192
};

const ICON = 192;
const BITMAP = /\.(png|webp|jpe?g)$/i;

export async function readAppInfo(bytes: Uint8Array): Promise<AppInfo> {
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("This isn't an APK file (it's not a zip archive).");
  const names: string[] = [];
  const files = unzipSync(bytes, {
    filter: (f) => {
      names.push(f.name);
      return f.name === "AndroidManifest.xml" || f.name === "resources.arsc";
    },
  });
  if (names.includes("base/manifest/AndroidManifest.xml")) throw new Error("This is an Android App Bundle (.aab). Testers can't install it directly: build an APK instead.");
  const root = files["AndroidManifest.xml"] && parseAxml(files["AndroidManifest.xml"]);
  if (!root) throw new Error("No AndroidManifest.xml found. Is this an Android app (.apk)?");
  const table = files["resources.arsc"] ? parseArsc(files["resources.arsc"]) : null;

  const app = findAll(root, "application")[0] ?? ({ name: "application", attrs: {}, children: [] } as XmlNode);
  const sdk = findAll(root, "uses-sdk")[0];
  const num = (v: unknown) => (v === undefined || v === "" ? undefined : Number(v));
  const pkg = String(root.attrs.package ?? "");

  let signed = names.some((n) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(n));
  let debugKey: boolean | null = null;
  try {
    const { findCertificates } = await import("@/lib/crypto/keystore");
    const { certs } = await findCertificates(bytes);
    signed = certs.length > 0;
    debugKey = certs.some((c) => c.debug);
  } catch {
    // Unsigned or unreadable signature: leave debugKey unknown.
  }

  return {
    label: resolveLabel(app.attrs.label, table) || pkg.split(".").pop() || "App",
    packageName: pkg || "—",
    versionName: String(root.attrs.versionName ?? "—"),
    versionCode: String(root.attrs.versionCode ?? "—"),
    minSdk: num(sdk?.attrs.minSdkVersion),
    targetSdk: num(sdk?.attrs.targetSdkVersion),
    abis: [...new Set(names.map((n) => /^lib\/([^/]+)\/[^/]+\.so$/.exec(n)?.[1]).filter(Boolean) as string[])],
    debuggable: app.attrs.debuggable === true || app.attrs.debuggable === "true",
    testOnly: app.attrs.testOnly === true || app.attrs.testOnly === "true",
    split: root.attrs.split !== undefined && root.attrs.split !== "",
    debugKey,
    signed,
    icon: await loadIcon(bytes, names, app.attrs.icon ?? app.attrs.roundIcon, table).catch(() => null),
  };
}

const refId = (v: unknown) => (typeof v === "string" && /^@0x[0-9a-f]+$/i.test(v) ? parseInt(v.slice(3), 16) : null);

function resolveLabel(v: unknown, table: ResTable | null): string {
  const id = refId(v);
  if (id === null) return typeof v === "string" ? v : "";
  if (!table) return "";
  const vals = resolveDeep(table, id).filter((e) => e.value.type === "string");
  const pick = vals.find((e) => !e.language) ?? vals.find((e) => e.language === "en") ?? vals[0];
  return pick?.value.type === "string" ? pick.value.value : "";
}

// ---------- icon ----------

const unzipOne = (bytes: Uint8Array, name: string) => unzipSync(bytes, { filter: (f) => f.name === name })[name];

async function loadIcon(bytes: Uint8Array, names: string[], iconAttr: unknown, table: ResTable | null): Promise<string | null> {
  const id = refId(iconAttr);
  if (id !== null && table) {
    const entries = resolveDeep(table, id).filter((e) => e.value.type === "string");
    const paths = entries.map((e) => ({ density: e.density === 0xffff || e.density === 0xfffe ? 0 : e.density, path: (e.value as { value: string }).value }));
    // Prefer the sharpest bitmap; adaptive or vector XML only if there is no bitmap.
    const bitmaps = paths.filter((p) => BITMAP.test(p.path)).sort((a, b) => b.density - a.density);
    for (const b of bitmaps) {
      const img = await toImage(unzipOne(bytes, b.path));
      if (img) return draw((g) => g.drawImage(img, 0, 0, ICON, ICON));
    }
    for (const x of paths.filter((p) => p.path.endsWith(".xml"))) {
      const url = await drawXmlIcon(bytes, x.path, table);
      if (url) return url;
    }
  }
  // No resource table or nothing found: look for a launcher bitmap by its usual name.
  const guess = names
    .filter((n) => /^res\/(mipmap|drawable)-[^/]*\/ic_launcher(_round)?\.(png|webp)$/.test(n))
    .sort((a, b) => densityRank(b) - densityRank(a))[0];
  if (guess) {
    const img = await toImage(unzipOne(bytes, guess));
    if (img) return draw((g) => g.drawImage(img, 0, 0, ICON, ICON));
  }
  return null;
}

const densityRank = (n: string) => ["ldpi", "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].findIndex((d) => n.includes(`-${d}`));

async function toImage(data: Uint8Array | undefined): Promise<ImageBitmap | null> {
  if (!data) return null;
  try {
    return await createImageBitmap(new Blob([data.slice()]));
  } catch {
    return null;
  }
}

function draw(paint: (g: CanvasRenderingContext2D) => void | Promise<void>): string {
  const c = document.createElement("canvas");
  c.width = c.height = ICON;
  const g = c.getContext("2d")!;
  paint(g);
  return c.toDataURL("image/png");
}

const css = (argb: number) => `rgba(${(argb >>> 16) & 255},${(argb >>> 8) & 255},${argb & 255},${((argb >>> 24) & 255) / 255})`;

// A layer of an adaptive icon: a bitmap, a vector drawable or a plain colour.
type Layer = { kind: "image"; img: ImageBitmap } | { kind: "vector"; node: XmlNode } | { kind: "color"; argb: number } | null;

async function layerFrom(bytes: Uint8Array, ref: unknown, table: ResTable, depth = 0): Promise<Layer> {
  const id = refId(ref);
  if (id === null || depth > 3) return null;
  const entries = resolveDeep(table, id);
  const color = entries.find((e) => e.value.type === "color");
  if (color && color.value.type === "color") return { kind: "color", argb: color.value.argb };
  const files = entries
    .filter((e) => e.value.type === "string")
    .map((e) => ({ density: e.density >= 0xfffe ? 0 : e.density, path: (e.value as { value: string }).value }))
    .sort((a, b) => b.density - a.density);
  const bmp = files.find((f) => BITMAP.test(f.path));
  if (bmp) {
    const img = await toImage(unzipOne(bytes, bmp.path));
    if (img) return { kind: "image", img };
  }
  const xml = files.find((f) => f.path.endsWith(".xml"));
  const node = xml && parseAxml(unzipOne(bytes, xml.path) ?? new Uint8Array());
  if (node?.name === "vector") return { kind: "vector", node };
  if (node?.name === "inset" || node?.name === "bitmap") return layerFrom(bytes, node.attrs.drawable ?? node.attrs.src, table, depth + 1);
  return null;
}

export async function drawXmlIcon(bytes: Uint8Array, path: string, table: ResTable): Promise<string | null> {
  const node = parseAxml(unzipOne(bytes, path) ?? new Uint8Array());
  if (!node) return null;
  if (node.name === "vector") return draw((g) => drawVector(g, node, table, bytes, 0, 0, ICON));
  if (node.name !== "adaptive-icon") return null;
  const part = (n: string) => node.children.find((c) => c.name === n);
  const bg = await layerFrom(bytes, part("background")?.attrs.drawable, table);
  const fg = await layerFrom(bytes, part("foreground")?.attrs.drawable, table);
  if (!bg && !fg) return null;
  return draw((g) => {
    // Adaptive icons are 108dp with the visible area in the middle 72dp; show it as a rounded square.
    const r = ICON * 0.22;
    g.beginPath();
    g.roundRect(0, 0, ICON, ICON, r);
    g.clip();
    const full = ICON * 1.5; // 108 / 72
    const o = -(full - ICON) / 2;
    for (const layer of [bg ?? ({ kind: "color", argb: 0xffffffff } as Layer), fg]) {
      if (!layer) continue;
      if (layer.kind === "color") {
        g.fillStyle = css(layer.argb);
        g.fillRect(0, 0, ICON, ICON);
      } else if (layer.kind === "image") g.drawImage(layer.img, o, o, full, full);
      else drawVector(g, layer.node, table, bytes, o, o, full);
    }
  });
}

// Draws an Android VectorDrawable (paths, groups with transforms, solid fills and strokes).
function drawVector(g: CanvasRenderingContext2D, v: XmlNode, table: ResTable, bytes: Uint8Array, x: number, y: number, size: number) {
  const vw = Number(v.attrs.viewportWidth) || 24;
  const vh = Number(v.attrs.viewportHeight) || 24;
  g.save();
  g.translate(x, y);
  g.scale(size / vw, size / vh);
  const colorOf = (val: unknown): string | null => {
    if (typeof val === "number") return css(val >>> 0);
    const id = refId(val);
    if (id !== null) {
      const c = resolveDeep(table, id).find((e) => e.value.type === "color");
      if (c && c.value.type === "color") return css(c.value.argb);
    }
    if (typeof val === "string" && /^#[0-9a-f]{6,8}$/i.test(val)) {
      const h = val.slice(1);
      return h.length === 8 ? `#${h.slice(2)}${h.slice(0, 2)}` : val;
    }
    return null;
  };
  // A fill can also point to a <gradient> drawable.
  const color = (val: unknown): string | CanvasGradient | null => {
    const solid = colorOf(val);
    if (solid) return solid;
    const id = refId(val);
    const path = id !== null ? resolveDeep(table, id).find((e) => e.value.type === "string") : undefined;
    const gx = path?.value.type === "string" && path.value.value.endsWith(".xml") ? parseAxml(unzipOne(bytes, path.value.value) ?? new Uint8Array()) : null;
    if (gx?.name !== "gradient") return null;
    const a = gx.attrs;
    const n = (k: string) => Number(a[k]) || 0;
    const grad = Number(a.type) === 1 || a.type === "radial" ? g.createRadialGradient(n("centerX"), n("centerY"), 0, n("centerX"), n("centerY"), n("gradientRadius") || vw / 2) : g.createLinearGradient(n("startX"), n("startY"), n("endX"), n("endY"));
    const items = gx.children.filter((c) => c.name === "item");
    const stops: [number, string | null][] = items.length ? items.map((c) => [Number(c.attrs.offset) || 0, colorOf(c.attrs.color)]) : [[0, colorOf(a.startColor)], ...(a.centerColor !== undefined ? ([[0.5, colorOf(a.centerColor)]] as [number, string | null][]) : []), [1, colorOf(a.endColor)]];
    for (const [o, c] of stops) if (c) grad.addColorStop(Math.min(1, Math.max(0, o)), c);
    return grad;
  };
  const walk = (n: XmlNode) => {
    for (const c of n.children) {
      if (c.name === "group") {
        g.save();
        const a = c.attrs;
        const px = Number(a.pivotX) || 0;
        const py = Number(a.pivotY) || 0;
        g.translate((Number(a.translateX) || 0) + px, (Number(a.translateY) || 0) + py);
        if (a.rotation) g.rotate((Number(a.rotation) * Math.PI) / 180);
        g.scale(a.scaleX !== undefined ? Number(a.scaleX) : 1, a.scaleY !== undefined ? Number(a.scaleY) : 1);
        g.translate(-px, -py);
        walk(c);
        g.restore();
      } else if (c.name === "path" && typeof c.attrs.pathData === "string") {
        let p: Path2D;
        try {
          p = new Path2D(c.attrs.pathData);
        } catch {
          continue;
        }
        const fill = color(c.attrs.fillColor);
        if (fill) {
          g.globalAlpha = c.attrs.fillAlpha !== undefined ? Number(c.attrs.fillAlpha) : 1;
          g.fillStyle = fill;
          g.fill(p, c.attrs.fillType === 1 || c.attrs.fillType === "evenOdd" ? "evenodd" : "nonzero");
        }
        const stroke = color(c.attrs.strokeColor);
        if (stroke && Number(c.attrs.strokeWidth)) {
          g.globalAlpha = c.attrs.strokeAlpha !== undefined ? Number(c.attrs.strokeAlpha) : 1;
          g.strokeStyle = stroke;
          g.lineWidth = Number(c.attrs.strokeWidth);
          g.stroke(p);
        }
        g.globalAlpha = 1;
      }
    }
  };
  walk(v);
  g.restore();
}
