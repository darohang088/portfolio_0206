// Shared bits for Build Share: the uploader page (/share) and the tester page (/i/<id>).

import type { AppInfo } from "@/lib/apk/appInfo";

export const MAX_APK = 95 * 1024 * 1024; // keep in sync with worker/builds.ts
export const EXPIRY_DAYS = [1, 3, 7] as const;

export type Build = Omit<AppInfo, "icon"> & {
  id: string;
  fileName: string;
  size: number;
  icon: string | null;
  note: string;
  created: number;
  expires: number;
  downloads: number;
  ready?: boolean;
};

// API level → Android version shown to people.
const ANDROID: Record<number, string> = { 21: "5.0", 22: "5.1", 23: "6", 24: "7", 25: "7.1", 26: "8", 27: "8.1", 28: "9", 29: "10", 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15", 36: "16" };
export const androidVersion = (sdk?: number) => (sdk === undefined ? null : (ANDROID[sdk] ?? (sdk < 21 ? "4.x" : `API ${sdk}`)));

export const mb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${+(n / 1024 ** 3).toFixed(1)} GB`);

const CPU: Record<string, string> = { "arm64-v8a": "64-bit ARM", "armeabi-v7a": "32-bit ARM", x86_64: "x86_64 (emulator)", x86: "x86 (emulator)", armeabi: "old ARM" };
export const cpuName = (abi: string) => CPU[abi] ?? abi;

export type Warning = { level: "high" | "medium" | "info"; title: string; detail: string };

// Things that make testers see "App not installed", or that they should know.
export function warningsFor(b: Pick<AppInfo, "testOnly" | "split" | "signed" | "abis" | "debuggable" | "debugKey">): Warning[] {
  const w: Warning[] = [];
  if (b.testOnly)
    w.push({ level: "high", title: "Marked as test-only", detail: "Phones refuse to install it from a file (\"App not installed\"). Build it with Build → Build APK(s) or flutter build apk instead of the Run button's APK." });
  if (b.split) w.push({ level: "high", title: "This is a split APK", detail: "It's only one piece of the app and won't install alone. Build a universal APK instead." });
  if (!b.signed) w.push({ level: "high", title: "Not signed", detail: "Android won't install an unsigned APK. Sign it with your debug or release key." });
  const arm = b.abis.filter((a) => a.startsWith("arm"));
  if (b.abis.length && !b.abis.includes("arm64-v8a")) w.push({ level: "medium", title: "No 64-bit ARM code", detail: "Most phones today are 64-bit ARM. This build may not install or run on them." });
  else if (arm.length === 1 && arm[0] === "arm64-v8a")
    w.push({ level: "info", title: "64-bit phones only", detail: "Works on almost every phone from the last 7 years. Very old 32-bit phones will say \"App not installed\"." });
  if (b.debugKey) w.push({ level: "info", title: "Signed with the debug key", detail: "Fine for testing. Testers who have a Play Store version installed must uninstall it first, because the signatures differ." });
  else if (b.debuggable) w.push({ level: "info", title: "Debug build", detail: "Fine for testing, but it runs slower than a release build." });
  return w;
}

export const SECRET_KEY = "build-share-secret";

export async function api<T>(path: string, secret: string | null, init: RequestInit = {}): Promise<{ status: number; data: T & { ok: boolean; error?: string } }> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(secret ? { authorization: `Bearer ${secret}` } : {}), ...(init.body ? { "content-type": "application/json" } : {}) },
  });
  let data: T & { ok: boolean; error?: string };
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: "The server didn't answer properly." } as T & { ok: boolean; error?: string };
  }
  return { status: res.status, data };
}

// Upload with progress (fetch can't report upload progress, XMLHttpRequest can).
export function uploadApk(id: string, file: File, secret: string, onProgress: (sent: number) => void): Promise<{ ok: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open("PUT", `/api/builds/${id}/apk`);
    x.setRequestHeader("authorization", `Bearer ${secret}`);
    x.setRequestHeader("content-type", "application/vnd.android.package-archive");
    x.upload.onprogress = (e) => onProgress(e.loaded);
    x.onload = () => {
      try {
        resolve(JSON.parse(x.responseText));
      } catch {
        resolve({ ok: false, error: `Upload failed (${x.status}).` });
      }
    };
    x.onerror = () => resolve({ ok: false, error: "The connection dropped during the upload. Try again." });
    x.send(file);
  });
}

// "in 2 days", "in 5 hours"
export function timeLeft(expires: number, now = Date.now()): { n: number; unit: "day" | "hour" | "minute" } {
  const ms = Math.max(0, expires - now);
  if (ms >= 36 * 3600_000) return { n: Math.round(ms / 86400_000), unit: "day" };
  if (ms >= 3600_000) return { n: Math.round(ms / 3600_000), unit: "hour" };
  return { n: Math.max(1, Math.round(ms / 60_000)), unit: "minute" };
}
