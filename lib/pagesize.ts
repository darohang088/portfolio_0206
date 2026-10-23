// 16 KB page size checker. Does the same two checks as Google's check_elf_alignment.sh and
// `zipalign -c -P 16`:
//  1. ELF: every LOAD segment of each 64-bit native library (arm64-v8a, x86_64) is aligned to 16 KB or more.
//  2. Zip: native libraries stored uncompressed in an APK start at a 16 KB boundary in the file,
//     so Android can map them straight from the APK.
// Reads APK, AAB, split-APK bundles (.apks / .xapk) and single .so files, all in the browser.

import { inflateSync } from "fflate";

export const PAGE_16K = 16384;

type ZipEntry = { name: string; method: number; compSize: number; size: number; localOffset: number };

export type LibResult = {
  path: string; // where it is, e.g. "lib/arm64-v8a/libflutter.so" (or "split.apk › lib/...")
  name: string;
  abi: string; // from the ELF header, e.g. arm64-v8a
  is64: boolean;
  size: number;
  compressed: boolean;
  elfAlign: number | null; // smallest LOAD segment alignment, null if not a readable ELF file
  elfOk: boolean;
  zipOffset: number | null; // where the file's data starts inside the APK (uncompressed only)
  zipOk: boolean | null; // null when it doesn't apply (compressed, AAB, single .so)
  hint: string | null;
};

export type PageSizeReport = {
  kind: "apk" | "aab" | "apks" | "so";
  fileName: string;
  libs: LibResult[];
  needed: LibResult[]; // 64-bit libraries, the ones Google checks
  elfFail: LibResult[];
  zipFail: LibResult[];
  verdict: "pass" | "fail" | "no-native";
};

// ---------- zip ----------
const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u64 = (b: Uint8Array, o: number) => u32(b, o) + u32(b, o + 4) * 2 ** 32;

function zipEntries(b: Uint8Array): ZipEntry[] {
  // End of central directory: search backwards (it can be followed by a comment of up to 64 KB).
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 0xffff); i--)
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 0x05 && b[i + 3] === 0x06) {
      eocd = i;
      break;
    }
  if (eocd < 0) throw new Error("not-zip");
  let count = u16(b, eocd + 10);
  let cdOffset = u32(b, eocd + 16);
  // ZIP64: the real values are in the ZIP64 end record, found through the locator just before.
  if ((cdOffset === 0xffffffff || count === 0xffff) && eocd >= 20 && u32(b, eocd - 20) === 0x07064b50) {
    const z64 = Number(u64(b, eocd - 12));
    if (u32(b, z64) === 0x06064b50) {
      count = Number(u64(b, z64 + 32));
      cdOffset = Number(u64(b, z64 + 48));
    }
  }
  const out: ZipEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < count && p + 46 <= b.length && u32(b, p) === 0x02014b50; i++) {
    const nameLen = u16(b, p + 28);
    const extraLen = u16(b, p + 30);
    const commentLen = u16(b, p + 32);
    let compSize = u32(b, p + 20);
    let size = u32(b, p + 24);
    let localOffset = u32(b, p + 42);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    // ZIP64 extra field (id 1) holds the 64-bit sizes/offset when the 32-bit ones are 0xFFFFFFFF.
    let e = p + 46 + nameLen;
    const end = e + extraLen;
    while (e + 4 <= end) {
      const id = u16(b, e);
      const len = u16(b, e + 2);
      if (id === 1) {
        let q = e + 4;
        if (size === 0xffffffff) (size = u64(b, q)), (q += 8);
        if (compSize === 0xffffffff) (compSize = u64(b, q)), (q += 8);
        if (localOffset === 0xffffffff) localOffset = u64(b, q);
      }
      e += 4 + len;
    }
    out.push({ name, method: u16(b, p + 10), compSize, size, localOffset });
    p = end + commentLen;
  }
  return out;
}

