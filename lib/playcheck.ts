// Play Store Readiness Check: reads a native Android APK in the browser and checks it against
// Google Play's publishing requirements, restricted-permission policies, Android 14–16 behaviour
// changes, deprecated SDKs and common security settings. Rules live in data/playRules.ts.

import { unzip, type Unzipped } from "fflate";
import { parseAxml, findAll, type XmlNode } from "./apk/axml";
import { dexStrings } from "./apk/dex";
import { hasSigningBlock } from "./apk/analyze";
import { checkPageSize } from "./pagesize";
import { ANDROID_NAME, DATA_SDKS, DECLARE_PERMS, FGS_TYPES, MIN_BILLING_MAJOR, REQUIRED_TARGET_SDK, REQUIRED_TARGET_SINCE, RULES_AS_OF } from "@/data/playRules";

export type Status = "fail" | "warn" | "declare" | "pass" | "na";
export type Confidence = "certain" | "likely" | "check";
export type Check = { id: string; group: Group; status: Status; confidence: Confidence; title: string; detail: string; fix?: string; items?: string[] };
export type Group = "required" | "permissions" | "android" | "sdks" | "security";
export const GROUPS: { id: Group; title: string; blurb: string }[] = [
  { id: "required", title: "Required to publish", blurb: "Google Play blocks or rejects uploads that fail these." },
  { id: "permissions", title: "Permissions & Play Console declarations", blurb: "Restricted permissions that need a declaration form, or are only allowed for some apps." },
  { id: "android", title: "Android 13–16 changes", blurb: "Behaviour that changes when you raise targetSdk. Problems here cause crashes or broken screens." },
  { id: "sdks", title: "Libraries & SDKs", blurb: "Deprecated Google APIs, billing version and SDKs to list in the Data safety form." },
  { id: "security", title: "Security", blurb: "Settings reviewers and security teams look for, especially in finance apps." },
];

export type PlayReport = {
  fileName: string;
  packageName: string;
  versionName: string;
  versionCode: string;
  minSdk?: number;
  targetSdk?: number;
  checks: Check[];
  counts: Record<Status, number>;
  passed: number;
  total: number; // checks with a pass / fail answer (declarations and "n/a" don't count)
  rulesAsOf: string;
};

const unzipAsync = (data: Uint8Array, filter: (name: string) => boolean) =>
  new Promise<Unzipped>((resolve, reject) => unzip(data, { filter: (f) => filter(f.name) }, (err, out) => (err ? reject(err) : resolve(out))));

const bool = (v: unknown) => v === true || v === "true";
const short = (n: string) => n.replace(/^android\.permission\./, "");
const androidName = (sdk: number) => `API ${sdk}${ANDROID_NAME[sdk] ? ` (Android ${ANDROID_NAME[sdk]})` : ""}`;

// The v2+ signing block sits just before the zip's central directory; return it to look inside.
function signingBlock(buf: Uint8Array): Uint8Array | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--)
    if (dv.getUint32(i, true) === 0x06054b50) {
      const cd = dv.getUint32(i + 16, true);
      if (cd < 32 || cd > buf.length || new TextDecoder().decode(buf.subarray(cd - 16, cd)) !== "APK Sig Block 42") return null;
      const size = Number(dv.getBigUint64(cd - 24, true));
      return buf.subarray(Math.max(0, cd - 8 - size), cd);
    }
  return null;
}

const hasAscii = (hay: Uint8Array, needle: string) => {
  const n = new TextEncoder().encode(needle);
  outer: for (let i = 0; i + n.length <= hay.length; i++) {
    for (let j = 0; j < n.length; j++) if (hay[i + j] !== n[j]) continue outer;
    return true;
  }
  return false;
};

