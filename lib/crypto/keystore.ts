// Finds signing certificates in whatever the user drops: a keystore (JKS / PKCS#12),
// an APK, a PKCS#7 signature file (META-INF/*.RSA) or a PEM/DER certificate.
// Everything happens in the browser; private keys are never decrypted or read.

import { unzipSync } from "fflate";
import { parseDer, content, whole, oid, str, type Asn1 } from "./asn1";
import { readCert, type CertInfo } from "./x509";

export class NeedPassword extends Error {
  constructor(msg = "This keystore is password protected. Enter the store password.") {
    super(msg);
  }
}

type Found = { der: Uint8Array; source: string; alias?: string };

const OID_DATA = "1.2.840.113549.1.7.1";
const OID_SIGNED = "1.2.840.113549.1.7.2";
const OID_ENCRYPTED = "1.2.840.113549.1.7.6";
const OID_CERTBAG = "1.2.840.113549.1.12.10.1.3";
const OID_X509 = "1.2.840.113549.1.9.22.1";
const OID_FRIENDLY = "1.2.840.113549.1.9.20";
const OID_PBES2 = "1.2.840.113549.1.5.13";
const OID_PBKDF2 = "1.2.840.113549.1.5.12";
const OID_RC2_40 = "1.2.840.113549.1.12.1.6";
const OID_3DES = "1.2.840.113549.1.12.1.3";
const PRF: Record<string, string> = { "1.2.840.113549.2.7": "SHA-1", "1.2.840.113549.2.9": "SHA-256", "1.2.840.113549.2.10": "SHA-384", "1.2.840.113549.2.11": "SHA-512" };
const AES: Record<string, number> = { "2.16.840.1.101.3.4.1.2": 16, "2.16.840.1.101.3.4.1.22": 24, "2.16.840.1.101.3.4.1.42": 32 };

// ---------- PKCS#7 (.RSA / .DSA / .EC signature files, .p7b) ----------
function pkcs7Certs(root: Asn1, source: string): Found[] {
  const signed = root.children[1]?.children[0]; // [0] EXPLICIT SignedData
  if (!signed) return [];
  const certs = signed.children.find((c) => c.tag === 0xa0);
  return (certs?.children ?? []).map((c) => ({ der: whole(c), source }));
}

// ---------- JKS / JCEKS ----------
function jksCerts(b: Uint8Array): Found[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const out: Found[] = [];
  let p = 8;
  const count = dv.getUint32(p);
  p += 4;
  const utf = () => {
    const n = dv.getUint16(p);
    const s = new TextDecoder().decode(b.subarray(p + 2, p + 2 + n));
    p += 2 + n;
    return s;
  };
  const cert = (alias: string) => {
    utf(); // "X.509"
    const n = dv.getUint32(p);
    out.push({ der: b.subarray(p + 4, p + 4 + n), source: "Keystore (JKS)", alias });
    p += 4 + n;
  };
  for (let e = 0; e < count; e++) {
    const tag = dv.getUint32(p);
    p += 4;
    const alias = utf();
    p += 8; // timestamp
    if (tag === 1) {
      p += 4 + dv.getUint32(p); // encrypted private key: skipped, never read
      const chain = dv.getUint32(p);
      p += 4;
      for (let k = 0; k < chain; k++) cert(k === 0 ? alias : `${alias} (chain ${k + 1})`);
    } else if (tag === 2) cert(alias);
    else break; // JCEKS secret keys: nothing to show
  }
  return out;
}

// ---------- PKCS#12 ----------
async function pbkdf2(password: string, salt: Uint8Array, iter: number, hash: string, bytes: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: new Uint8Array(salt), iterations: iter, hash }, key, bytes * 8));
}

// RFC 7292 appendix B key derivation (SHA-1), for the legacy PKCS#12 ciphers.
async function p12kdf(password: string, salt: Uint8Array, iter: number, id: number, size: number) {
  const pw = new Uint8Array(password.length * 2 + 2);
  for (let i = 0; i < password.length; i++) {
    pw[i * 2] = password.charCodeAt(i) >> 8;
    pw[i * 2 + 1] = password.charCodeAt(i) & 0xff;
  }
  const v = 64;
  const fill = (src: Uint8Array) => {
    const n = src.length ? v * Math.ceil(src.length / v) : 0;
    const o = new Uint8Array(n);
    for (let i = 0; i < n; i++) o[i] = src[i % src.length];
    return o;
  };
  const I = new Uint8Array([...fill(salt), ...fill(pw)]);
  const D = new Uint8Array(v).fill(id);
  const out = new Uint8Array(size);
  let done = 0;
  while (done < size) {
    let A = new Uint8Array(await crypto.subtle.digest("SHA-1", new Uint8Array([...D, ...I])));
    for (let r = 1; r < iter; r++) A = new Uint8Array(await crypto.subtle.digest("SHA-1", A));
    out.set(A.subarray(0, Math.min(A.length, size - done)), done);
    done += A.length;
    if (done >= size) break;
    const B = fill(A);
    for (let j = 0; j < I.length; j += v) {
      let carry = 1;
      for (let k = v - 1; k >= 0; k--) {
        const x = I[j + k] + B[k] + carry;
        I[j + k] = x & 0xff;
        carry = x >> 8;
      }
    }
  }
  return out;
}