// Where an entry's data really starts: after its LOCAL header, whose extra field can differ from the
// central directory's (zipalign pads exactly there).
const dataOffset = (b: Uint8Array, e: ZipEntry) => e.localOffset + 30 + u16(b, e.localOffset + 26) + u16(b, e.localOffset + 28);

function entryData(b: Uint8Array, e: ZipEntry): Uint8Array {
  const start = dataOffset(b, e);
  const raw = b.subarray(start, start + e.compSize);
  if (e.method === 0) return raw;
  if (e.method === 8) return inflateSync(raw, { out: new Uint8Array(e.size) });
  throw new Error("unsupported-compression");
}

// ---------- ELF ----------
const MACHINE: Record<number, { abi: string; is64: boolean }> = {
  0xb7: { abi: "arm64-v8a", is64: true },
  0x3e: { abi: "x86_64", is64: true },
  0x28: { abi: "armeabi-v7a", is64: false },
  0x03: { abi: "x86", is64: false },
  0xf3: { abi: "riscv64", is64: true },
};

export type ElfInfo = { abi: string; is64: boolean; loadAligns: number[] };

export function readElf(b: Uint8Array): ElfInfo | null {
  if (b.length < 52 || b[0] !== 0x7f || b[1] !== 0x45 || b[2] !== 0x4c || b[3] !== 0x46) return null;
  const is64 = b[4] === 2;
  const le = b[5] !== 2;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const r16 = (o: number) => v.getUint16(o, le);
  const r32 = (o: number) => v.getUint32(o, le);
  const r64 = (o: number) => Number(v.getBigUint64(o, le));
  const machine = r16(18);
  const phoff = is64 ? r64(32) : r32(28);
  const phentsize = r16(is64 ? 54 : 42);
  const phnum = r16(is64 ? 56 : 44);
  const loadAligns: number[] = [];
  for (let i = 0; i < phnum; i++) {
    const o = phoff + i * phentsize;
    if (o + (is64 ? 56 : 32) > b.length) break;
    if (r32(o) !== 1) continue; // PT_LOAD
    loadAligns.push(is64 ? r64(o + 48) : r32(o + 28));
  }
  const m = MACHINE[machine] ?? { abi: `machine ${machine}`, is64 };
  return { abi: m.abi, is64: m.is64, loadAligns };
}

// ---------- where a library usually comes from ----------
const HINTS: [RegExp, string][] = [
  [/^libflutter\.so$/, "Flutter engine: update Flutter to the latest stable version."],
  [/^libapp\.so$/, "Your Dart code, compiled by Flutter: rebuild with the latest stable Flutter."],
  [/^libc\+\+_shared\.so$/, "C++ runtime from the Android NDK: build with NDK r28 or newer (r27 needs a linker flag)."],
  [/^lib(hermes|hermestooling|reactnative|reactnativejni|jsi|fbjni|folly_runtime|yoga|turbomodulejsijni|react_.*)\.so$/, "React Native: update React Native to a version with 16 KB support (0.77 or newer)."],
  [/^libjsc\.so$/, "JavaScriptCore for React Native: switch to Hermes or update the JSC package."],
  [/^lib(sqlcipher|sqlcipher_android)\.so$/, "SQLCipher: update net.zetetic:sqlcipher-android to the latest version."],
  [/^libsentry(-android)?\.so$/, "Sentry SDK: update the Sentry Android / Flutter package."],
  [/^libcrashlytics.*\.so$/, "Firebase Crashlytics NDK: update the Firebase BoM."],
  [/^libbarhopper.*\.so$/, "Google ML Kit barcode scanning: update the ML Kit dependency."],
  [/^libimage_processing_util_jni\.so$/, "CameraX: update androidx.camera to the latest version."],
  [/^libtensorflowlite.*\.so$/, "TensorFlow Lite / LiteRT: update to the latest version."],
  [/^libmmkv\.so$/, "MMKV: update com.tencent:mmkv to the latest version."],
  [/^libpl_droidsonroids_gif\.so$/, "android-gif-drawable: update to the latest version."],
  [/^libconceal\.so|^libimagepipeline\.so|^libnative-imagetranscoder\.so|^libstatic-webp\.so/, "Fresco (image loading): update Fresco to the latest version."],
  [/^librealm-jni\.so$/, "Realm: update the Realm SDK."],
  [/^libdatastore_shared_counter\.so$/, "AndroidX DataStore: update androidx.datastore to the latest version."],
  [/^libsurface_util_jni\.so$/, "CameraX: update androidx.camera to the latest version."],
];
const hintFor = (name: string) => HINTS.find(([re]) => re.test(name))?.[1] ?? null;

