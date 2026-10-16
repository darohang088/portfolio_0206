// Decodes KHQR (Cambodia's Bakong QR, built on the EMVCo merchant QR format) into readable fields.
// The payload is a chain of TLV items: 2-digit tag, 2-digit length, then the value.

export type Tlv = { tag: string; length: number; value: string; label: string; children?: Tlv[] };
export type KhqrField = { label: string; value: string; hint?: string };
export type KhqrResult = {
  raw: string;
  isKhqr: boolean;
  crcOk: boolean | null;
  crcExpected?: string;
  type: string;
  merchantName?: string;
  amount?: string;
  currency?: string;
  fields: KhqrField[];
  tree: Tlv[];
  errors: string[];
};

const TOP: Record<string, string> = {
  "00": "Payload format",
  "01": "QR type",
  "15": "UnionPay merchant",
  "29": "Individual account (Bakong)",
  "30": "Merchant account (Bakong)",
  "52": "Merchant category code",
  "53": "Currency",
  "54": "Amount",
  "55": "Tip or fee indicator",
  "56": "Fixed fee",
  "57": "Percentage fee",
  "58": "Country",
  "59": "Merchant name",
  "60": "City",
  "61": "Postal code",
  "62": "Additional data",
  "63": "CRC checksum",
  "64": "Other language",
  "99": "Timestamp",
};
const ACCOUNT: Record<string, string> = { "00": "Bakong account ID", "01": "Merchant ID / account", "02": "Acquiring bank" };
const ADDITIONAL: Record<string, string> = {
  "01": "Bill number",
  "02": "Mobile number",
  "03": "Store label",
  "04": "Loyalty number",
  "05": "Reference label",
  "06": "Customer label",
  "07": "Terminal label",
  "08": "Purpose of transaction",
  "09": "Extra customer data",
};
const LANGUAGE: Record<string, string> = { "00": "Language", "01": "Merchant name (local)", "02": "City (local)" };
const TIMESTAMP: Record<string, string> = { "00": "Created", "01": "Expires" };
const CURRENCIES: Record<string, string> = { "116": "KHR", "840": "USD" };
const NESTED: Record<string, Record<string, string>> = { "29": ACCOUNT, "30": ACCOUNT, "62": ADDITIONAL, "64": LANGUAGE, "99": TIMESTAMP };

function parseTlv(s: string, labels: Record<string, string>, errors: string[]): Tlv[] {
  const out: Tlv[] = [];
  let i = 0;
  while (i < s.length) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (tag.length < 2 || !/^\d\d$/.test(s.slice(i + 2, i + 4)) || i + 4 + len > s.length) {
      errors.push(`Broken data near position ${i} ("${s.slice(i, i + 12)}…").`);
      break;
    }
    const value = s.slice(i + 4, i + 4 + len);
    const item: Tlv = { tag, length: len, value, label: labels[tag] ?? (Number(tag) >= 2 && Number(tag) <= 51 ? "Payment network account" : `Tag ${tag}`) };
    if (labels === TOP && NESTED[tag]) item.children = parseTlv(value, NESTED[tag], errors);
    else if (labels === TOP && Number(tag) >= 26 && Number(tag) <= 51) item.children = parseTlv(value, ACCOUNT, []);
    out.push(item);
    i += 4 + len;
  }
  return out;
}

// CRC-16/CCITT-FALSE, as used by EMVCo QR codes.
export function crc16(s: string): string {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(s)) {
    crc ^= b << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const fmtTime = (ms: string) => {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 1e11) return ms;
  return new Date(n).toLocaleString("en-GB", { timeZone: "Asia/Phnom_Penh", dateStyle: "medium", timeStyle: "short" }) + " (Phnom Penh)";
};

export function decodeKhqr(input: string): KhqrResult {
  const raw = input.trim();
  const errors: string[] = [];
  const tree = parseTlv(raw, TOP, errors);
  const get = (tag: string) => tree.find((t) => t.tag === tag);
  const sub = (tag: string, s: string) => get(tag)?.children?.find((c) => c.tag === s)?.value;

  const crcItem = get("63");
  let crcOk: boolean | null = null;
  let crcExpected: string | undefined;
  if (crcItem) {
    const upto = raw.lastIndexOf("6304");
    crcExpected = crc16(raw.slice(0, upto + 4));
    crcOk = crcExpected === crcItem.value.toUpperCase();
  }

  const account = get("29") ?? get("30");
  const isKhqr = get("00")?.value === "01" && !!account && sub(account.tag, "00")?.includes("@") === true;
  const currencyCode = get("53")?.value;
  const currency = currencyCode ? CURRENCIES[currencyCode] ?? currencyCode : undefined;
  const amount = get("54")?.value;
  const dynamic = get("01")?.value === "12";

  const fields: KhqrField[] = [];
  const push = (label: string, value: string | undefined, hint?: string) => value && fields.push({ label, value, hint });
  push("Merchant name", get("59")?.value);
  push("Merchant name (local)", sub("64", "01"));
  push("Bakong account", account ? sub(account.tag, "00") : undefined, account?.tag === "29" ? "Individual" : account ? "Merchant" : undefined);
  push("Merchant ID", account ? sub(account.tag, "01") : undefined);
  push("Bank", account ? sub(account.tag, "02") : undefined);
  const digits = currency === "KHR" ? 0 : 2;
  push("Amount", amount ? `${Number(amount).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: 2 })} ${currency ?? ""}`.trim() : undefined);
  if (!amount) push("Amount", "Not set: the payer types the amount");
  push("Currency", currency ? `${currency} (${currencyCode})` : undefined);
  push("City", get("60")?.value);
  push("Country", get("58")?.value);
  push("Category code (MCC)", get("52")?.value);
  push("Bill number", sub("62", "01"));
  push("Mobile number", sub("62", "02"));
  push("Store label", sub("62", "03"));
  push("Terminal label", sub("62", "07"));
  push("Purpose", sub("62", "08"));
  push("Created", sub("99", "00") ? fmtTime(sub("99", "00") as string) : undefined);
  push("Expires", sub("99", "01") ? fmtTime(sub("99", "01") as string) : undefined);

  return {
    raw,
    isKhqr,
    crcOk,
    crcExpected,
    type: dynamic ? "Dynamic (one-time, usually with amount)" : get("01")?.value === "11" ? "Static (reusable)" : "Unknown",
    merchantName: get("59")?.value,
    amount,
    currency,
    fields,
    tree,
    errors,
  };
}