// RC2-CBC decryption (RFC 2268), used by older keystores for the certificate bag.
const PI = new Uint8Array([
  217, 120, 249, 196, 25, 221, 181, 237, 40, 233, 253, 121, 74, 160, 216, 157, 198, 126, 55, 131, 43, 118, 83, 142, 98, 76, 100, 136, 68, 139, 251, 162, 23, 154, 89, 245, 135, 179, 79, 19, 97, 69, 109, 141, 9, 129, 125, 50, 189, 143, 64, 235, 134, 183, 123, 11, 240, 149, 33, 34, 92, 107, 78, 130, 84, 214, 101, 147, 206, 96, 178, 28, 115, 86, 192, 20, 167, 140, 241, 220, 18, 117, 202, 31, 59, 190, 228, 209, 66, 61, 212, 48, 163, 60, 182, 38, 111, 191, 14, 218, 70, 105, 7, 87, 39, 242, 29, 155, 188, 148, 67, 3, 248, 17, 199, 246, 144, 239, 62, 231, 6, 195, 213, 47, 200, 102, 30, 215, 8, 232, 234, 222, 128, 82, 238, 247, 132, 170, 114, 172, 53, 77, 106, 42, 150, 26, 210, 113, 90, 21, 73, 116, 75, 159, 208, 94, 4, 24, 164, 236, 194, 224, 65, 110, 15, 81, 203, 204, 36, 145, 175, 80, 161, 244, 112, 57, 153, 124, 58, 133, 35, 184, 180, 122, 252, 2, 54, 91, 37, 85, 151, 49, 45, 93, 250, 152, 227, 138, 146, 174, 5, 223, 41, 16, 103, 108, 186, 201, 211, 0, 230, 207, 225, 158, 168, 44, 99, 22, 1, 63, 88, 226, 137, 169, 13, 56, 52, 27, 171, 51, 255, 176, 187, 72, 12, 95, 185, 177, 205, 46, 197, 243, 219, 71, 229, 165, 156, 119, 10, 166, 32, 104, 254, 127, 193, 173,
]);

function rc2Decrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array, bits: number) {
  const L = new Uint8Array(128);
  L.set(key);
  const T = key.length;
  for (let i = T; i < 128; i++) L[i] = PI[(L[i - 1] + L[i - T]) & 0xff];
  const T8 = Math.ceil(bits / 8);
  const TM = 0xff % 2 ** (8 + bits - 8 * T8);
  L[128 - T8] = PI[L[128 - T8] & TM];
  for (let i = 127 - T8; i >= 0; i--) L[i] = PI[L[i + 1] ^ L[i + T8]];
  const K = new Uint16Array(64);
  for (let i = 0; i < 64; i++) K[i] = L[2 * i] | (L[2 * i + 1] << 8);
  const rol = (x: number, s: number) => ((x >> s) | (x << (16 - s))) & 0xffff;
  const out = new Uint8Array(data.length);
  let prev = iv;
  for (let off = 0; off < data.length; off += 8) {
    const blk = data.subarray(off, off + 8);
    const R = [blk[0] | (blk[1] << 8), blk[2] | (blk[3] << 8), blk[4] | (blk[5] << 8), blk[6] | (blk[7] << 8)];
    let j = 63;
    const rmix = () => {
      R[3] = (rol(R[3], 5) - K[j--] - (R[2] & R[1]) - (~R[2] & R[0])) & 0xffff;
      R[2] = (rol(R[2], 3) - K[j--] - (R[1] & R[0]) - (~R[1] & R[3])) & 0xffff;
      R[1] = (rol(R[1], 2) - K[j--] - (R[0] & R[3]) - (~R[0] & R[2])) & 0xffff;
      R[0] = (rol(R[0], 1) - K[j--] - (R[3] & R[2]) - (~R[3] & R[1])) & 0xffff;
    };
    const rmash = () => {
      R[3] = (R[3] - K[R[2] & 63]) & 0xffff;
      R[2] = (R[2] - K[R[1] & 63]) & 0xffff;
      R[1] = (R[1] - K[R[0] & 63]) & 0xffff;
      R[0] = (R[0] - K[R[3] & 63]) & 0xffff;
    };
    for (let i = 0; i < 5; i++) rmix();
    rmash();
    for (let i = 0; i < 6; i++) rmix();
    rmash();
    for (let i = 0; i < 5; i++) rmix();
    for (let i = 0; i < 4; i++) {
      out[off + 2 * i] = (R[i] & 0xff) ^ prev[2 * i];
      out[off + 2 * i + 1] = (R[i] >> 8) ^ prev[2 * i + 1];
    }
    prev = blk;
  }
  return unpad(out);
}