// ---------- the check ----------
function checkLib(path: string, data: Uint8Array, size: number, compressed: boolean, zipOffset: number | null): LibResult {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const elf = readElf(data);
  const folderAbi = /lib\/([^/]+)\//.exec(path)?.[1] ?? "?";
  const elfAlign = elf && elf.loadAligns.length ? Math.min(...elf.loadAligns) : null;
  const is64 = elf ? elf.is64 : /64/.test(folderAbi);
  return {
    path,
    name,
    abi: elf?.abi ?? folderAbi,
    is64,
    size,
    compressed,
    elfAlign,
    elfOk: elfAlign !== null && elfAlign >= PAGE_16K,
    zipOffset,
    zipOk: zipOffset === null ? null : zipOffset % PAGE_16K === 0,
    hint: hintFor(name),
  };
}

function scanZip(b: Uint8Array, prefix: string, zipAligned: boolean, out: LibResult[], nested: (name: string, data: Uint8Array) => void) {
  for (const e of zipEntries(b)) {
    if (e.name.endsWith("/")) continue;
    if (/\.so$/.test(e.name) && /(^|\/)lib\/[^/]+\/[^/]+\.so$/.test(e.name)) {
      const stored = e.method === 0;
      out.push(checkLib(prefix + e.name, entryData(b, e), e.size, !stored, zipAligned && stored ? dataOffset(b, e) : null));
    } else if (/\.apk$/i.test(e.name)) nested(e.name, entryData(b, e));
  }
}

export async function checkPageSize(file: File): Promise<PageSizeReport> {
  const b = new Uint8Array(await file.arrayBuffer());
  const libs: LibResult[] = [];
  let kind: PageSizeReport["kind"];

  if (b[0] === 0x7f && b[1] === 0x45 && b[2] === 0x4c && b[3] === 0x46) {
    kind = "so";
    libs.push(checkLib(file.name, b, b.length, false, null));
  } else {
    if (!(b[0] === 0x50 && b[1] === 0x4b)) throw new Error("not-supported");
    const names = zipEntries(b).map((e) => e.name);
    const isAab = names.includes("BundleConfig.pb") || names.some((n) => /^base\/manifest\/AndroidManifest\.xml$/.test(n));
    const isApk = names.includes("AndroidManifest.xml");
    const hasApks = names.some((n) => /\.apk$/i.test(n));
    kind = isAab ? "aab" : isApk ? "apk" : hasApks ? "apks" : "apk";
    // An AAB isn't installed as-is: Google Play builds (and aligns) the APKs, so only the ELF check applies.
    scanZip(b, "", !isAab, libs, (name, data) => {
      scanZip(data, `${name} › `, true, libs, () => {});
    });
    if (!isAab && !isApk && !hasApks) throw new Error("not-supported");
  }

  const needed = libs.filter((l) => l.is64);
  const elfFail = needed.filter((l) => !l.elfOk);
  const zipFail = needed.filter((l) => l.zipOk === false);
  return {
    kind,
    fileName: file.name,
    libs,
    needed,
    elfFail,
    zipFail,
    verdict: needed.length === 0 ? "no-native" : elfFail.length || zipFail.length ? "fail" : "pass",
  };
}

export const alignText = (n: number | null) => (n === null ? "not ELF" : n >= 1024 ? `${n / 1024} KB` : `${n} B`);
