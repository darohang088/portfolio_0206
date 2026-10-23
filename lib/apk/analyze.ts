// Static security check of an APK, done entirely in the browser.
// It unzips the APK, reads the binary manifest, the DEX code strings and the signature,
// then runs rules based on common OWASP MASVS checks. It doesn't run the app.

import { unzip, type Unzipped } from "fflate";
import { parseAxml, findAll, type XmlNode } from "./axml";
import { dexStrings } from "./dex";

export type Severity = "high" | "medium" | "low" | "info" | "pass";
export type Finding = { id: string; severity: Severity; title: string; detail: string; fix?: string; items?: string[] };
export type ApkReport = {
  fileName: string;
  fileSize: number;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk?: number;
  targetSdk?: number;
  framework: string;
  abis: string[];
  permissions: string[];
  counts: { activities: number; services: number; receivers: number; providers: number; dexFiles: number; strings: number };
  findings: Finding[];
  score: number;
  grade: string;
};

const SEVERITY_COST: Record<Severity, number> = { high: 18, medium: 8, low: 3, info: 0, pass: 0 };

const SENSITIVE_PERMS: Record<string, Severity> = {
  READ_SMS: "medium",
  SEND_SMS: "medium",
  RECEIVE_SMS: "medium",
  READ_CALL_LOG: "medium",
  WRITE_CALL_LOG: "medium",
  PROCESS_OUTGOING_CALLS: "medium",
  REQUEST_INSTALL_PACKAGES: "medium",
  SYSTEM_ALERT_WINDOW: "medium",
  MANAGE_EXTERNAL_STORAGE: "medium",
  QUERY_ALL_PACKAGES: "medium",
  BIND_ACCESSIBILITY_SERVICE: "medium",
  READ_CONTACTS: "low",
  WRITE_CONTACTS: "low",
  ACCESS_FINE_LOCATION: "low",
  ACCESS_BACKGROUND_LOCATION: "low",
  CAMERA: "low",
  RECORD_AUDIO: "low",
  READ_PHONE_STATE: "low",
  READ_EXTERNAL_STORAGE: "low",
  WRITE_EXTERNAL_STORAGE: "low",
  BODY_SENSORS: "low",
  GET_ACCOUNTS: "low",
};

// Patterns for secrets that shouldn't ship inside an app.
const SECRETS: { name: string; re: RegExp; severity: Severity }[] = [
  { name: "Private key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, severity: "high" },
  { name: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, severity: "high" },
  { name: "Stripe live secret key", re: /\bsk_live_[0-9a-zA-Z]{20,}\b/, severity: "high" },
  { name: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}/, severity: "high" },
  { name: "GitHub token", re: /\bgh[pousr]_[0-9A-Za-z]{30,}\b/, severity: "high" },
  { name: "Telegram bot token", re: /\b\d{8,10}:AA[0-9A-Za-z_-]{30,}\b/, severity: "high" },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/, severity: "medium" },
  { name: "JWT token", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, severity: "medium" },
  { name: "Supabase service key", re: /service_role/, severity: "high" },
];

const HTTP_IGNORE = /^http:\/\/(schemas\.android\.com|www\.w3\.org|ns\.adobe\.com|xml\.org|xmlpull\.org|apache\.org|www\.apache\.org|java\.sun\.com|purl\.org|localhost|127\.0\.0\.1|10\.0\.2\.2|example\.com|www\.example\.com|json-schema\.org|schemas\.xmlsoap\.org|www\.google\.com\/?$|ns\.)/i;

type Step = (label: string) => Promise<void>;

function unzipAsync(data: Uint8Array, filter: (name: string, size: number) => boolean): Promise<Unzipped> {
  return new Promise((resolve, reject) =>
    unzip(data, { filter: (f) => filter(f.name, f.originalSize) }, (err, out) => (err ? reject(err) : resolve(out))),
  );
}

// Is the v2/v3 "APK Signature Scheme" block present? It sits right before the zip's central directory.
export function hasSigningBlock(buf: Uint8Array): boolean {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      const cd = dv.getUint32(i + 16, true);
      if (cd < 16 || cd > buf.length) return false;
      return new TextDecoder().decode(buf.subarray(cd - 16, cd)) === "APK Sig Block 42";
    }
  }
  return false;
}