function unpad(b: Uint8Array) {
  const n = b[b.length - 1];
  if (n < 1 || n > 16 || [...b.subarray(b.length - n)].some((x) => x !== n)) throw new NeedPassword("Wrong password. Try again.");
  return b.subarray(0, b.length - n);
}

async function decrypt(alg: Asn1, data: Uint8Array, password: string): Promise<Uint8Array> {
  const id = oid(alg.children[0]);
  const params = alg.children[1];
  if (id === OID_PBES2) {
    const kdf = params.children[0];
    const enc = params.children[1];
    if (oid(kdf.children[0]) !== OID_PBKDF2) throw new Error("Unsupported keystore encryption.");
    const kp = kdf.children[1];
    const salt = content(kp.children[0]);
    const iter = Number(BigInt("0x" + ([...content(kp.children[1])].map((x) => x.toString(16).padStart(2, "0")).join("") || "0")));
    const prfNode = kp.children.find((c) => c.tag === 0x30);
    const hash = prfNode ? PRF[oid(prfNode.children[0])] ?? "SHA-1" : "SHA-1";
    const keyLen = AES[oid(enc.children[0])];
    if (!keyLen) throw new Error("Unsupported keystore cipher.");
    const iv = content(enc.children[1]);
    const raw = await pbkdf2(password, salt, iter, hash, keyLen);
    const key = await crypto.subtle.importKey("raw", raw, "AES-CBC", false, ["decrypt"]);
    try {
      return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-CBC", iv: new Uint8Array(iv) }, key, new Uint8Array(data)));
    } catch {
      throw new NeedPassword("Wrong password. Try again.");
    }
  }
  if (id === OID_RC2_40) {
    const salt = content(params.children[0]);
    const iter = Number(content(params.children[1]).reduce((a, b) => a * 256 + b, 0));
    const key = await p12kdf(password, salt, iter, 1, 5);
    const iv = await p12kdf(password, salt, iter, 2, 8);
    return rc2Decrypt(key, iv, data, 40);
  }
  if (id === OID_3DES) throw new Error("This keystore uses 3DES for certificates, which isn't supported here. Run keytool -list -v instead.");
  throw new Error("Unsupported keystore encryption.");
}

async function pkcs12Certs(root: Asn1, password: string | undefined): Promise<Found[]> {
  const authSafe = root.children[1];
  if (oid(authSafe.children[0]) !== OID_DATA) throw new Error("Unsupported PKCS#12 file.");
  const octets = content(authSafe.children[1].children[0]);
  const safes = parseDer(octets);
  const out: Found[] = [];
  for (const ci of safes.children) {
    const type = oid(ci.children[0]);
    let bagsDer: Uint8Array | null = null;
    if (type === OID_DATA) bagsDer = content(ci.children[1].children[0]);
    else if (type === OID_ENCRYPTED) {
      if (password === undefined) throw new NeedPassword();
      const eci = ci.children[1].children[0].children[1];
      const enc = eci.children.find((c) => c.tag === 0x80 || c.tag === 0xa0);
      if (!enc) continue;
      const data = enc.tag === 0x80 ? content(enc) : new Uint8Array(enc.children.flatMap((c) => [...content(c)]));
      bagsDer = await decrypt(eci.children[1], data, password);
    }
    if (!bagsDer) continue;
    for (const bag of parseDer(bagsDer).children) {
      if (oid(bag.children[0]) !== OID_CERTBAG) continue;
      const certBag = bag.children[1].children[0];
      if (oid(certBag.children[0]) !== OID_X509) continue;
      const der = content(certBag.children[1].children[0]);
      const attrs = bag.children[2]?.children ?? [];
      const friendly = attrs.find((a) => oid(a.children[0]) === OID_FRIENDLY);
      out.push({ der, source: "Keystore (PKCS#12)", alias: friendly ? str(friendly.children[1].children[0]) : undefined });
    }
  }
  return out;
}

