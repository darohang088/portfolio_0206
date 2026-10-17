// Library list for the ProGuard / R8 Rules Generator.
// "add": you need these rules in proguard-rules.pro.
// "builtin": the library ships its own rules (consumer rules), so nothing to add.
// "check": only needed in some setups (older versions, R8 full mode, specific errors).
// Rules reflect library versions current in 2025; libraries update their bundled rules over time.

export type Need = "add" | "builtin" | "check";
export type Ctx = { modelPkg: string; appPkg: string };
export type Lib = {
  id: string;
  name: string;
  group: string;
  need: Need;
  note: string;
  rules?: (c: Ctx) => string[];
};

const pkg = (p: string, fallback: string) => (p.trim() || fallback).replace(/\.\*+$/, "");

export const GROUPS = ["Your app", "Networking & JSON", "Android & Jetpack", "Firebase & Google", "Images & media", "Flutter"];

export const LIBS: Lib[] = [
  // ---------- Your app ----------
  {
    id: "models",
    name: "JSON model classes (data classes for API responses)",
    group: "Your app",
    need: "add",
    note: "R8 renames and removes fields it thinks are unused. Gson, Moshi (reflection) and Jackson read fields by name, so in release builds your models come back empty or crash. Keep them, or add @Keep / @SerializedName to every field.",
    rules: (c) => [`-keep class ${pkg(c.modelPkg, "com.example.app.data.model")}.** { *; }`],
  },
  {
    id: "crash",
    name: "Readable crash reports (line numbers)",
    group: "Your app",
    need: "add",
    note: "Keeps file names and line numbers so Play Console and Crashlytics stack traces point to the right line. Upload mapping.txt (Play does this for AABs) to see real class names.",
    rules: () => ["-keepattributes SourceFile,LineNumberTable", "-renamesourcefileattribute SourceFile"],
  },
  {
    id: "keep-annotation",
    name: "@Keep annotation",
    group: "Your app",
    need: "builtin",
    note: "androidx.annotation.Keep is honoured by the default Android rules: anything marked @Keep is not removed or renamed. A simple way to protect single classes without writing rules.",
  },
  {
    id: "serializable",
    name: "java.io.Serializable classes",
    group: "Your app",
    need: "add",
    note: "Only needed if you serialise objects with Java serialization (e.g. passing Serializable in Intents or saving to disk). Keeps the fields and methods Java serialization uses.",
    rules: () => [
      "-keepclassmembers class * implements java.io.Serializable {",
      "    static final long serialVersionUID;",
      "    private static final java.io.ObjectStreamField[] serialPersistentFields;",
      "    private void writeObject(java.io.ObjectOutputStream);",
      "    private void readObject(java.io.ObjectInputStream);",
      "    java.lang.Object writeReplace();",
      "    java.lang.Object readResolve();",
      "}",
    ],
  },
  {
    id: "parcelable",
    name: "Parcelable / @Parcelize",
    group: "Your app",
    need: "builtin",
    note: "The default proguard-android-optimize.txt already keeps every Parcelable CREATOR field. Nothing to add.",
  },
  {
    id: "enums",
    name: "Enums",
    group: "Your app",
    need: "builtin",
    note: "The default Android rules keep values() and valueOf(). If enums are parsed from JSON by name with Gson, see the Gson entry.",
  },
  {
    id: "webview",
    name: "WebView JavaScript interface (@JavascriptInterface)",
    group: "Your app",
    need: "add",
    note: "Methods called from JavaScript are invisible to R8 and get removed. Keep the bridge class's @JavascriptInterface methods (change the class name to yours).",
    rules: (c) => [`-keepclassmembers class ${pkg(c.appPkg, "com.example.app")}.** {`, "    @android.webkit.JavascriptInterface <methods>;", "}"],
  },

  // ---------- Networking & JSON ----------
  {
    id: "retrofit",
    name: "Retrofit",
    group: "Networking & JSON",
    need: "check",
    note: "Retrofit 2.10+ ships complete rules. On older versions with R8 full mode (default since Android Gradle Plugin 8), suspend functions and Call<T> lose their generic types and crash with \"Unable to create call adapter\". Add these if you're on Retrofit 2.9 or older.",
    rules: () => [
      "-keepattributes Signature, InnerClasses, EnclosingMethod",
      "-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations, AnnotationDefault",
      "-keep,allowobfuscation,allowshrinking interface retrofit2.Call",
      "-keep,allowobfuscation,allowshrinking class retrofit2.Response",
      "-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation",
      "-keepclassmembers,allowshrinking,allowobfuscation interface * {",
      "    @retrofit2.http.* <methods>;",
      "}",
    ],
  },
  {
    id: "okhttp",
    name: "OkHttp",
    group: "Networking & JSON",
    need: "check",
    note: "OkHttp ships its own rules. If R8 reports missing classes from optional TLS providers (Conscrypt, BouncyCastle, OpenJSSE), these -dontwarn lines silence them safely.",
    rules: () => ["-dontwarn org.conscrypt.**", "-dontwarn org.bouncycastle.**", "-dontwarn org.openjsse.**"],
  },
  {
    id: "gson",
    name: "Gson",
    group: "Networking & JSON",
    need: "add",
    note: "Gson 2.11+ ships basic rules, but your model classes still need keeping (see \"JSON model classes\"). These also keep generic type info for TypeToken (List<User> etc.) and @SerializedName fields, including enums parsed by name.",
    rules: () => [
      "-keepattributes Signature",
      "-keepattributes *Annotation*",
      "-keep class com.google.gson.reflect.TypeToken { *; }",
      "-keep class * extends com.google.gson.reflect.TypeToken",
      "-keepclassmembers,allowobfuscation class * {",
      "    @com.google.gson.annotations.SerializedName <fields>;",
      "}",
      "-keepclassmembers enum * {",
      "    @com.google.gson.annotations.SerializedName <fields>;",
      "}",
    ],
  },
  {
    id: "moshi-codegen",
    name: "Moshi with codegen (@JsonClass(generateAdapter = true))",
    group: "Networking & JSON",
    need: "builtin",
    note: "Generated adapters come with their own rules. Nothing to add.",
  },
  {
    id: "moshi-reflect",
    name: "Moshi with KotlinJsonAdapterFactory (reflection)",
    group: "Networking & JSON",
    need: "add",
    note: "Reflection needs Kotlin metadata and your model classes. Prefer codegen if you can.",
    rules: () => ["-keep class kotlin.Metadata { *; }", "-keepclassmembers class kotlin.Metadata { public <methods>; }"],
  },
  {
    id: "kotlinx",
    name: "kotlinx.serialization",
    group: "Networking & JSON",
    need: "builtin",
    note: "Version 1.5+ ships rules for @Serializable classes. If you use named companion objects or serializers looked up by reflection, check the library's README.",
  },
  {
    id: "jackson",
    name: "Jackson",
    group: "Networking & JSON",
    need: "add",
    note: "Jackson reads annotations and fields by reflection. Keep annotations and silence optional Java classes Android doesn't have. Your model classes also need keeping.",
    rules: () => ["-keepattributes *Annotation*,EnclosingMethod,Signature", "-keepnames class com.fasterxml.jackson.** { *; }", "-dontwarn com.fasterxml.jackson.databind.**", "-dontwarn java.beans.**"],
  },
  {
    id: "ktor",
    name: "Ktor client",
    group: "Networking & JSON",
    need: "check",
    note: "Ktor ships rules, but some versions make R8 report JVM-only classes. Add if you see \"Missing class java.lang.management…\".",
    rules: () => ["-dontwarn java.lang.management.**", "-dontwarn org.slf4j.**"],
  },

  // ---------- Android & Jetpack ----------
  { id: "room", name: "Room", group: "Android & Jetpack", need: "builtin", note: "Room generates code and ships its rules. Nothing to add." },
  { id: "hilt", name: "Hilt / Dagger", group: "Android & Jetpack", need: "builtin", note: "Generated code, rules included. Nothing to add." },
  { id: "compose", name: "Jetpack Compose", group: "Android & Jetpack", need: "builtin", note: "Compose ships rules; R8 actually makes Compose apps faster. Nothing to add." },
  { id: "navigation", name: "Navigation (Safe Args, type-safe routes)", group: "Android & Jetpack", need: "builtin", note: "Safe Args and type-safe routes (@Serializable) are covered by the library and kotlinx.serialization rules on current versions. If routes fail only in release, mark the route classes with @Keep." },
  { id: "workmanager", name: "WorkManager", group: "Android & Jetpack", need: "builtin", note: "Workers are created by reflection, but WorkManager ships the needed rules. Nothing to add." },
  { id: "coroutines", name: "Kotlin Coroutines / Flow", group: "Android & Jetpack", need: "builtin", note: "Rules included. Nothing to add." },
  { id: "datastore", name: "DataStore (Proto)", group: "Android & Jetpack", need: "add", note: "Proto DataStore uses protobuf-lite generated classes, whose fields are read by reflection.", rules: () => ["-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite {", "    <fields>;", "}"] },

  // ---------- Firebase & Google ----------
  { id: "firebase", name: "Firebase (Auth, Firestore, Messaging, Analytics…)", group: "Firebase & Google", need: "builtin", note: "Firebase SDKs ship their rules. For Firestore toObject() with your own classes, keep your model classes (see \"JSON model classes\")." },
  { id: "crashlytics", name: "Firebase Crashlytics", group: "Firebase & Google", need: "add", note: "Readable stack traces and keeping custom exception names in reports.", rules: () => ["-keepattributes SourceFile,LineNumberTable", "-keep public class * extends java.lang.Exception"] },
  { id: "play-services", name: "Google Play services (Maps, Location, Sign-In)", group: "Firebase & Google", need: "builtin", note: "Rules included. Nothing to add." },
  { id: "mlkit", name: "ML Kit", group: "Firebase & Google", need: "builtin", note: "Rules included. Nothing to add." },
  { id: "play-billing", name: "Google Play Billing", group: "Firebase & Google", need: "builtin", note: "Rules included. Nothing to add." },

  // ---------- Images & media ----------
  { id: "glide", name: "Glide", group: "Images & media", need: "builtin", note: "Glide ships rules, including for your AppGlideModule. Nothing to add." },
  { id: "coil", name: "Coil", group: "Images & media", need: "builtin", note: "Rules included. Nothing to add." },
  { id: "lottie", name: "Lottie", group: "Images & media", need: "builtin", note: "Rules included. Nothing to add." },
  { id: "exoplayer", name: "Media3 / ExoPlayer", group: "Images & media", need: "builtin", note: "Rules included, including for optional extensions loaded by reflection." },

  // ---------- Flutter ----------
  {
    id: "flutter-playcore",
    name: "Flutter: \"Missing class com.google.android.play.core…\" error",
    group: "Flutter",
    need: "check",
    note: "A common release-build failure on Flutter with Android Gradle Plugin 8+: R8 can't find Play Core classes used by deferred components. If you don't use deferred components, these lines fix the build.",
    rules: () => ["-dontwarn com.google.android.play.core.splitcompat.SplitCompatApplication", "-dontwarn com.google.android.play.core.splitinstall.**", "-dontwarn com.google.android.play.core.tasks.**"],
  },
  {
    id: "flutter-plugins",
    name: "Flutter plugins with native Android code",
    group: "Flutter",
    need: "builtin",
    note: "Flutter's Gradle plugin applies its own rules and most plugins ship theirs. If a plugin works in debug but not in release, check its README for ProGuard rules, or use the \"Missing class\" fixer below.",
  },
];

// Turn R8's "Missing class …" errors into -dontwarn lines, grouped by package.
export function dontwarnFromErrors(text: string): string[] {
  const classes = new Set<string>();
  for (const m of text.matchAll(/Missing class(?:es)?:?\s+([\w$.]+)/g)) classes.add(m[1]);
  // Lines from missing_rules.txt are already "-dontwarn x.y.Z".
  for (const m of text.matchAll(/-dontwarn\s+([\w$.*]+)/g)) classes.add(m[1]);
  const out = new Set<string>();
  for (const c of classes) {
    if (c.endsWith(".**")) {
      out.add(c);
      continue;
    }
    const parts = c.split(".");
    // Silence the whole package when it's a library (3+ parts), otherwise the single class.
    out.add(parts.length > 3 ? `${parts.slice(0, -1).join(".")}.**` : c);
  }
  return [...out].sort().map((x) => `-dontwarn ${x}`);
}
