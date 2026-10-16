// Reads the parts of an X.509 certificate people care about, plus its fingerprints.
import { parseDer, content, oid, hex, str, time, int, type Asn1 } from "./asn1";
import { md5 } from "./md5";

export type CertInfo = {
  alias?: string;
  source: string;
  subject: string;
  issuer: string;
  serial: string;
  validFrom: Date;
  validTo: Date;
  keyType: string;
  signature: string;
  selfSigned: boolean;
  debug: boolean;
  md5: string;
  sha1: string;
  sha256: string;
  facebookKeyHash: string; // base64 of SHA-1, what Facebook Login asks for
};

const NAMES: Record<string, string> = { "2.5.4.3": "CN", "2.5.4.6": "C", "2.5.4.7": "L", "2.5.4.8": "ST", "2.5.4.10": "O", "2.5.4.11": "OU", "1.2.840.113549.1.9.1": "E" };
const ALGS: Record<string, string> = {
  "1.2.840.113549.1.1.1": "RSA",
  "1.2.840.10045.2.1": "EC",
  "1.2.840.10040.4.1": "DSA",
  "1.2.840.113549.1.1.5": "SHA1withRSA",
  "1.2.840.113549.1.1.11": "SHA256withRSA",
  "1.2.840.113549.1.1.12": "SHA384withRSA",
  "1.2.840.113549.1.1.13": "SHA512withRSA",
  "1.2.840.10045.4.3.2": "SHA256withECDSA",
  "1.2.840.10045.4.3.3": "SHA384withECDSA",
  "2.16.840.1.101.3.4.3.2": "SHA256withDSA",
  "1.2.840.10040.4.3": "SHA1withDSA",
};

function name(n: Asn1): string {
  // Shown CN first, like keytool and most tools.
  return [...n.children]
    .reverse()
    .map((set) => set.children.map((atv) => `${NAMES[oid(atv.children[0])] ?? oid(atv.children[0])}=${str(atv.children[1])}`).join("+"))
    .join(", ");
}

const colon = (b: Uint8Array) => hex(b, ":");

async function digest(alg: "SHA-1" | "SHA-256", der: Uint8Array) {
  return new Uint8Array(await crypto.subtle.digest(alg, new Uint8Array(der)));
}

export async function readCert(der: Uint8Array, source: string, alias?: string): Promise<CertInfo> {
  const cert = parseDer(der);
  const tbs = cert.children[0];
  let i = tbs.children[0].tag === 0xa0 ? 1 : 0; // skip [0] version
  const serial = tbs.children[i++];
  const sigAlg = tbs.children[i++];
  const issuer = tbs.children[i++];
  const validity = tbs.children[i++];
  const subject = tbs.children[i++];
  const spki = tbs.children[i++];
  const keyAlg = ALGS[oid(spki.children[0].children[0])] ?? oid(spki.children[0].children[0]);
  let keyBits = "";
  if (keyAlg === "RSA") {
    try {
      const bits = content(spki.children[1]).subarray(1);
      const rsa = parseDer(bits);
      const mod = content(rsa.children[0]);
      keyBits = ` ${(mod[0] === 0 ? mod.length - 1 : mod.length) * 8}-bit`;
    } catch {}
  }
  const subj = name(subject);
  const iss = name(issuer);
  const sha1 = await digest("SHA-1", der);
  const sha256 = await digest("SHA-256", der);
  const serialBytes = content(serial);
  return {
    alias,
    source,
    subject: subj,
    issuer: iss,
    serial: serialBytes.length <= 6 ? String(int(serial)) : hex(serialBytes).replace(/^0+/, "") || "0",
    validFrom: time(validity.children[0]),
    validTo: time(validity.children[1]),
    keyType: keyAlg + keyBits,
    signature: ALGS[oid(sigAlg.children[0])] ?? oid(sigAlg.children[0]),
    selfSigned: subj === iss,
    debug: /CN=Android Debug/.test(subj),
    md5: colon(md5(der)),
    sha1: colon(sha1),
    sha256: colon(sha256),
    facebookKeyHash: btoa(String.fromCharCode(...sha1)),
  };
}