const bool = (v: unknown) => v === true || v === "true";
const short = (s: string, n = 90) => (s.length > n ? s.slice(0, n) + "…" : s);

export async function analyzeApk(file: File, step: Step): Promise<ApkReport> {
  await step("Unzipping APK");
  const raw = new Uint8Array(await file.arrayBuffer());
  if (raw[0] !== 0x50 || raw[1] !== 0x4b) throw new Error("This isn't an APK file (it's not a zip archive).");

  const names: string[] = [];
  const files = await unzipAsync(raw, (name, size) => {
    names.push(name);
    if (name === "AndroidManifest.xml" || /^classes\d*\.dex$/.test(name) || name === "resources.arsc") return true;
    if (/^res\/xml\/[^/]+\.xml$/.test(name)) return true;
    if (/^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(name)) return true;
    // Small text-like files where keys often hide.
    return /^(assets|res\/raw)\/.+\.(json|xml|txt|properties|env|js|yaml|yml|conf|cfg)$/i.test(name) && size < 2_000_000;
  });
  if (!files["AndroidManifest.xml"]) throw new Error("No AndroidManifest.xml found. Is this an Android app (.apk)?");

  await step("Reading the manifest");
  const manifest = parseAxml(files["AndroidManifest.xml"]);
  if (!manifest) throw new Error("Couldn't read AndroidManifest.xml.");
  const app = findAll(manifest, "application")[0] ?? { name: "application", attrs: {}, children: [] };
  const usesSdk = findAll(manifest, "uses-sdk")[0];
  const minSdk = usesSdk ? Number(usesSdk.attrs.minSdkVersion) || undefined : undefined;
  const targetSdk = usesSdk ? Number(usesSdk.attrs.targetSdkVersion) || minSdk : undefined;
  const permissions = findAll(manifest, "uses-permission")
    .map((n) => String(n.attrs.name ?? ""))
    .filter(Boolean)
    .sort();

  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  // --- App settings ---
  if (bool(app.attrs.debuggable))
    add({ id: "debuggable", severity: "high", title: "App is debuggable", detail: "android:debuggable=\"true\" lets anyone attach a debugger, read memory and change how the app runs.", fix: "Build a release variant; never ship debuggable builds." });
  else add({ id: "debuggable", severity: "pass", title: "Not debuggable", detail: "Release build: debuggers can't attach." });

  if (app.attrs.allowBackup === undefined && (targetSdk ?? 0) < 31)
    add({ id: "backup", severity: "low", title: "Backup allowed by default", detail: "allowBackup isn't set, so on older Android the app's data can be copied off the phone with adb backup.", fix: "Set android:allowBackup=\"false\", or use dataExtractionRules to exclude sensitive files." });
  else if (bool(app.attrs.allowBackup))
    add({ id: "backup", severity: "medium", title: "App data can be backed up", detail: "android:allowBackup=\"true\": tokens and local data can be pulled from the device through backups.", fix: "Set allowBackup=\"false\" or exclude sensitive files with fullBackupContent / dataExtractionRules." });
  else add({ id: "backup", severity: "pass", title: "Backup is restricted", detail: "allowBackup is off, or the app targets Android 12+ where adb backup is limited." });

  // --- Network ---
  const nscFiles = Object.keys(files)
    .filter((n) => n.startsWith("res/xml/"))
    .map((n) => ({ n, x: parseAxml(files[n]) }))
    .filter((f) => f.x?.name === "network-security-config");
  const nscCleartext = nscFiles.some((f) => findAll(f.x as XmlNode, "base-config").concat(findAll(f.x as XmlNode, "domain-config")).some((c) => bool(c.attrs.cleartextTrafficPermitted)));
  const nscUserCa = nscFiles.some((f) => findAll(f.x as XmlNode, "certificates").some((c) => c.attrs.src === "user"));
  const pinning = nscFiles.some((f) => findAll(f.x as XmlNode, "pin-set").length > 0);

  if (bool(app.attrs.usesCleartextTraffic) || nscCleartext)
    add({ id: "cleartext", severity: "high", title: "Unencrypted HTTP allowed", detail: "The app allows plain http:// traffic, which anyone on the same Wi-Fi can read or change.", fix: "Use HTTPS only: set usesCleartextTraffic=\"false\" and remove cleartextTrafficPermitted from the network security config." });
  else if (app.attrs.usesCleartextTraffic === undefined && !nscFiles.length && (targetSdk ?? 0) < 28)
    add({ id: "cleartext", severity: "medium", title: "HTTP allowed by default", detail: "The app targets Android 8 or lower, where plain http:// is allowed unless you turn it off.", fix: "Set android:usesCleartextTraffic=\"false\" or raise targetSdk." });
  else add({ id: "cleartext", severity: "pass", title: "HTTPS only", detail: "Plain http:// traffic is blocked." });

  if (nscUserCa)
    add({ id: "userca", severity: "medium", title: "Trusts user-installed certificates", detail: "The network security config trusts certificates the user installs, which makes it easy to intercept the app's HTTPS traffic.", fix: "Only trust user certificates inside <debug-overrides>." });
  add(
    pinning
      ? { id: "pinning", severity: "pass", title: "Certificate pinning found", detail: "The network security config pins server certificates." }
      : { id: "pinning", severity: "info", title: "No certificate pinning in config", detail: "No <pin-set> found. Pinning (in config or in code, e.g. OkHttp CertificatePinner) makes HTTPS interception much harder.", fix: "Consider pinning for banking or payment apps." },
  );

  // --- SDK levels ---
  if (minSdk !== undefined && minSdk < 23)
    add({ id: "minsdk", severity: minSdk < 21 ? "medium" : "low", title: `Runs on old Android (minSdk ${minSdk})`, detail: "Very old Android versions miss many security fixes and features like runtime permissions and strong keystore support.", fix: "Raise minSdk to 23 or higher if you can." });
  if (targetSdk !== undefined && targetSdk < 33)
    add({ id: "targetsdk", severity: "medium", title: `Old target SDK (${targetSdk})`, detail: "Targeting an old Android version turns off newer security protections, and Google Play requires a recent target.", fix: "Target the latest Android API level." });
  else if (targetSdk) add({ id: "targetsdk", severity: "pass", title: `Modern target SDK (${targetSdk})`, detail: "The app gets current Android security behaviour." });

  // --- Exported components ---
  const comps = (tag: string) => findAll(app, tag);
  const exportedOpen: string[] = [];
  let openProvider = false;
  for (const tag of ["activity", "activity-alias", "service", "receiver", "provider"]) {
    for (const c of comps(tag)) {
      const hasFilter = c.children.some((k) => k.name === "intent-filter");
      const exported = c.attrs.exported === undefined ? (tag === "provider" ? (targetSdk ?? 0) < 17 : hasFilter) : bool(c.attrs.exported);
      if (!exported || c.attrs.permission) continue;
      const isLauncher = c.children.some((k) => k.name === "intent-filter" && findAll(k, "category").some((cat) => String(cat.attrs.name).endsWith("LAUNCHER")));
      if (isLauncher) continue;
      if (tag === "provider") openProvider = true;
      exportedOpen.push(`${tag}: ${String(c.attrs.name ?? "?")}`);
    }
  }
  if (exportedOpen.length)
    add({
      id: "exported",
      severity: openProvider ? "high" : "medium",
      title: `${exportedOpen.length} exported component${exportedOpen.length > 1 ? "s" : ""} without a permission`,
      detail: "Other apps on the phone can start or send data to these. Check each one handles untrusted input safely." + (openProvider ? " An open content provider can leak app data." : ""),
      fix: "Set android:exported=\"false\" where not needed, or protect them with android:permission.",
      items: exportedOpen.slice(0, 40),
    });
  else add({ id: "exported", severity: "pass", title: "No unprotected exported components", detail: "Only the launcher screen is open to other apps." });

  // --- Permissions ---
  const risky = permissions
    .map((p) => ({ p, s: SENSITIVE_PERMS[p.split(".").pop() ?? ""] }))
    .filter((x) => x.s);
  if (risky.length)
    add({
      id: "perms",
      severity: risky.some((r) => r.s === "medium") ? "medium" : "low",
      title: `${risky.length} sensitive permission${risky.length > 1 ? "s" : ""}`,
      detail: "These give access to private data or powerful features. Make sure each is really needed and explained to users.",
      items: risky.map((r) => r.p.replace("android.permission.", "")),
    });

  // --- Signing ---
  await step("Checking the signature");
  const certs = Object.keys(files).filter((n) => n.startsWith("META-INF/"));
  const v2 = hasSigningBlock(raw);
  const debugCert = certs.some((n) => new TextDecoder("latin1").decode(files[n]).includes("Android Debug"));
  if (debugCert)
    add({ id: "sign", severity: "high", title: "Signed with the debug key", detail: "The APK uses Android's public debug certificate, so anyone can sign a fake update.", fix: "Sign releases with your own private release key (or Play App Signing)." });
  else if (!v2 && certs.length)
    add({ id: "sign", severity: "medium", title: "Only old v1 signature", detail: "No APK Signature Scheme v2/v3 block. v1-only APKs are open to the Janus attack on old Android.", fix: "Enable v2 and v3 signing (default in recent Android Gradle Plugin)." });
  else if (!v2 && !certs.length)
    add({ id: "sign", severity: "high", title: "No signature found", detail: "The APK doesn't look signed, so Android won't install it.", fix: "Sign the APK with your release key." });
  else add({ id: "sign", severity: "pass", title: "Signed with v2/v3 scheme", detail: "Modern APK signing protects the whole file from tampering." });

  // --- Code scan ---
  await step("Scanning code for secrets");
  const dexNames = Object.keys(files).filter((n) => /^classes\d*\.dex$/.test(n));
  let strings: string[] = [];
  for (const d of dexNames) strings = strings.concat(dexStrings(files[d]));
  const extraText: string[] = [];
  const latin = new TextDecoder("latin1");
  for (const n of Object.keys(files)) {
    if (n === "resources.arsc" || /^(assets|res\/raw)\//.test(n)) extraText.push(...latin.decode(files[n]).split(/[\0\n\r"'<>\s]+/).filter((s) => s.length >= 16));
  }
  const all = strings.concat(extraText);

  const secretHits: string[] = [];
  let secretSeverity: Severity = "info";
  for (const s of all) {
    if (s.length < 16 || s.length > 4000) continue;
    for (const rule of SECRETS) {
      const m = rule.re.exec(s);
      if (m) {
        const v = m[0];
        secretHits.push(`${rule.name}: ${v.slice(0, 8)}…${v.length > 12 ? v.slice(-4) : ""}`);
        if (rule.severity === "high" || (rule.severity === "medium" && secretSeverity !== "high")) secretSeverity = rule.severity;
      }
    }
    if (secretHits.length > 30) break;
  }
  const uniqueSecrets = [...new Set(secretHits)];
  if (uniqueSecrets.length)
    add({
      id: "secrets",
      severity: secretSeverity === "info" ? "low" : secretSeverity,
      title: `${uniqueSecrets.length} possible hardcoded secret${uniqueSecrets.length > 1 ? "s" : ""}`,
      detail: "Keys inside an APK can be pulled out by anyone. Google API keys are often meant to be public but must be restricted to your app in Google Cloud.",
      fix: "Move secrets to your server; restrict any keys that must ship (package name + SHA-1).",
      items: uniqueSecrets.slice(0, 20),
    });
  else add({ id: "secrets", severity: "pass", title: "No obvious secrets found", detail: "No private keys, cloud tokens or live API secrets matched in the code or assets." });

  const httpUrls = [...new Set(all.filter((s) => /^http:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(s) && !HTTP_IGNORE.test(s)))];
  if (httpUrls.length)
    add({ id: "http", severity: "low", title: `${httpUrls.length} plain http:// URL${httpUrls.length > 1 ? "s" : ""} in the app`, detail: "If the app calls these, the traffic isn't encrypted.", fix: "Switch them to https://.", items: httpUrls.slice(0, 15).map((u) => short(u)) });

  const has = (needle: string) => strings.some((s) => s.includes(needle));
  if (has("AllowAllHostnameVerifier") || has("ALLOW_ALL_HOSTNAME_VERIFIER"))
    add({ id: "hostname", severity: "high", title: "Accepts any HTTPS hostname", detail: "An allow-all hostname verifier turns off a key HTTPS check, so a fake server can pretend to be yours.", fix: "Remove the custom HostnameVerifier and use the default." });
  if (has("addJavascriptInterface"))
    add({ id: "webview", severity: "low", title: "WebView JavaScript bridge used", detail: "addJavascriptInterface exposes app code to web pages. That's safe only if the WebView loads your own trusted HTTPS pages.", fix: "Load only trusted HTTPS content in WebViews with a JS bridge." });

  // Obfuscation: share of class names like La/b; that R8/ProGuard produce.
  const classes = strings.filter((s) => s.startsWith("L") && s.endsWith(";") && s.includes("/") && !/^L(android|androidx|java|javax|kotlin|kotlinx|dalvik|com\/google|org\/)/.test(s));
  const shortNames = classes.filter((s) => /\/[a-zA-Z]{1,2};$/.test(s)).length;
  const obfuscated = classes.length > 50 && shortNames / classes.length > 0.15;
  const flutter = names.some((n) => /lib\/[^/]+\/libflutter\.so$/.test(n));
  const reactNative = names.some((n) => n.endsWith("index.android.bundle"));
  if (flutter)
    add({ id: "obf", severity: "info", title: "Flutter app", detail: "Your Dart code is compiled to native code in libapp.so, which is harder to read than Java/Kotlin, but class and method names can still be recovered.", fix: "Build with --obfuscate --split-debug-info to hide Dart names." });
  else if (obfuscated) add({ id: "obf", severity: "pass", title: "Code is obfuscated", detail: "Class names are shortened (R8/ProGuard), which makes reverse engineering harder." });
  else if (classes.length > 50)
    add({ id: "obf", severity: "low", title: "Code isn't obfuscated", detail: "Class and method names are readable, so the app is easy to reverse engineer.", fix: "Turn on R8 (minifyEnabled true) for release builds." });

  const rootCheck = strings.some((s) => /rootbeer|isRooted|RootDetect|SafetyNet|PlayIntegrity|com\.google\.android\.play\.core\.integrity|\/system\/xbin\/su/i.test(s));
  add(
    rootCheck
      ? { id: "root", severity: "pass", title: "Root / integrity checks found", detail: "The app looks for rooted devices or uses Play Integrity." }
      : { id: "root", severity: "info", title: "No root or integrity check found", detail: "No sign of root detection or Play Integrity. For banking and payment apps these help block tampered devices.", fix: "Consider the Play Integrity API." },
  );

  await step("Building the report");
  const abis = [...new Set(names.map((n) => /^lib\/([^/]+)\//.exec(n)?.[1]).filter(Boolean) as string[])];
  const order: Severity[] = ["high", "medium", "low", "info", "pass"];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const score = Math.max(0, 100 - findings.reduce((s, f) => s + SEVERITY_COST[f.severity], 0));
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  return {
    fileName: file.name,
    fileSize: file.size,
    packageName: String(manifest.attrs.package ?? "unknown"),
    versionName: String(manifest.attrs.versionName ?? "—"),
    versionCode: String(manifest.attrs.versionCode ?? "—"),
    minSdk,
    targetSdk,
    framework: flutter ? "Flutter" : reactNative ? "React Native" : "Native (Kotlin/Java)",
    abis,
    permissions,
    counts: {
      activities: comps("activity").length,
      services: comps("service").length,
      receivers: comps("receiver").length,
      providers: comps("provider").length,
      dexFiles: dexNames.length,
      strings: strings.length,
    },
    findings,
    score,
    grade,
  };
}
