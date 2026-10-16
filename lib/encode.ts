// Encoding and hashing helpers for the Encode & Hash tool. Everything runs in the browser.

import { md5 } from "@/lib/crypto/md5";

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8", { fatal: true });

export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function bytesToBase64(b: Uint8Array, urlSafe = false) {
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  const out = btoa(s);
  return urlSafe ? out.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : out;
}

// Accepts normal and URL-safe Base64, with or without padding, spaces and line breaks, or a data: URL.
export function base64ToBytes(text: string): Uint8Array {
  let s = text.trim().replace(/^data:[^,]*;base64,/i, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error("This isn't valid Base64: it has characters Base64 doesn't use.");
  s = s.replace(/=+$/, "");
  if (s.length % 4 === 1) throw new Error("This isn't valid Base64: its length is wrong (a character may be missing).");
  s += "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export const textToBase64 = (t: string, urlSafe = false) => bytesToBase64(enc.encode(t), urlSafe);

// Decoded bytes as text if they are valid UTF-8, otherwise null (binary data such as an image).
export function bytesToText(b: Uint8Array): string | null {
  try {
    const s = dec.decode(b);
    return /[\x00-\x08\x0e-\x1f]/.test(s) ? null : s;
  } catch {
    return null;
  }
}

// Recognise common file types from their first bytes.
export function sniff(b: Uint8Array): { mime: string; ext: string; label: string } | null {
  const h = (...xs: number[]) => xs.every((x, i) => b[i] === x);
  if (h(0x89, 0x50, 0x4e, 0x47)) return { mime: "image/png", ext: "png", label: "PNG image" };
  if (h(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", ext: "jpg", label: "JPEG image" };
  if (h(0x47, 0x49, 0x46, 0x38)) return { mime: "image/gif", ext: "gif", label: "GIF image" };
  if (h(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45) return { mime: "image/webp", ext: "webp", label: "WebP image" };
  if (h(0x25, 0x50, 0x44, 0x46)) return { mime: "application/pdf", ext: "pdf", label: "PDF document" };
  if (h(0x50, 0x4b, 0x03, 0x04)) return { mime: "application/zip", ext: "zip", label: "ZIP archive (or APK / JAR)" };
  if (h(0x1f, 0x8b)) return { mime: "application/gzip", ext: "gz", label: "Gzip file" };
  return null;
}

// URL encoding. "component" encodes everything except letters, digits and - _ . ! ~ * ' ( ),
// "full" keeps a whole URL working (leaves : / ? & = # alone).
export function urlEncode(t: string, mode: "component" | "full") {
  return mode === "component" ? encodeURIComponent(t) : encodeURI(t);
}

export function urlDecode(t: string, plusAsSpace: boolean) {
  const s = plusAsSpace ? t.replace(/\+/g, " ") : t;
  try {
    return decodeURIComponent(s);
  } catch {
    throw new Error("This has a broken % code (like %G1 or a % with nothing after it).");
  }
}

// The parts of a URL and its query parameters, decoded.
export function urlParts(t: string): { parts: [string, string][]; params: [string, string][] } | null {
  let u: URL;
  try {
    u = new URL(t.trim());
  } catch {
    return null;
  }
  const parts: [string, string][] = [
    ["Protocol", u.protocol.replace(/:$/, "")],
    ["Host", u.host],
    ["Path", decodeURIComponent(u.pathname)],
  ];
  if (u.hash) parts.push(["Fragment", decodeURIComponent(u.hash.slice(1))]);
  return { parts, params: [...u.searchParams.entries()] };
}

export type HashAlgo = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export const HASHES: HashAlgo[] = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];

export async function hashBytes(b: Uint8Array, algo: HashAlgo): Promise<Uint8Array> {
  if (algo === "MD5") return md5(b);
  return new Uint8Array(await crypto.subtle.digest(algo, b.slice()));
}

export type HmacAlgo = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
export const HMACS: HmacAlgo[] = ["SHA-256", "SHA-1", "SHA-384", "SHA-512"];

export async function hmac(message: Uint8Array, key: Uint8Array, algo: HmacAlgo): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", key.length ? key.slice() : new Uint8Array(1).subarray(0, 0), { name: "HMAC", hash: algo }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, message.slice()));
}

export const utf8 = (t: string) => enc.encode(t);

// Parse a key typed as text, hex or Base64.
export function keyBytes(t: string, as: "text" | "hex" | "base64"): Uint8Array {
  if (as === "text") return enc.encode(t);
  if (as === "base64") return base64ToBytes(t);
  const h = t.replace(/\s+/g, "").replace(/^0x/i, "");
  if (!/^([0-9a-f]{2})*$/i.test(h)) throw new Error("The key isn't valid hex (use pairs of 0-9 and a-f).");
  return new Uint8Array(h.match(/../g)?.map((x) => parseInt(x, 16)) ?? []);
}
