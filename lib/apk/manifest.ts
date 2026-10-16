// Turns an APK or AndroidManifest.xml (binary from an APK, or plain text from source code)
// into a simple summary that two versions can be compared on.

import { unzipSync } from "fflate";
import { parseAxml, findAll, type XmlNode } from "./axml";
import { findCertificates } from "../crypto/keystore";

export type Component = { kind: string; name: string; exported: boolean; permission?: string };
export type ManifestSummary = {
  fileName: string;
  source: "APK" | "Binary manifest" | "Source manifest";
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk?: number;
  targetSdk?: number;
  permissions: string[];
  features: string[];
  components: Component[];
  flags: Record<string, string>;
  signer?: { subject: string; sha256: string };
};

const KINDS = ["activity", "activity-alias", "service", "receiver", "provider"];

// Plain-text XML (from Android Studio) → the same node shape as the binary reader.
function textXml(text: string): XmlNode | null {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) return null;
  const walk = (el: Element): XmlNode => {
    const attrs: XmlNode["attrs"] = {};
    for (const a of Array.from(el.attributes)) {
      if (a.name.startsWith("xmlns")) continue;
      const key = a.name.replace(/^android:/, "");
      if (key.includes(":")) continue; // tools:… and other namespaces
      attrs[key] = a.value === "true" ? true : a.value === "false" ? false : a.value;
    }
    return { name: el.tagName, attrs, children: Array.from(el.children).map(walk) };
  };
  return walk(doc.documentElement);
}

const bool = (v: unknown) => v === true || v === "true";

export function summarize(root: XmlNode, fileName: string, source: ManifestSummary["source"]): ManifestSummary {
  const pkg = String(root.attrs.package ?? "");
  const app = findAll(root, "application")[0] ?? { name: "application", attrs: {}, children: [] };
  const sdk = findAll(root, "uses-sdk")[0];
  const minSdk = sdk?.attrs.minSdkVersion !== undefined ? Number(sdk.attrs.minSdkVersion) : undefined;
  const targetSdk = sdk?.attrs.targetSdkVersion !== undefined ? Number(sdk.attrs.targetSdkVersion) : minSdk;
  const full = (n: string) => (n.startsWith(".") ? pkg + n : n.includes(".") || !pkg ? n : `${pkg}.${n}`);

  const components: Component[] = [];
  for (const kind of KINDS)
    for (const c of findAll(app, kind)) {
      const hasFilter = c.children.some((k) => k.name === "intent-filter");
      const exported = c.attrs.exported === undefined ? (kind === "provider" ? (targetSdk ?? 99) < 17 : hasFilter) : bool(c.attrs.exported);
      components.push({ kind: kind === "activity-alias" ? "activity" : kind, name: full(String(c.attrs.name ?? "?")), exported, permission: c.attrs.permission ? String(c.attrs.permission) : undefined });
    }

  const flag = (v: unknown, unset: string) => (v === undefined ? unset : String(v));
  return {
    fileName,
    source,
    packageName: pkg || "—",
    versionName: String(root.attrs.versionName ?? "—"),
    versionCode: String(root.attrs.versionCode ?? "—"),
    minSdk: Number.isFinite(minSdk) ? minSdk : undefined,
    targetSdk: Number.isFinite(targetSdk) ? targetSdk : undefined,
    permissions: [...new Set(findAll(root, "uses-permission").concat(findAll(root, "uses-permission-sdk-23")).map((n) => String(n.attrs.name ?? "")).filter(Boolean))].sort(),
    features: [...new Set(findAll(root, "uses-feature").map((n) => String(n.attrs.name ?? "")).filter(Boolean))].sort(),
    components,
    flags: {
      debuggable: flag(app.attrs.debuggable, "false"),
      allowBackup: flag(app.attrs.allowBackup, "not set"),
      usesCleartextTraffic: flag(app.attrs.usesCleartextTraffic, "not set"),
      networkSecurityConfig: app.attrs.networkSecurityConfig !== undefined ? "set" : "not set",
    },
  };
}

export async function readManifest(file: File): Promise<ManifestSummary> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const files = unzipSync(bytes, { filter: (f) => f.name === "AndroidManifest.xml" });
    const m = files["AndroidManifest.xml"];
    if (!m) throw new Error(`${file.name}: no AndroidManifest.xml inside. Is this an APK?`);
    const root = parseAxml(m);
    if (!root) throw new Error(`${file.name}: couldn't read its manifest.`);
    const s = summarize(root, file.name, "APK");
    try {
      const { certs } = await findCertificates(bytes);
      if (certs[0]) s.signer = { subject: certs[0].subject, sha256: certs[0].sha256 };
    } catch {}
    return s;
  }
  if (bytes[0] === 0x03 && bytes[1] === 0x00) {
    const root = parseAxml(bytes);
    if (!root) throw new Error(`${file.name}: couldn't read this binary manifest.`);
    return summarize(root, file.name, "Binary manifest");
  }
  const root = textXml(new TextDecoder().decode(bytes));
  if (!root || root.name !== "manifest") throw new Error(`${file.name}: drop an .apk or an AndroidManifest.xml.`);
  return summarize(root, file.name, "Source manifest");
}

// ---------- comparing ----------
export type Change<T = string> = { item: T; status: "added" | "removed" | "changed" | "same"; before?: string; after?: string };
export type ManifestDiff = {
  info: Change[];
  flags: Change[];
  permissions: Change[];
  features: Change[];
  components: Change<Component>[];
  signerChanged: boolean | null;
};

const SDK = (n?: number) => (n === undefined ? "—" : String(n));

function setDiff(a: string[], b: string[]): Change[] {
  const A = new Set(a);
  const B = new Set(b);
  return [...new Set([...a, ...b])].sort().map((item) => ({ item, status: A.has(item) && B.has(item) ? "same" : B.has(item) ? "added" : "removed" }));
}

export function diffManifests(a: ManifestSummary, b: ManifestSummary): ManifestDiff {
  const pair = (item: string, x: string, y: string): Change => ({ item, status: x === y ? "same" : "changed", before: x, after: y });
  const info = [
    pair("Package", a.packageName, b.packageName),
    pair("Version name", a.versionName, b.versionName),
    pair("Version code", a.versionCode, b.versionCode),
    pair("Min SDK", SDK(a.minSdk), SDK(b.minSdk)),
    pair("Target SDK", SDK(a.targetSdk), SDK(b.targetSdk)),
  ];
  const flags = Object.keys({ ...a.flags, ...b.flags }).map((k) => pair(k, a.flags[k] ?? "—", b.flags[k] ?? "—"));

  const key = (c: Component) => `${c.kind}:${c.name}`;
  const A = new Map(a.components.map((c) => [key(c), c]));
  const B = new Map(b.components.map((c) => [key(c), c]));
  const components: Change<Component>[] = [...new Set([...A.keys(), ...B.keys()])].sort().map((k) => {
    const x = A.get(k);
    const y = B.get(k);
    if (!x) return { item: y!, status: "added" };
    if (!y) return { item: x, status: "removed" };
    const desc = (c: Component) => (c.exported ? (c.permission ? `exported, needs ${c.permission.split(".").pop()}` : "exported") : "not exported");
    return { item: y, status: desc(x) === desc(y) ? "same" : "changed", before: desc(x), after: desc(y) };
  });

  return {
    info,
    flags,
    permissions: setDiff(a.permissions, b.permissions),
    features: setDiff(a.features, b.features),
    components,
    signerChanged: a.signer && b.signer ? a.signer.sha256 !== b.signer.sha256 : null,
  };
}
