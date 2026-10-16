// Reader for resources.arsc, the compiled resource table inside an APK.
// Used to turn references like @0x7f0d0000 (the app icon or label) into file paths, strings or colours.

export type ResValue = { type: "string"; value: string } | { type: "ref"; id: number } | { type: "color"; argb: number } | { type: "other"; dataType: number; data: number };
export type ResEntry = { density: number; language: string; value: ResValue };

const TYPE_TABLE = 0x0002;
const TYPE_STRINGS = 0x0001;
const TYPE_PACKAGE = 0x0200;
const TYPE_TYPE = 0x0201;
const NO_ENTRY = 0xffffffff;

export type ResTable = { resolve(id: number): ResEntry[] };

export function parseArsc(buf: Uint8Array): ResTable | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 12 || dv.getUint16(0, true) !== TYPE_TABLE) return null;
  let globalStrings: string[] = [];
  // packageId → typeId → list of type chunk offsets
  const types = new Map<number, Map<number, number[]>>();

  let off = dv.getUint16(2, true);
  while (off + 8 <= buf.length) {
    const type = dv.getUint16(off, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;
    if (type === TYPE_STRINGS) globalStrings = readStringPool(dv, buf, off);
    else if (type === TYPE_PACKAGE) {
      const pkgId = dv.getUint32(off + 8, true);
      const byType = new Map<number, number[]>();
      types.set(pkgId, byType);
      let p = off + dv.getUint16(off + 2, true);
      while (p + 8 <= off + size) {
        const t = dv.getUint16(p, true);
        const s = dv.getUint32(p + 4, true);
        if (s < 8) break;
        if (t === TYPE_TYPE) {
          const id = buf[p + 8];
          if (!byType.has(id)) byType.set(id, []);
          byType.get(id)!.push(p);
        }
        p += s;
      }
    }
    off += size;
  }

  const readValue = (dataType: number, data: number): ResValue => {
    if (dataType === 0x03) return { type: "string", value: globalStrings[data] ?? "" };
    if (dataType === 0x01) return { type: "ref", id: data >>> 0 };
    if (dataType >= 0x1c && dataType <= 0x1f) {
      let argb = data >>> 0;
      if (dataType === 0x1d || dataType === 0x1f) argb = (0xff000000 | argb) >>> 0;
      return { type: "color", argb };
    }
    return { type: "other", dataType, data };
  };

  return {
    resolve(id: number): ResEntry[] {
      const pkg = id >>> 24;
      const typeId = (id >>> 16) & 0xff;
      const entryIdx = id & 0xffff;
      const out: ResEntry[] = [];
      for (const p of types.get(pkg)?.get(typeId) ?? []) {
        const headerSize = dv.getUint16(p + 2, true);
        const flags = buf[p + 9];
        const entryCount = dv.getUint32(p + 12, true);
        const entriesStart = dv.getUint32(p + 16, true);
        const cfg = p + 20;
        const cfgSize = dv.getUint32(cfg, true);
        const density = cfgSize >= 16 ? dv.getUint16(cfg + 14, true) : 0;
        const lang = cfgSize >= 12 && buf[cfg + 8] ? String.fromCharCode(buf[cfg + 8], buf[cfg + 9]) : "";
        const offsets = p + headerSize;
        let entryOff = NO_ENTRY;
        if (flags & 0x01) {
          // Sparse: sorted (index, offset/4) pairs.
          for (let k = 0; k < entryCount; k++) {
            const idx = dv.getUint16(offsets + k * 4, true);
            if (idx === entryIdx) {
              entryOff = dv.getUint16(offsets + k * 4 + 2, true) * 4;
              break;
            }
            if (idx > entryIdx) break;
          }
        } else if (entryIdx < entryCount) {
          if (flags & 0x02) {
            const o = dv.getUint16(offsets + entryIdx * 2, true);
            entryOff = o === 0xffff ? NO_ENTRY : o * 4;
          } else entryOff = dv.getUint32(offsets + entryIdx * 4, true);
        }
        if (entryOff === NO_ENTRY) continue;
        const e = p + entriesStart + entryOff;
        if (e + 8 > buf.length) continue;
        const eFlags = dv.getUint16(e + 2, true);
        let value: ResValue;
        if (eFlags & 0x0008) value = readValue(eFlags >>> 8, dv.getUint32(e + 4, true)); // compact entry
        else if (eFlags & 0x0001) continue; // a style or other map entry, not a single value
        else {
          const eSize = dv.getUint16(e, true);
          const v = e + eSize;
          value = readValue(buf[v + 3], dv.getUint32(v + 4, true));
        }
        out.push({ density, language: lang, value });
      }
      return out;
    },
  };
}

// Follow references (up to a few hops) and return the final values.
export function resolveDeep(table: ResTable, id: number, depth = 0): ResEntry[] {
  if (depth > 5) return [];
  return table.resolve(id).flatMap((e) => (e.value.type === "ref" ? resolveDeep(table, e.value.id, depth + 1).map((r) => ({ ...r, density: e.density || r.density })) : [e]));
}

function readStringPool(dv: DataView, buf: Uint8Array, start: number): string[] {
  const headerSize = dv.getUint16(start + 2, true);
  const count = dv.getUint32(start + 8, true);
  const flags = dv.getUint32(start + 16, true);
  const stringsStart = dv.getUint32(start + 20, true);
  const utf8 = (flags & 0x100) !== 0;
  const dec8 = new TextDecoder("utf-8");
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let p = start + stringsStart + dv.getUint32(start + headerSize + i * 4, true);
    try {
      if (utf8) {
        p += buf[p] & 0x80 ? 2 : 1;
        let len = buf[p];
        if (len & 0x80) {
          len = ((len & 0x7f) << 8) | buf[p + 1];
          p += 2;
        } else p += 1;
        out.push(dec8.decode(buf.subarray(p, p + len)));
      } else {
        let len = dv.getUint16(p, true);
        if (len & 0x8000) {
          len = ((len & 0x7fff) << 16) | dv.getUint16(p + 2, true);
          p += 4;
        } else p += 2;
        let s = "";
        for (let k = 0; k < len; k++) s += String.fromCharCode(dv.getUint16(p + k * 2, true));
        out.push(s);
      }
    } catch {
      out.push("");
    }
  }
  return out;
}
