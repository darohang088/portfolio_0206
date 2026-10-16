// Checks a manifest against Google Play's sensitive-permission rules (data/playPolicy.ts).

import { findAll, type XmlNode } from "./axml";
import { PERMISSIONS, COMPONENT_RULES, FGS_RULE, type Level, type Rule } from "@/data/playPolicy";

export type Finding = { key: string; name: string; rule: Rule; level: Level; extra?: string[]; good?: string };
export type PrivacyReport = {
  packageName: string;
  targetSdk?: number;
  findings: Finding[];
  others: string[]; // permissions with no Play rules (normal or custom)
  declarations: number;
  disclosures: number;
};

const ORDER: Level[] = ["restricted", "high", "medium", "low"];
const FGS_TYPES: [number, string][] = [
  [1, "dataSync"], [2, "mediaPlayback"], [4, "phoneCall"], [8, "location"], [16, "connectedDevice"], [32, "mediaProjection"],
  [64, "camera"], [128, "microphone"], [256, "health"], [512, "remoteMessaging"], [1024, "systemExempted"], [2048, "shortService"],
  [4096, "fileManagement"], [8192, "mediaProcessing"], [0x40000000, "specialUse"],
];

const short = (p: string) => (p.startsWith("android.permission.") ? p.slice(19) : p);

function fgsTypes(v: unknown): string[] {
  if (typeof v === "number") return FGS_TYPES.filter(([bit]) => (v & bit) !== 0).map(([, n]) => n);
  return String(v ?? "").split("|").map((s) => s.trim()).filter(Boolean);
}

export function checkPrivacy(root: XmlNode): PrivacyReport {
  const sdk = findAll(root, "uses-sdk")[0];
  const targetSdk = sdk ? Number(sdk.attrs.targetSdkVersion ?? sdk.attrs.minSdkVersion) || undefined : undefined;
  const uses = findAll(root, "uses-permission").concat(findAll(root, "uses-permission-sdk-23"));
  const findings: Finding[] = [];
  const others: string[] = [];
  const seen = new Set<string>();
  const health: string[] = [];

  for (const u of uses) {
    const full = String(u.attrs.name ?? "");
    if (!full || seen.has(full)) continue;
    seen.add(full);
    const key = short(full);
    if (full.startsWith("android.permission.health.")) {
      health.push(key.replace("health.", ""));
      continue;
    }
    if (/^FOREGROUND_SERVICE/.test(key)) continue; // reported with the foreground services
    const rule = PERMISSIONS[key] ?? PERMISSIONS[full];
    if (!rule) {
      others.push(key);
      continue;
    }
    let level = rule.level;
    let good: string | undefined;
    const max = Number(u.attrs.maxSdkVersion);
    if ((key === "READ_EXTERNAL_STORAGE" && max && max <= 32) || (key === "WRITE_EXTERNAL_STORAGE" && max && max <= 29)) {
      level = "low";
      good = `Limited to API level ${max} and lower with maxSdkVersion. ✓`;
    }
    if (key === "BLUETOOTH_SCAN" && String(u.attrs.usesPermissionFlags ?? "").includes("neverForLocation")) {
      level = "low";
      good = "Marked neverForLocation. ✓";
    }
    if (key === "BLUETOOTH_SCAN" && Number(u.attrs.usesPermissionFlags) === 0x10000) {
      level = "low";
      good = "Marked neverForLocation. ✓";
    }
    findings.push({ key, name: full, rule, level, good });
  }

  if (health.length)
    findings.push({
      key: "health",
      name: "android.permission.health.*",
      level: "restricted",
      extra: health,
      rule: {
        title: "Health Connect data",
        level: "restricted",
        what: "Reads or writes health and fitness records through Health Connect.",
        play: "Fill in the Health apps declaration and the Health Connect permissions form, and link a privacy policy. Only request the data types your features use.",
        disclosure: "required",
        rejections: ["Requesting data types the app doesn't use", "Health data used for ads", "Privacy policy doesn't cover health data"],
      },
    });

  // Services and receivers that are protected by special system permissions.
  const app = findAll(root, "application")[0];
  const comps = app ? [...findAll(app, "service"), ...findAll(app, "receiver")] : [];
  for (const [perm, rule] of Object.entries(COMPONENT_RULES)) {
    const hits = comps.filter((c) => short(String(c.attrs.permission ?? "")) === perm).map((c) => String(c.attrs.name ?? "?"));
    if (hits.length) findings.push({ key: perm, name: `android.permission.${perm}`, rule, level: rule.level, extra: hits });
  }

  // Foreground services: types from <service foregroundServiceType> and FOREGROUND_SERVICE_* permissions.
  const types = new Set<string>();
  for (const s of app ? findAll(app, "service") : []) fgsTypes(s.attrs.foregroundServiceType).forEach((t) => types.add(t));
  for (const p of seen) {
    const m = /^android\.permission\.FOREGROUND_SERVICE_(\w+)$/.exec(p);
    if (m) types.add(m[1].toLowerCase().replace(/_(\w)/g, (_, c: string) => c.toUpperCase()));
  }
  if (types.size || seen.has("android.permission.FOREGROUND_SERVICE")) {
    const risky = [...types].some((t) => ["location", "camera", "microphone", "mediaProjection", "specialUse", "systemExempted", "health"].includes(t));
    findings.push({
      key: "fgs",
      name: "Foreground services",
      rule: FGS_RULE,
      level: risky ? "high" : (targetSdk ?? 0) >= 34 ? "medium" : "low",
      extra: types.size ? [...types].map((t) => `type: ${t}`) : ["no type declared (required when targeting Android 14+)"],
    });
  }

  findings.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  return {
    packageName: String(root.attrs.package ?? "—"),
    targetSdk,
    findings,
    others: others.sort(),
    declarations: findings.filter((f) => /declaration|declare/i.test(f.rule.play) && f.level !== "low").length,
    disclosures: findings.filter((f) => f.rule.disclosure === "required" && f.level !== "low").length,
  };
}