// windowOptOutEdgeToEdgeEnforcement = true inside any theme: in resources.arsc a style item is the
// attribute id (0x0101069a) followed by a boolean Res_value (size 8, type 0x12) with non-zero data.
function themeOptsOutOfEdgeToEdge(arsc: Uint8Array | undefined): boolean {
  if (!arsc) return false;
  for (let i = 0; i + 12 <= arsc.length; i += 4)
    if (arsc[i] === 0x9a && arsc[i + 1] === 0x06 && arsc[i + 2] === 0x01 && arsc[i + 3] === 0x01 && arsc[i + 4] === 8 && arsc[i + 5] === 0 && arsc[i + 7] === 0x12)
      if (arsc[i + 8] | arsc[i + 9] | arsc[i + 10] | arsc[i + 11]) return true;
  return false;
}

export async function checkPlayReadiness(file: File, step: (label: string) => Promise<void> = async () => {}): Promise<PlayReport> {
  await step("Unzipping the APK");
  const raw = new Uint8Array(await file.arrayBuffer());
  if (raw[0] !== 0x50 || raw[1] !== 0x4b) throw new Error("not-apk");
  const names: string[] = [];
  const files = await unzipAsync(raw, (name) => {
    names.push(name);
    return name === "AndroidManifest.xml" || /^classes\d*\.dex$/.test(name) || name === "resources.arsc" || /^res\/xml\/[^/]+\.xml$/.test(name) || /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(name);
  });
  if (names.includes("BundleConfig.pb") || names.includes("base/manifest/AndroidManifest.xml")) throw new Error("aab");
  if (!files["AndroidManifest.xml"]) throw new Error("not-apk");

  await step("Reading the manifest");
  const manifest = parseAxml(files["AndroidManifest.xml"]);
  if (!manifest) throw new Error("bad-manifest");
  const root = findAll(manifest, "manifest")[0] ?? manifest;
  const app = findAll(manifest, "application")[0] ?? { name: "application", attrs: {}, children: [] };
  const usesSdk = findAll(manifest, "uses-sdk")[0];
  const minSdk = usesSdk ? Number(usesSdk.attrs.minSdkVersion) || undefined : undefined;
  const targetSdk = usesSdk ? Number(usesSdk.attrs.targetSdkVersion) || minSdk : undefined;
  const tsdk = targetSdk ?? 0;
  const perms = new Set(findAll(manifest, "uses-permission").map((n) => short(String(n.attrs.name ?? ""))));
  const metas = new Map(findAll(manifest, "meta-data").map((m) => [String(m.attrs.name ?? ""), m.attrs.value]));
  const components = (["activity", "activity-alias", "service", "receiver", "provider"] as const).flatMap((tag) => findAll(app, tag).map((n) => ({ tag, n })));
  const compName = (n: XmlNode) => String(n.attrs.name ?? "?");

  await step("Reading the code");
  let code = "";
  for (const n of Object.keys(files).filter((x) => /^classes\d*\.dex$/.test(x)).sort()) code += dexStrings(files[n]).join("\n") + "\n";
  const manifestText = JSON.stringify(manifest);
  const inCode = (s: string) => code.includes(s);
  const anywhere = (s: string) => code.includes(s) || manifestText.includes(s);

  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);

  // ---------- Required to publish ----------
  if (targetSdk === undefined)
    add({ id: "target", group: "required", status: "fail", confidence: "certain", title: "No targetSdk found", detail: "The manifest has no targetSdkVersion, so Android treats the app as very old.", fix: `Set targetSdk = ${REQUIRED_TARGET_SDK} in build.gradle.` });
  else if (targetSdk >= REQUIRED_TARGET_SDK)
    add({ id: "target", group: "required", status: "pass", confidence: "certain", title: `Targets ${androidName(targetSdk)}`, detail: `Meets Google Play's requirement of ${androidName(REQUIRED_TARGET_SDK)} for new apps and updates.` });
  else
    add({
      id: "target",
      group: "required",
      status: "fail",
      confidence: "certain",
      title: `Targets ${androidName(targetSdk)}, below Play's requirement`,
      detail: `Since ${REQUIRED_TARGET_SINCE}, new apps and app updates must target ${androidName(REQUIRED_TARGET_SDK)} or higher. Play Console won't accept this upload.`,
      fix: `Set targetSdk = ${REQUIRED_TARGET_SDK} (and compileSdk ${REQUIRED_TARGET_SDK}) in build.gradle, then go through the Android ${ANDROID_NAME[REQUIRED_TARGET_SDK] ?? ""} behaviour changes below.`,
    });

  add(
    bool(app.attrs.debuggable)
      ? { id: "debuggable", group: "required", status: "fail", confidence: "certain", title: "Debuggable build", detail: "android:debuggable is true. Google Play rejects debuggable APKs, and anyone could attach a debugger.", fix: "Upload a release build (./gradlew bundleRelease or assembleRelease)." }
      : { id: "debuggable", group: "required", status: "pass", confidence: "certain", title: "Release build (not debuggable)", detail: "Debuggers can't attach to this build." },
  );
  if (bool(app.attrs.testOnly) || bool(root.attrs.testOnly))
    add({ id: "testonly", group: "required", status: "fail", confidence: "certain", title: "Marked as test-only", detail: "android:testOnly is set (it comes from running the app from Android Studio). Google Play rejects these APKs.", fix: "Build with Gradle (Build → Generate Signed Bundle / APK) instead of copying the APK Android Studio installed." });

  const block = signingBlock(raw);
  const v2 = block !== null || hasSigningBlock(raw);
  const certs = Object.keys(files).filter((n) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/i.test(n));
  const debugKey = (block && hasAscii(block, "Android Debug")) || certs.some((n) => hasAscii(files[n], "Android Debug"));
  if (!v2 && !certs.length)
    add({ id: "signed", group: "required", status: "fail", confidence: "certain", title: "APK isn't signed", detail: "No signature found. Android won't install it and Play won't accept it.", fix: "Sign it with your upload key: Build → Generate Signed Bundle / APK." });
  else {
    if (!v2 && tsdk >= 30)
      add({ id: "v2", group: "required", status: "fail", confidence: "certain", title: "Missing APK Signature Scheme v2", detail: "Apps that target Android 11+ must be signed with signature scheme v2 or newer, or they won't install.", fix: "Sign with the Android Gradle Plugin or apksigner (v2/v3 are on by default); don't use jarsigner alone." });
    else add({ id: "v2", group: "required", status: "pass", confidence: "certain", title: v2 ? "Signed with scheme v2 or newer" : "Signed (v1)", detail: v2 ? "Modern APK signature found." : "Fine for apps that target below Android 11." });
    add(
      debugKey
        ? { id: "debugkey", group: "required", status: "fail", confidence: "certain", title: "Signed with the debug key", detail: "The certificate is \"Android Debug\", Android Studio's shared debug key. Play rejects it.", fix: "Sign with your own upload key (and use Play App Signing)." }
        : { id: "debugkey", group: "required", status: "pass", confidence: "certain", title: "Signed with a release key", detail: "Not the Android Studio debug key." },
    );
  }

  const libAbis = new Set(names.map((n) => /^lib\/([^/]+)\/[^/]+\.so$/.exec(n)?.[1]).filter((x): x is string => !!x));
  if (libAbis.size) {
    const has64 = libAbis.has("arm64-v8a") || libAbis.has("x86_64");
    const has32 = libAbis.has("armeabi-v7a") || libAbis.has("x86") || libAbis.has("armeabi");
    add(
      has32 && !has64
        ? { id: "64bit", group: "required", status: "fail", confidence: "certain", title: "No 64-bit native code", detail: `Native libraries only for ${[...libAbis].join(", ")}. Google Play requires a 64-bit version (arm64-v8a).`, fix: "Add arm64-v8a to abiFilters (or remove abiFilters) and rebuild, and update libraries that ship 32-bit only." }
        : { id: "64bit", group: "required", status: "pass", confidence: "certain", title: "64-bit native code included", detail: `Native libraries for ${[...libAbis].sort().join(", ")}.` },
    );
    await step("Checking 16 KB page size");
    const ps = await checkPageSize(file).catch(() => null);
    // Only 64-bit libraries need 16 KB support; a 32-bit-only app already fails the 64-bit check above.
    if (ps && ps.verdict !== "no-native")
      add(
        ps.verdict === "fail"
          ? {
              id: "16kb",
              group: "required",
              status: "fail",
              confidence: "certain",
              title: "Not ready for 16 KB page size",
              detail: "Google Play requires 16 KB page size support for apps that target Android 15+. These 64-bit libraries fail:",
              items: [...ps.elfFail.map((l) => `${l.path}: built with ${l.elfAlign === null ? "?" : l.elfAlign / 1024} KB alignment`), ...ps.zipFail.map((l) => `${l.path}: not 16 KB aligned in the APK`)],
              fix: "Update the libraries, build your own C/C++ code with NDK r28+, and use Android Gradle Plugin 8.5.1+. The 16 KB Page Size Checker tool shows details.",
            }
          : { id: "16kb", group: "required", status: "pass", confidence: "certain", title: "Ready for 16 KB page size", detail: "Every 64-bit native library is 16 KB aligned." },
      );
  }

  if (tsdk >= 31) {
    const missing = components.filter(({ n }) => n.attrs.exported === undefined && findAll(n, "intent-filter").length > 0).map(({ tag, n }) => `${tag}: ${compName(n)}`);
    add(
      missing.length
        ? { id: "exported-attr", group: "required", status: "fail", confidence: "certain", title: "android:exported missing", detail: "Apps that target Android 12+ must set android:exported on every component with an intent-filter, or the APK won't install.", items: missing, fix: 'Add android:exported="true" (if other apps must open it) or "false" to each one.' }
        : { id: "exported-attr", group: "required", status: "pass", confidence: "certain", title: "android:exported set where needed", detail: "Every component with an intent-filter says whether other apps can use it." },
    );
  }

  // ---------- Permissions & declarations ----------
  let declared = 0;
  for (const rule of DECLARE_PERMS) {
    const found = rule.perms.filter((p) => perms.has(p));
    if (!found.length) continue;
    if (rule.title.startsWith("Full-screen") && tsdk < 34) continue;
    declared++;
    add({ id: `perm-${rule.perms[0]}`, group: "permissions", status: "declare", confidence: "certain", title: rule.title, detail: rule.why, items: found, fix: rule.fix });
  }
  const svc = (perm: string) => findAll(app, "service").filter((s) => String(s.attrs.permission ?? "") === `android.permission.${perm}`).map(compName);
  for (const [perm, title, why, fix] of [
    ["BIND_ACCESSIBILITY_SERVICE", "Accessibility service", "Using the AccessibilityService API needs a declaration, and it's only allowed to help people with disabilities (or a few listed uses).", "Remove the service, or fill in the AccessibilityService API declaration in Play Console."],
    ["BIND_VPN_SERVICE", "VPN service", "Apps using VpnService must have VPN as a core feature and fill in a declaration.", "Fill in the VpnService declaration in Play Console."],
  ] as const) {
    const s = svc(perm);
    if (s.length) declared++, add({ id: `svc-${perm}`, group: "permissions", status: "declare", confidence: "certain", title, detail: why, items: s, fix });
  }
  const admins = findAll(app, "receiver").filter((r) => String(r.attrs.permission ?? "") === "android.permission.BIND_DEVICE_ADMIN").map(compName);
  if (admins.length) declared++, add({ id: "device-admin", group: "permissions", status: "warn", confidence: "certain", title: "Device admin receiver", detail: "Device admin is deprecated for most uses and is heavily restricted on Google Play.", items: admins, fix: "Use Android Enterprise / device policy controller APIs if this is for work devices." });
  const health = [...perms].filter((p) => p.startsWith("health.") || p.startsWith("android.permission.health."));
  if (health.length) declared++, add({ id: "health", group: "permissions", status: "declare", confidence: "certain", title: "Health Connect permissions", detail: "Health data access needs the Health apps declaration and a privacy policy that covers it.", items: health, fix: "Fill in the Health apps declaration in Play Console." });

  // Foreground services (Android 14+): each type needs its permission, and Play needs a declaration.
  const fgs = findAll(app, "service").filter((s) => s.attrs.foregroundServiceType !== undefined);
  if (perms.has("FOREGROUND_SERVICE") || fgs.length) {
    const typesUsed = new Set<string>();
    const missingPerm: string[] = [];
    for (const s of fgs) {
      const raw = s.attrs.foregroundServiceType;
      const flags = typeof raw === "number" ? raw : NaN;
      const typeNames = Number.isFinite(flags)
        ? FGS_TYPES.filter(([f]) => (flags & f) === f && f !== 0).map(([, name, perm]) => ({ name, perm }))
        : String(raw).split("|").map((name) => ({ name, perm: FGS_TYPES.find(([, n]) => n === name)?.[2] ?? null }));
      for (const t of typeNames) {
        typesUsed.add(t.name);
        if (t.perm && !perms.has(t.perm)) missingPerm.push(`${compName(s)} (${t.name}) needs ${t.perm}`);
      }
    }
    if (tsdk >= 34) {
      if (missingPerm.length) add({ id: "fgs-perm", group: "android", status: "fail", confidence: "certain", title: "Foreground service permission missing", detail: "On Android 14+ starting a foreground service without its type permission throws a SecurityException (crash).", items: missingPerm, fix: "Add the matching <uses-permission> for each foreground service type." });
      else if (perms.has("FOREGROUND_SERVICE") && !fgs.length) add({ id: "fgs-type", group: "android", status: "warn", confidence: "likely", title: "Foreground service without a type", detail: "The app has FOREGROUND_SERVICE but no service declares android:foregroundServiceType. On Android 14+ startForeground() then crashes (unless the type is set by a library at runtime).", fix: 'Add android:foregroundServiceType="…" to each foreground service and its FOREGROUND_SERVICE_* permission.' });
      else add({ id: "fgs-perm", group: "android", status: "pass", confidence: "certain", title: "Foreground services have types and permissions", detail: "Every foreground service type has its permission." });
      if (typesUsed.size) declared++, add({ id: "fgs-declare", group: "permissions", status: "declare", confidence: "certain", title: "Foreground service types", detail: "Apps that target Android 14+ must explain each foreground service type in Play Console, often with a short video.", items: [...typesUsed], fix: "Play Console → App content → Foreground service permissions." });
    }
  }
  if (!declared) add({ id: "perm-none", group: "permissions", status: "pass", confidence: "certain", title: "No restricted permissions", detail: "Nothing in the manifest needs a Play Console permission declaration." });

  // ---------- Android 13–16 changes ----------
  if (tsdk >= 33) {
    // Firebase Cloud Messaging in the manifest means push notifications for sure. Code that builds a
    // notification (setSmallIcon is a framework method R8 can't rename) means it very likely notifies.
    // A plain NotificationManager reference isn't enough: most apps carry it through AndroidX.
    const fcm = manifestText.includes("com.google.firebase.MESSAGING_EVENT") || manifestText.includes("com.google.firebase.messaging");
    const builds = inCode("setSmallIcon");
    if (perms.has("POST_NOTIFICATIONS") && (fcm || builds))
      add({ id: "notif", group: "android", status: "pass", confidence: "certain", title: "Notification permission declared", detail: "POST_NOTIFICATIONS is in the manifest. Remember to ask for it at runtime on Android 13+." });
    else if (fcm)
      add({ id: "notif", group: "android", status: "fail", confidence: "certain", title: "Notification permission missing", detail: "The app receives Firebase push messages but doesn't declare POST_NOTIFICATIONS, so on Android 13+ its notifications are silently blocked.", fix: 'Add <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/> and ask for it at runtime.' });
    else if (builds)
      add({ id: "notif", group: "android", status: "warn", confidence: "likely", title: "Notification permission missing?", detail: "The code builds notifications but the manifest has no POST_NOTIFICATIONS. If the app shows notifications, Android 13+ blocks them.", fix: 'If it does notify: add <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/> and ask for it at runtime.' });
  }
  if (tsdk >= 34 && perms.has("SCHEDULE_EXACT_ALARM") && !perms.has("USE_EXACT_ALARM"))
    add({ id: "exact-alarm", group: "android", status: "warn", confidence: "check", title: "Exact alarms are off by default", detail: "On Android 14+ SCHEDULE_EXACT_ALARM isn't granted on new installs. Calling setExact() without it throws an exception.", fix: "Check canScheduleExactAlarms() first and send the user to the settings screen if needed, or use inexact alarms." });

  if (tsdk >= 35) {
    const optOut = themeOptsOutOfEdgeToEdge(files["resources.arsc"]);
    const insets = ["setOnApplyWindowInsetsListener", "setDecorFitsSystemWindows", "getInsetsIgnoringVisibility", "getSystemWindowInsets", "onApplyWindowInsets"].filter(inCode);
    if (optOut)
      add(
        tsdk >= 36
          ? { id: "e2e", group: "android", status: "fail", confidence: "certain", title: "Edge-to-edge opt-out no longer works", detail: "A theme sets windowOptOutEdgeToEdgeEnforcement, but on Android 16 (targetSdk 36) it's ignored: content will draw under the status and navigation bars.", fix: "Remove the opt-out, call enableEdgeToEdge() and add insets padding (ViewCompat.setOnApplyWindowInsetsListener, or Scaffold / safeDrawingPadding() in Compose)." }
          : { id: "e2e", group: "android", status: "warn", confidence: "certain", title: "Edge-to-edge opted out (temporary)", detail: "A theme sets windowOptOutEdgeToEdgeEnforcement. It works on Android 15 but is ignored once you target Android 16.", fix: "Handle insets now: enableEdgeToEdge() plus insets padding on each screen." },
      );
    else
      add(
        insets.length
          ? { id: "e2e", group: "android", status: "warn", confidence: "check", title: "Edge-to-edge: test on a device", detail: "Android 15+ draws your app behind the system bars. The code handles window insets, but check screens with bottom buttons, bottom navigation, keyboards and full-screen images.", items: insets.map((x) => `uses ${x}`), fix: "Test with gesture navigation and 3-button navigation, in light and dark mode." }
          : { id: "e2e", group: "android", status: "warn", confidence: "likely", title: "Edge-to-edge: no inset handling found", detail: "Android 15+ draws your app behind the status and navigation bars, and no window-insets code was found. Buttons and text may end up under the bars.", fix: "Call enableEdgeToEdge() and apply insets: ViewCompat.setOnApplyWindowInsetsListener for Views, Scaffold or Modifier.safeDrawingPadding() for Compose." },
      );
  }

  const backFlag = (n: XmlNode) => n.attrs.enableOnBackInvokedCallback;
  const predictiveOff = backFlag(app) === false || backFlag(app) === "false";
  if (tsdk >= 36 && !predictiveOff) {
    const newApi = inCode("OnBackInvokedCallback") || inCode("registerOnBackInvokedCallback");
    add({
      id: "back",
      group: "android",
      status: "warn",
      confidence: "check",
      title: "Predictive back is on by default",
      detail: `On Android 16 (targetSdk 36) onBackPressed() and KEYCODE_BACK are no longer called for back gestures${newApi ? ". The code uses the new back APIs, but test custom back handling" : ""}.`,
      fix: "Move custom back logic to OnBackPressedCallback (Views) or BackHandler (Compose), then test back on every screen.",
    });
  } else if (predictiveOff && tsdk >= 36)
    add({ id: "back", group: "android", status: "warn", confidence: "certain", title: "Predictive back turned off", detail: 'android:enableOnBackInvokedCallback="false" keeps the old behaviour for now, but Google plans to remove this opt-out.', fix: "Move custom back logic to OnBackPressedCallback / BackHandler and remove the opt-out." });

  if (tsdk >= 36) {
    const FIXED = new Set([0, 1, 5, 6, 7, 8, 9, 11, 12, 14]);
    const locked = findAll(app, "activity")
      .filter((a) => (typeof a.attrs.screenOrientation === "number" && FIXED.has(a.attrs.screenOrientation)) || /^(portrait|landscape|sensorPortrait|sensorLandscape|reversePortrait|reverseLandscape|userPortrait|userLandscape|nosensor|locked)$/.test(String(a.attrs.screenOrientation ?? "")) || a.attrs.resizeableActivity === false || a.attrs.minAspectRatio !== undefined || a.attrs.maxAspectRatio !== undefined)
      .map(compName);
    if (app.attrs.resizeableActivity === false) locked.unshift("application: resizeableActivity=false");
    add(
      locked.length
        ? { id: "large", group: "android", status: "warn", confidence: "certain", title: "Orientation locks are ignored on tablets", detail: "On Android 16, screens 600dp and wider ignore fixed orientation, resizeableActivity=false and aspect-ratio limits. These screens will rotate and resize on tablets and foldables:", items: locked, fix: "Make these layouts work in landscape and in resizable windows, and keep state across rotation (ViewModel / rememberSaveable)." }
        : { id: "large", group: "android", status: "pass", confidence: "certain", title: "No orientation or resize locks", detail: "Nothing changes for tablets and foldables on Android 16." },
    );
  }

  // ---------- Libraries & SDKs ----------
  const billing = metas.get("com.google.android.play.billingclient.version");
  if (billing !== undefined) {
    const major = parseInt(String(billing), 10);
    add(
      major >= MIN_BILLING_MAJOR
        ? { id: "billing", group: "sdks", status: "pass", confidence: "certain", title: `Play Billing Library ${billing}`, detail: `Version ${MIN_BILLING_MAJOR} or newer is required, and this meets it.` }
        : { id: "billing", group: "sdks", status: "fail", confidence: "certain", title: `Old Play Billing Library (${billing})`, detail: `New apps and updates must use Play Billing Library ${MIN_BILLING_MAJOR} or newer.`, fix: `Update com.android.billingclient:billing to ${MIN_BILLING_MAJOR}.x or newer.` },
    );
  }
  const safetyNet = inCode("com/google/android/gms/safetynet/") || anywhere("com.google.android.gms.safetynet");
  add(
    safetyNet
      ? { id: "safetynet", group: "sdks", status: "fail", confidence: "likely", title: "Uses the SafetyNet Attestation API", detail: "SafetyNet Attestation has been shut down. Root / tamper checks that rely on it don't work anymore.", fix: "Move to the Play Integrity API (com.google.android.play:integrity)." }
      : { id: "safetynet", group: "sdks", status: "pass", confidence: "likely", title: "No SafetyNet found", detail: inCode("com/google/android/play/core/integrity") ? "Uses the Play Integrity API." : "The deprecated SafetyNet Attestation API isn't in the code." },
  );
  if (inCode("com/google/android/gms/auth/api/signin/GoogleSignIn") || inCode("GoogleSignInOptions"))
    add({ id: "gsignin", group: "sdks", status: "warn", confidence: "likely", title: "Legacy Google Sign-In", detail: "The old Google Sign-In for Android API (GoogleSignInClient) is deprecated and being removed.", fix: "Move to Credential Manager with Sign in with Google (androidx.credentials + googleid)." });

  const adsId = inCode("com/google/android/gms/ads/identifier/AdvertisingIdClient") || metas.has("com.google.android.gms.ads.APPLICATION_ID");
  if (perms.has("com.google.android.gms.permission.AD_ID"))
    add({ id: "adid", group: "sdks", status: "declare", confidence: "certain", title: "Uses the Advertising ID", detail: "The AD_ID permission is in the manifest (often added by a library). Play Console asks about it.", fix: "Answer the Advertising ID question in Play Console → App content. If you don't use it, remove it with tools:node=\"remove\"." });
  else if (adsId && tsdk >= 33)
    add({ id: "adid", group: "sdks", status: "warn", confidence: "likely", title: "Advertising ID without AD_ID permission", detail: "The code reads the Advertising ID but the manifest lacks the AD_ID permission, so on Android 13+ it returns zeros.", fix: "Add <uses-permission android:name=\"com.google.android.gms.permission.AD_ID\"/>, and declare it in Play Console." });

  const sdks = [...new Set(DATA_SDKS.filter(([needle]) => anywhere(needle)).map(([, name]) => name))];
  if (sdks.length) add({ id: "datasafety", group: "sdks", status: "declare", confidence: "likely", title: "SDKs to list in the Data safety form", detail: "These SDKs collect data (analytics, crash reports, device IDs…). Your Data safety answers must include what they collect.", items: sdks, fix: "Check each SDK's data-disclosure page and update Play Console → App content → Data safety." });

  // ---------- Security ----------
  const nsc = Object.keys(files).filter((n) => n.startsWith("res/xml/")).map((n) => parseAxml(files[n])).find((x) => x?.name === "network-security-config");
  const baseCfg = nsc ? findAll(nsc, "base-config")[0] : undefined;
  const cleartext = bool(app.attrs.usesCleartextTraffic) || (baseCfg && bool(baseCfg.attrs.cleartextTrafficPermitted)) || (tsdk < 28 && app.attrs.usesCleartextTraffic === undefined && !baseCfg);
  add(
    cleartext
      ? { id: "cleartext", group: "security", status: "warn", confidence: "certain", title: "Plain HTTP allowed", detail: "The app can send unencrypted HTTP traffic, which anyone on the same Wi-Fi can read or change.", fix: 'Set android:usesCleartextTraffic="false" and use HTTPS everywhere (allow HTTP only for specific domains in network_security_config.xml if you must).' }
      : { id: "cleartext", group: "security", status: "pass", confidence: "certain", title: "HTTPS only", detail: "Plain HTTP is blocked." },
  );
  const backup = app.attrs.allowBackup === undefined || bool(app.attrs.allowBackup);
  const rules = app.attrs.dataExtractionRules !== undefined || app.attrs.fullBackupContent !== undefined;
  add(
    backup && !rules
      ? { id: "backup", group: "security", status: "warn", confidence: "certain", title: "All app data can be backed up", detail: "allowBackup is on with no rules, so login tokens and local data are copied to cloud backups and device-to-device transfers.", fix: 'Set android:allowBackup="false", or add dataExtractionRules / fullBackupContent that exclude sensitive files.' }
      : { id: "backup", group: "security", status: "pass", confidence: "certain", title: backup ? "Backup limited by rules" : "Backup turned off", detail: backup ? "Backup rules decide what's copied." : "App data isn't copied to backups." },
  );
  const launcher = (n: XmlNode) => findAll(n, "category").some((c) => c.attrs.name === "android.intent.category.LAUNCHER");
  const open = components
    .filter(({ tag, n }) => {
      if (n.attrs.permission) return false;
      const filters = findAll(n, "intent-filter").length > 0;
      const exported = n.attrs.exported === undefined ? (tag === "provider" ? tsdk < 17 : filters) : bool(n.attrs.exported);
      return exported && !launcher(n) && !compName(n).startsWith("com.google.") && !compName(n).startsWith("androidx.");
    })
    .map(({ tag, n }) => `${tag}: ${compName(n)}`);
  add(
    open.length
      ? { id: "exported", group: "security", status: "warn", confidence: "check", title: `${open.length} component${open.length > 1 ? "s" : ""} open to other apps`, detail: "These can be started by any app on the phone without a permission. Make sure each one is meant to be public and checks its input.", items: open.slice(0, 30), fix: 'Set android:exported="false" where other apps don\'t need it, or protect it with android:permission.' }
      : { id: "exported", group: "security", status: "pass", confidence: "certain", title: "No unprotected components", detail: "Only the launcher screen is open to other apps." },
  );

  const counts: Record<Status, number> = { fail: 0, warn: 0, declare: 0, pass: 0, na: 0 };
  for (const c of checks) counts[c.status]++;
  return {
    fileName: file.name,
    packageName: String(root.attrs.package ?? ""),
    versionName: String(root.attrs.versionName ?? ""),
    versionCode: String(root.attrs.versionCode ?? ""),
    minSdk,
    targetSdk,
    checks,
    counts,
    passed: counts.pass,
    total: counts.pass + counts.fail + counts.warn,
    rulesAsOf: RULES_AS_OF,
  };
}
