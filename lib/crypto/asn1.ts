// Minimal DER (ASN.1) reader: enough to walk certificates, PKCS#7 and PKCS#12 files.

export type Asn1 = {
  tag: number; // full first byte, e.g. 0x30 SEQUENCE, 0xa0 [0]
  start: number; // offset of the tag byte
  hdr: number; // header length
  len: number; // content length
  constructed: boolean;
  children: Asn1[];
  buf: Uint8Array;
};

export function parseDer(buf: Uint8Array, start = 0, end = buf.length): Asn1 {
  if (start + 2 > end) throw new Error("Not valid DER data.");
  const tag = buf[start];
  let p = start + 1;
  let len = buf[p++];
  if (len & 0x80) {
    const n = len & 0x7f;
    if (n === 0 || n > 4) throw new Error("Unsupported DER length.");
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[p++];
  }
  const hdr = p - start;
  if (p + len > end) throw new Error("DER data is cut off.");
  const node: Asn1 = { tag, start, hdr, len, constructed: (tag & 0x20) !== 0, children: [], buf };
  if (node.constructed) {
    let q = p;
    while (q < p + len) {
      const child = parseDer(buf, q, p + len);
      node.children.push(child);
      q = child.start + child.hdr + child.len;
    }
  }
  return node;
}

export const content = (n: Asn1) => n.buf.subarray(n.start + n.hdr, n.start + n.hdr + n.len);
export const whole = (n: Asn1) => n.buf.subarray(n.start, n.start + n.hdr + n.len);

export function oid(n: Asn1): string {
  const b = content(n);
  const parts = [Math.floor(b[0] / 40), b[0] % 40];
  let v = 0;
  for (let i = 1; i < b.length; i++) {
    v = v * 128 + (b[i] & 0x7f);
    if (!(b[i] & 0x80)) {
      parts.push(v);
      v = 0;
    }
  }
  return parts.join(".");
}

export function int(n: Asn1): number {
  let v = 0;
  for (const b of content(n)) v = v * 256 + b;
  return v;
}

export const hex = (b: Uint8Array, sep = "") => [...b].map((x) => x.toString(16).padStart(2, "0").toUpperCase()).join(sep);

export function str(n: Asn1): string {
  const b = content(n);
  if (n.tag === 0x1e) {
    let s = "";
    for (let i = 0; i + 1 < b.length; i += 2) s += String.fromCharCode((b[i] << 8) | b[i + 1]);
    return s;
  }
  return new TextDecoder(n.tag === 0x0c ? "utf-8" : "latin1").decode(b);
}

export function time(n: Asn1): Date {
  const s = str(n);
  const m = n.tag === 0x17 ? /^(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(s) : /^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?Z$/.exec(s);
  if (!m) return new Date(NaN);
  let y = Number(m[1]);
  if (n.tag === 0x17) y += y < 50 ? 2000 : 1900;
  return new Date(Date.UTC(y, Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6] ?? 0)));
}
