// Reader for Android's binary XML (AndroidManifest.xml and res/xml/* inside an APK).

export type XmlNode = { name: string; attrs: Record<string, string | number | boolean>; children: XmlNode[] };

// Attribute names by resource id, for APKs whose attribute names were stripped.
const ATTR_IDS: Record<number, string> = {
  0x01010003: "name",
  0x01010006: "permission",
  0x0101000f: "debuggable",
  0x01010010: "exported",
  0x0101021b: "versionCode",
  0x0101021c: "versionName",
  0x0101020c: "minSdkVersion",
  0x01010270: "targetSdkVersion",
  0x01010280: "allowBackup",
  0x010104ec: "usesCleartextTraffic",
  0x01010527: "networkSecurityConfig",
  0x01010001: "label",
  0x01010002: "icon",
  0x01010199: "drawable",
  0x01010272: "testOnly",
  // IDs below are from Android 16's android.R.attr.
  0x01010000: "theme",
  0x0101001e: "screenOrientation",
  0x010104eb: "fullBackupContent",
  0x010104f6: "resizeableActivity",
  0x01010560: "maxAspectRatio",
  0x01010599: "foregroundServiceType",
  0x0101059b: "minAspectRatio",
  0x0101063e: "dataExtractionRules",
  0x0101066c: "enableOnBackInvokedCallback",
};

export function parseAxml(buf: Uint8Array): XmlNode | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf.length < 8 || dv.getUint16(0, true) !== 0x0003) return null;
  let strings: string[] = [];
  let resIds: number[] = [];
  const root: XmlNode = { name: "#root", attrs: {}, children: [] };
  const stack: XmlNode[] = [root];

  let off = dv.getUint16(2, true);
  while (off + 8 <= buf.length) {
    const type = dv.getUint16(off, true);
    const headerSize = dv.getUint16(off + 2, true);
    const size = dv.getUint32(off + 4, true);
    if (size < 8 || off + size > buf.length) break;

    if (type === 0x0001) strings = readStringPool(dv, buf, off);
    else if (type === 0x0180) {
      resIds = [];
      for (let p = off + headerSize; p < off + size; p += 4) resIds.push(dv.getUint32(p, true));
    } else if (type === 0x0102) {
      const name = strings[dv.getUint32(off + 20, true)] ?? "";
      const attrStart = dv.getUint16(off + 24, true);
      const attrSize = dv.getUint16(off + 26, true) || 20;
      const count = dv.getUint16(off + 28, true);
      const node: XmlNode = { name, attrs: {}, children: [] };
      for (let i = 0; i < count; i++) {
        const a = off + 16 + attrStart + i * attrSize;
        const nameIdx = dv.getUint32(a + 4, true);
        const raw = dv.getUint32(a + 8, true);
        const dataType = dv.getUint8(a + 15);
        const data = dv.getUint32(a + 16, true);
        let key = strings[nameIdx] || "";
        if (!key || ATTR_IDS[resIds[nameIdx]]) key = ATTR_IDS[resIds[nameIdx]] ?? key;
        if (!key) continue;
        let value: string | number | boolean;
        if (dataType === 0x03) value = strings[data] ?? "";
        else if (dataType === 0x12) value = data !== 0;
        else if (dataType === 0x10 || dataType === 0x11) value = data | 0;
        else if (dataType === 0x01) value = `@0x${data.toString(16)}`;
        else if (dataType === 0x04) value = new DataView(new Uint32Array([data]).buffer).getFloat32(0, true);
        else value = raw !== 0xffffffff ? (strings[raw] ?? data) : data;
        node.attrs[key] = value;
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    } else if (type === 0x0103) {
      if (stack.length > 1) stack.pop();
    }
    off += size;
  }
  return root.children[0] ?? null;
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
        // UTF-16 length, then UTF-8 byte length (each 1 or 2 bytes).
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

export function findAll(node: XmlNode, name: string, out: XmlNode[] = []): XmlNode[] {
  if (node.name === name) out.push(node);
  node.children.forEach((c) => findAll(c, name, out));
  return out;
}
