// Google Play rules used by the Play Store Readiness Check. Google changes these every year
// (a new target API level each August), so everything time-sensitive lives here.
// Check https://developer.android.com/google/play/requirements/target-sdk when updating.

export const RULES_AS_OF = "October 2026";

// New apps and app updates must target this API level.
export const REQUIRED_TARGET_SDK = 36; // Android 16
export const REQUIRED_TARGET_SINCE = "August 31, 2026";
export const ANDROID_NAME: Record<number, string> = { 30: "11", 31: "12", 32: "12L", 33: "13", 34: "14", 35: "15", 36: "16", 37: "17" };

// Play Billing Library: versions older than this can't be used in new apps or updates.
export const MIN_BILLING_MAJOR = 8;

// Permissions that need a Play Console declaration (App content → Sensitive app permissions)
// or are only allowed for certain kinds of apps.
export type PermRule = { perms: string[]; title: string; why: string; fix: string };
export const DECLARE_PERMS: PermRule[] = [
  {
    perms: ["READ_SMS", "SEND_SMS", "RECEIVE_SMS", "RECEIVE_MMS", "RECEIVE_WAP_PUSH", "READ_CALL_LOG", "WRITE_CALL_LOG", "PROCESS_OUTGOING_CALLS"],
    title: "SMS or Call Log permissions",
    why: "Only allowed for the default SMS, phone or assistant app, or a few listed exceptions. Most apps get rejected.",
    fix: "Remove them (use the SMS Retriever / User Consent API for OTP codes), or fill in the Permissions Declaration form in Play Console.",
  },
  {
    perms: ["QUERY_ALL_PACKAGES"],
    title: "See all installed apps (QUERY_ALL_PACKAGES)",
    why: "Only allowed when seeing every app is core to your app (launchers, antivirus, device management…).",
    fix: "Use a <queries> block for the specific apps you need, or declare it in Play Console.",
  },
  {
    perms: ["MANAGE_EXTERNAL_STORAGE"],
    title: "All files access (MANAGE_EXTERNAL_STORAGE)",
    why: "Only for file managers, backup and antivirus apps and similar.",
    fix: "Use the Storage Access Framework or MediaStore instead, or submit the All files access declaration.",
  },
  {
    perms: ["ACCESS_BACKGROUND_LOCATION"],
    title: "Location in the background",
    why: "Needs a declaration and a short video showing the feature that uses it.",
    fix: "Only ask for it if a core feature needs location while the app is closed; otherwise remove it and use location only while the app is open.",
  },
  {
    perms: ["REQUEST_INSTALL_PACKAGES"],
    title: "Install other apps (REQUEST_INSTALL_PACKAGES)",
    why: "Only allowed when installing apps is a core purpose (app stores, file managers, browsers…). Self-updating is not allowed.",
    fix: "Remove it (Play updates your app), or declare it in Play Console.",
  },
  {
    perms: ["USE_FULL_SCREEN_INTENT"],
    title: "Full-screen notifications (USE_FULL_SCREEN_INTENT)",
    why: "Since Android 14 it's only for calling and alarm apps.",
    fix: "Remove it, or declare it in Play Console if your app's core feature is calls or alarms.",
  },
  {
    perms: ["USE_EXACT_ALARM"],
    title: "Exact alarms (USE_EXACT_ALARM)",
    why: "Only for alarm clock, timer and calendar apps.",
    fix: "Use SCHEDULE_EXACT_ALARM (asks the user) or inexact alarms / WorkManager instead.",
  },
  {
    perms: ["REQUEST_IGNORE_BATTERY_OPTIMIZATIONS"],
    title: "Ask to ignore battery optimization",
    why: "Only allowed when the app's core function breaks with battery optimization on.",
    fix: "Use WorkManager or a foreground service instead, unless your use case is on Google's allowed list.",
  },
  {
    perms: ["READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO"],
    title: "Photo and video access",
    why: "Only apps whose core function needs broad access to photos and videos may keep these. Others must use the photo picker.",
    fix: "Use the Android photo picker (no permission needed), or fill in the Photo and video permissions declaration.",
  },
];

// Foreground service type flags (android.content.pm.ServiceInfo) and the permission each type needs.
export const FGS_TYPES: [flag: number, name: string, perm: string | null][] = [
  [1, "dataSync", "FOREGROUND_SERVICE_DATA_SYNC"],
  [2, "mediaPlayback", "FOREGROUND_SERVICE_MEDIA_PLAYBACK"],
  [4, "phoneCall", "FOREGROUND_SERVICE_PHONE_CALL"],
  [8, "location", "FOREGROUND_SERVICE_LOCATION"],
  [16, "connectedDevice", "FOREGROUND_SERVICE_CONNECTED_DEVICE"],
  [32, "mediaProjection", "FOREGROUND_SERVICE_MEDIA_PROJECTION"],
  [64, "camera", "FOREGROUND_SERVICE_CAMERA"],
  [128, "microphone", "FOREGROUND_SERVICE_MICROPHONE"],
  [256, "health", "FOREGROUND_SERVICE_HEALTH"],
  [512, "remoteMessaging", "FOREGROUND_SERVICE_REMOTE_MESSAGING"],
  [1024, "systemExempted", "FOREGROUND_SERVICE_SYSTEM_EXEMPTED"],
  [2048, "shortService", null],
  [4096, "fileManagement", "FOREGROUND_SERVICE_FILE_MANAGEMENT"],
  [8192, "mediaProcessing", "FOREGROUND_SERVICE_MEDIA_PROCESSING"],
  [1073741824, "specialUse", "FOREGROUND_SERVICE_SPECIAL_USE"],
];

// SDKs that collect user data, for the Data safety form. Matched against code and manifest names.
export const DATA_SDKS: [needle: string, name: string][] = [
  ["com/google/firebase/analytics", "Firebase Analytics"],
  ["com.google.firebase.analytics", "Firebase Analytics"],
  ["com/google/firebase/crashlytics", "Firebase Crashlytics"],
  ["com.google.firebase.crashlytics", "Firebase Crashlytics"],
  ["com/google/firebase/messaging", "Firebase Cloud Messaging"],
  ["com.google.firebase.messaging", "Firebase Cloud Messaging"],
  ["com.google.android.gms.ads.APPLICATION_ID", "Google AdMob"],
  ["com/google/android/gms/ads/MobileAds", "Google AdMob"],
  ["com.facebook.sdk.ApplicationId", "Facebook SDK"],
  ["com/facebook/FacebookSdk", "Facebook SDK"],
  ["com/appsflyer/", "AppsFlyer"],
  ["com/adjust/sdk/", "Adjust"],
  ["com/onesignal/", "OneSignal"],
  ["io/sentry/", "Sentry"],
  ["com/mixpanel/", "Mixpanel"],
  ["com/amplitude/", "Amplitude"],
  ["com/google/android/gms/maps", "Google Maps"],
  ["com/huawei/hms/", "Huawei Mobile Services"],
];
