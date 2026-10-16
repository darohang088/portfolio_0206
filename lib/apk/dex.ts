// Pulls every string out of a DEX file (class names, URLs, keys and other constants in the code).
export function dexStrings(buf: Uint8Array): string[] {
  if (buf.length < 0x70 || buf[0] !== 0x64 || buf[1] !== 0x65 || buf[2] !== 0x78) return [];
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const count = dv.getUint32(0x38, true);
  const idsOff = dv.getUint32(0x3c, true);
  const dec = new TextDecoder("utf-8", { fatal: false });
  const out: string[] = new Array(count);
  for (let i = 0; i < count; i++) {
    let p = dv.getUint32(idsOff + i * 4, true);
    // Skip the ULEB128 length; the string ends at a 0 byte.
    while (p < buf.length && buf[p] & 0x80) p++;
    p++;
    let e = p;
    while (e < buf.length && buf[e] !== 0) e++;
    out[i] = dec.decode(buf.subarray(p, e));
  }
  return out;
}