// ---------- APK ----------
function signingBlockCerts(raw: Uint8Array): Found[] {
  const dv = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  let eocd = -1;
  for (let i = raw.length - 22; i >= Math.max(0, raw.length - 65557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  if (eocd < 0) return [];
  const cd = dv.getUint32(eocd + 16, true);
  if (cd < 32 || new TextDecoder().decode(raw.subarray(cd - 16, cd)) !== "APK Sig Block 42") return [];
  const size = Number(dv.getBigUint64(cd - 24, true));
  const start = cd - size - 8;
  const out: Found[] = [];
  let p = start + 8;
  while (p < cd - 24) {
    const len = Number(dv.getBigUint64(p, true));
    const id = dv.getUint32(p + 8, true);
    const vStart = p + 12;
    const scheme = id === 0x7109871a ? "APK Signature v2" : id === 0xf05368c0 ? "APK Signature v3" : id === 0x1b93ad61 ? "APK Signature v3.1" : "";
    if (scheme) {
      try {
        // signers → signer → signed data → certificates (all length-prefixed)
        let q = vStart + 4;
        const signersEnd = vStart + 4 + dv.getUint32(vStart, true);
        while (q < signersEnd) {
          const signerLen = dv.getUint32(q, true);
          const sd = q + 4 + 4; // signed data start
          const digestsLen = dv.getUint32(sd, true);
          let c = sd + 4 + digestsLen;
          const certsEnd = c + 4 + dv.getUint32(c, true);
          c += 4;
          while (c < certsEnd) {
            const n = dv.getUint32(c, true);
            out.push({ der: raw.subarray(c + 4, c + 4 + n), source: scheme });
            c += 4 + n;
          }
          q += 4 + signerLen;
        }
      } catch {}
    }
    p += 8 + len;
  }
  return out;
}

function apkCerts(raw: Uint8Array): Found[] {
  const files = unzipSync(raw, { filter: (f) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(f.name) });
  const v1 = Object.entries(files).flatMap(([name, b]) => pkcs7Certs(parseDer(b), `APK Signature v1 (${name.slice(9)})`));
  return [...signingBlockCerts(raw), ...v1];
}

// ---------- text input ----------
function fromText(text: string): Uint8Array[] {
  const pem = [...text.matchAll(/-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g)];
  const b64 = (s: string) => Uint8Array.from(atob(s.replace(/[^A-Za-z0-9+/=]/g, "")), (c) => c.charCodeAt(0));
  if (pem.length) return pem.map((m) => b64(m[2]));
  const t = text.trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(t) && t.length > 40) return [b64(t)];
  return [];
}

// ---------- entry ----------
export async function findCertificates(bytes: Uint8Array, password?: string): Promise<{ kind: string; certs: CertInfo[] }> {
  let found: Found[] = [];
  let kind = "";
  const magic = bytes.length >= 4 ? new DataView(bytes.buffer, bytes.byteOffset).getUint32(0) : 0;

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    kind = "APK";
    found = apkCerts(bytes);
  } else if (magic === 0xfeedfeed || magic === 0xcececece) {
    kind = magic === 0xfeedfeed ? "JKS keystore" : "JCEKS keystore";
    found = jksCerts(bytes);
  } else if (bytes[0] === 0x30) {
    const root = parseDer(bytes);
    const first = root.children[0];
    if (first?.tag === 0x02 && root.children[1]?.tag === 0x30) {
      kind = "PKCS#12 keystore";
      found = await pkcs12Certs(root, password);
    } else if (first?.tag === 0x06 && oid(first) === OID_SIGNED) {
      kind = "PKCS#7 signature";
      found = pkcs7Certs(root, "PKCS#7");
    } else {
      kind = "Certificate";
      found = [{ der: bytes, source: "Certificate" }];
    }
  } else {
    const text = new TextDecoder().decode(bytes);
    const blobs = fromText(text);
    if (!blobs.length) throw new Error("Couldn't find a keystore or certificate in this. Drop a .jks, .keystore, .p12, .apk, .pem or .crt file.");
    const results = await Promise.all(blobs.map((b) => findCertificates(b, password)));
    return { kind: results.map((r) => r.kind).join(" + "), certs: results.flatMap((r) => r.certs) };
  }

  // The same certificate can appear in v1, v2 and v3: show it once, listing all sources.
  const bySha = new Map<string, CertInfo>();
  for (const f of found) {
    const c = await readCert(f.der, f.source, f.alias);
    const prev = bySha.get(c.sha256);
    if (prev) prev.source += ` · ${f.source}`;
    else bySha.set(c.sha256, c);
  }
  if (!bySha.size) throw new Error(kind === "APK" ? "This APK isn't signed." : "No certificates found.");
  return { kind, certs: [...bySha.values()] };
}
