// Google Play rules for sensitive Android permissions, written in plain words.
// Based on Google Play's Developer Program Policy as of 2025. Play changes these
// often, so the tool links to the live policy search for each item.

export type Level = "restricted" | "high" | "medium" | "low";
export type Disclosure = "required" | "if-not-obvious" | "no";
export type Rule = {
  title: string;
  level: Level;
  what: string;
  play: string; // what Play Console asks for
  disclosure: Disclosure;
  rejections: string[];
  alternative?: string;
  note?: string;
};

const SMS_CALL: Omit<Rule, "title" | "what"> = {
  level: "restricted",
  play: "Fill in the SMS and Call Log permissions declaration (App content → Sensitive app permissions). Allowed only if your app is the default SMS, Phone or Assistant handler, or fits one of Google's listed exceptions.",
  disclosure: "required",
  rejections: [
    "The app isn't the default SMS / Phone handler and its use isn't on Google's exception list",
    "Using it for OTP / verification codes (use the SMS Retriever or SMS User Consent API instead)",
    "Declaration form missing or doesn't match what the app does",
  ],
  alternative: "SMS Retriever API or SMS User Consent API for one-time codes; ACTION_SENDTO intent to let the user send an SMS.",
};

export const PERMISSIONS: Record<string, Rule> = {
  // ---- SMS & call log (restricted) ----
  READ_SMS: { ...SMS_CALL, title: "Read SMS", what: "Reads every text message on the phone." },
  RECEIVE_SMS: { ...SMS_CALL, title: "Receive SMS", what: "Gets incoming text messages as they arrive." },
  SEND_SMS: { ...SMS_CALL, title: "Send SMS", what: "Sends text messages without the user opening an SMS app." },
  RECEIVE_MMS: { ...SMS_CALL, title: "Receive MMS", what: "Gets incoming multimedia messages." },
  RECEIVE_WAP_PUSH: { ...SMS_CALL, title: "Receive WAP push", what: "Gets WAP push messages." },
  READ_CALL_LOG: { ...SMS_CALL, title: "Read call log", what: "Reads the history of calls made and received." },
  WRITE_CALL_LOG: { ...SMS_CALL, title: "Write call log", what: "Edits or deletes the call history." },
  PROCESS_OUTGOING_CALLS: { ...SMS_CALL, title: "Process outgoing calls", what: "Sees and can redirect calls the user makes." },

  // ---- location ----
  ACCESS_BACKGROUND_LOCATION: {
    title: "Background location",
    level: "restricted",
    what: "Gets the user's location while the app isn't open.",
    play: "Fill in the Location permissions declaration (App content → Sensitive app permissions) and upload a short video showing the feature and your disclosure.",
    disclosure: "required",
    rejections: [
      "Background location isn't needed for the app's core feature (e.g. only for ads or analytics)",
      "No in-app prominent disclosure before the permission request, or the video doesn't show it",
      "The feature could work with foreground location only",
    ],
    alternative: "Ask for location only while the app is in use, or use a foreground service with type location for an active task.",
  },
  ACCESS_FINE_LOCATION: {
    title: "Precise location",
    level: "medium",
    what: "Gets the user's exact GPS location while the app is in use.",
    play: "No special form, but it must be listed in the Data safety section. If location is collected for anything the user wouldn't expect, show a prominent disclosure first.",
    disclosure: "if-not-obvious",
    rejections: ["Location sent to ads or analytics SDKs without disclosure", "Data safety section doesn't mention location"],
    alternative: "ACCESS_COARSE_LOCATION if city-level accuracy is enough.",
  },
  ACCESS_COARSE_LOCATION: {
    title: "Approximate location",
    level: "low",
    what: "Gets a rough location (about city block level) while the app is in use.",
    play: "List location in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: ["Data safety section doesn't mention location"],
  },
  ACCESS_MEDIA_LOCATION: {
    title: "Location in photos",
    level: "medium",
    what: "Reads the GPS location saved inside the user's photos.",
    play: "List location in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: ["Photo location used without a clear reason in the app"],
  },

  // ---- files & media ----
  MANAGE_EXTERNAL_STORAGE: {
    title: "All files access",
    level: "restricted",
    what: "Reads and writes every file on shared storage.",
    play: "Fill in the All files access declaration (App content → Sensitive app permissions). Allowed for file managers, backup, antivirus and document apps that truly need it.",
    disclosure: "required",
    rejections: ["The app isn't a file manager, backup, antivirus or similar core use", "The feature works with the Storage Access Framework or MediaStore"],
    alternative: "Storage Access Framework (let the user pick files), MediaStore for media, or app-specific storage.",
  },
  READ_MEDIA_IMAGES: {
    title: "Read photos",
    level: "high",
    what: "Reads all photos on the device (Android 13+).",
    play: "Under the Photo and video permissions policy, only apps whose core feature needs broad photo access may keep this. Others must remove it and use the photo picker. Play Console asks you to declare why.",
    disclosure: "if-not-obvious",
    rejections: ["One-time or occasional photo picking (profile picture, sending an image)", "No declaration explaining the core need for broad access"],
    alternative: "Android Photo Picker (no permission needed), or READ_MEDIA_VISUAL_USER_SELECTED for partial access.",
  },
  READ_MEDIA_VIDEO: {
    title: "Read videos",
    level: "high",
    what: "Reads all videos on the device (Android 13+).",
    play: "Same Photo and video permissions policy as READ_MEDIA_IMAGES: only for apps whose core feature needs broad access, with a declaration in Play Console.",
    disclosure: "if-not-obvious",
    rejections: ["Occasional video picking", "No declaration explaining the core need"],
    alternative: "Android Photo Picker (no permission needed).",
  },
  READ_MEDIA_AUDIO: {
    title: "Read audio files",
    level: "low",
    what: "Reads music and audio files (Android 13+).",
    play: "List it in the Data safety section if you upload or share audio.",
    disclosure: "no",
    rejections: [],
  },
  READ_MEDIA_VISUAL_USER_SELECTED: {
    title: "Selected photos only",
    level: "low",
    what: "Reads only the photos the user chose to share (Android 14+). The privacy-friendly option.",
    play: "Nothing special.",
    disclosure: "no",
    rejections: [],
  },
  READ_EXTERNAL_STORAGE: {
    title: "Read storage (old)",
    level: "medium",
    what: "Reads shared storage on Android 12 and lower. Has no effect on Android 13+.",
    play: "If it's only for old Android, add android:maxSdkVersion=\"32\" so reviewers see it's limited.",
    disclosure: "no",
    rejections: ["Combined with broad media access you can't justify"],
    alternative: "Photo Picker, MediaStore or the Storage Access Framework.",
  },
  WRITE_EXTERNAL_STORAGE: {
    title: "Write storage (old)",
    level: "low",
    what: "Writes to shared storage on Android 9 and lower. Ignored on newer versions.",
    play: "Add android:maxSdkVersion=\"28\" to keep it limited to old devices.",
    disclosure: "no",
    rejections: [],
  },

  // ---- package visibility, install, overlays ----
  QUERY_ALL_PACKAGES: {
    title: "See all installed apps",
    level: "restricted",
    what: "Lists every app installed on the phone.",
    play: "Fill in the Package visibility (QUERY_ALL_PACKAGES) declaration. Allowed for launchers, antivirus, device management, accessibility, banking/wallet security checks and similar core uses.",
    disclosure: "if-not-obvious",
    rejections: ["The app only needs to talk to a few specific apps", "Used for ads, analytics or fingerprinting"],
    alternative: "Declare only the apps you need in a <queries> element in the manifest.",
  },
  REQUEST_INSTALL_PACKAGES: {
    title: "Install other apps",
    level: "restricted",
    what: "Asks the user to install APK files (e.g. self-updates or downloaded apps).",
    play: "Fill in the Request install packages declaration. Allowed for file managers, browsers, enterprise device managers and similar. Self-updating from outside Play is not allowed.",
    disclosure: "required",
    rejections: ["Used to update the app itself outside Google Play", "Downloading or installing other APKs isn't the app's core feature"],
    alternative: "Google Play In-App Updates API for self-updates.",
  },
  SYSTEM_ALERT_WINDOW: {
    title: "Display over other apps",
    level: "high",
    what: "Draws windows on top of other apps (chat heads, overlays). The user must turn it on in Settings.",
    play: "No declaration form, but reviewers and Play Protect check overlays closely. Explain clearly why it's needed before sending the user to Settings.",
    disclosure: "required",
    rejections: ["Overlays that cover other apps' content or ads", "Overlay used to trick users into taps (tapjacking)"],
    alternative: "Notifications or Bubbles API for chat heads.",
  },
  SCHEDULE_EXACT_ALARM: {
    title: "Exact alarms",
    level: "high",
    what: "Schedules alarms that fire at an exact time. Denied by default on Android 14+ for most new installs.",
    play: "Only for features where exact timing is user-visible (alarms, timers, calendar reminders). Play may ask for an Exact alarm declaration.",
    disclosure: "no",
    rejections: ["Used for background syncs or tasks that don't need exact time"],
    alternative: "WorkManager or inexact alarms (setWindow / setAndAllowWhileIdle).",
    note: "Check canScheduleExactAlarms() and handle denial on Android 14+.",
  },
  USE_EXACT_ALARM: {
    title: "Exact alarms (auto-granted)",
    level: "restricted",
    what: "Like SCHEDULE_EXACT_ALARM, but granted automatically.",
    play: "Only alarm clock, timer and calendar apps may use this. Play Console asks you to declare it, and other apps get rejected.",
    disclosure: "no",
    rejections: ["The app isn't an alarm, timer or calendar app"],
    alternative: "SCHEDULE_EXACT_ALARM (user-grantable) or WorkManager.",
  },
  USE_FULL_SCREEN_INTENT: {
    title: "Full-screen notifications",
    level: "high",
    what: "Shows a full-screen screen from a notification, even on the lock screen (calls, alarms).",
    play: "Fill in the Full-screen intent declaration (App content). Since Android 14 only calling and alarm apps get it by default.",
    disclosure: "no",
    rejections: ["The app isn't a calling or alarm app"],
    alternative: "A normal high-priority notification.",
  },

  // ---- contacts, phone, accounts ----
  READ_CONTACTS: {
    title: "Read contacts",
    level: "high",
    what: "Reads the user's whole address book.",
    play: "List contacts in the Data safety section. Uploading contacts to your server needs a prominent disclosure and consent.",
    disclosure: "required",
    rejections: ["Contacts uploaded without a prominent disclosure", "Contacts used for marketing or friend-spam"],
    alternative: "Contact picker intent (ACTION_PICK) to get one contact without the permission.",
  },
  WRITE_CONTACTS: {
    title: "Edit contacts",
    level: "medium",
    what: "Adds or changes contacts.",
    play: "List contacts in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: [],
    alternative: "ACTION_INSERT intent so the Contacts app adds it.",
  },
  GET_ACCOUNTS: {
    title: "See accounts",
    level: "medium",
    what: "Lists accounts on the device (mostly limited since Android 8).",
    play: "List personal info in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: [],
    alternative: "Google Sign-In / Credential Manager.",
  },
  READ_PHONE_STATE: {
    title: "Phone state",
    level: "medium",
    what: "Reads phone status (calls, network). Often added by old SDKs.",
    play: "No form, but reviewers question it if the app has no phone features. Never use it for device IDs.",
    disclosure: "if-not-obvious",
    rejections: ["Used to read device identifiers"],
    alternative: "Remove it if a library added it (tools:node=\"remove\").",
  },
  READ_PHONE_NUMBERS: {
    title: "Phone number",
    level: "medium",
    what: "Reads the device's phone number.",
    play: "List it in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: [],
    alternative: "Phone Number Hint API.",
  },
  CALL_PHONE: {
    title: "Make calls",
    level: "medium",
    what: "Starts phone calls without going through the dialer.",
    play: "No form.",
    disclosure: "no",
    rejections: [],
    alternative: "ACTION_DIAL intent (opens the dialer, no permission).",
  },
  ANSWER_PHONE_CALLS: {
    title: "Answer calls",
    level: "medium",
    what: "Answers incoming phone calls.",
    play: "Used by calling and accessibility apps; reviewers check the use case.",
    disclosure: "if-not-obvious",
    rejections: [],
  },

  // ---- camera, mic, sensors, health ----
  CAMERA: {
    title: "Camera",
    level: "low",
    what: "Takes photos and video.",
    play: "List photos/videos in the Data safety section if you collect them.",
    disclosure: "no",
    rejections: [],
    alternative: "ACTION_IMAGE_CAPTURE intent for one-off photos.",
  },
  RECORD_AUDIO: {
    title: "Microphone",
    level: "medium",
    what: "Records audio.",
    play: "List audio in the Data safety section. Recording in the background needs a strong reason and a foreground service of type microphone.",
    disclosure: "if-not-obvious",
    rejections: ["Recording when the user doesn't expect it"],
  },
  BODY_SENSORS: {
    title: "Body sensors",
    level: "high",
    what: "Reads heart rate and other body sensors.",
    play: "Health features must follow the Health apps policy and the Health apps declaration in App content.",
    disclosure: "if-not-obvious",
    rejections: ["Health data used for ads", "Missing Health apps declaration"],
  },
  BODY_SENSORS_BACKGROUND: {
    title: "Body sensors in background",
    level: "restricted",
    what: "Reads body sensors while the app isn't open.",
    play: "Needs the Health apps declaration and a strong core use case.",
    disclosure: "required",
    rejections: ["Background access not needed for the core feature"],
  },
  ACTIVITY_RECOGNITION: {
    title: "Physical activity",
    level: "medium",
    what: "Detects walking, running, driving and step counts.",
    play: "List fitness info in the Data safety section.",
    disclosure: "if-not-obvious",
    rejections: [],
  },

  // ---- other ----
  POST_NOTIFICATIONS: { title: "Notifications", level: "low", what: "Shows notifications (asked at runtime on Android 13+).", play: "Nothing special.", disclosure: "no", rejections: [] },
  BLUETOOTH_SCAN: {
    title: "Bluetooth scan",
    level: "medium",
    what: "Finds nearby Bluetooth devices. Without neverForLocation, Android treats it like location access.",
    play: "If you don't derive location, add android:usesPermissionFlags=\"neverForLocation\".",
    disclosure: "if-not-obvious",
    rejections: [],
  },
  WRITE_SETTINGS: { title: "Change system settings", level: "medium", what: "Changes system settings such as brightness.", play: "The user grants it in Settings; explain why first.", disclosure: "required", rejections: [] },
  PACKAGE_USAGE_STATS: {
    title: "App usage access",
    level: "high",
    what: "Sees which apps the user opens and for how long. Granted in Settings.",
    play: "Reviewers check that it's core to the app (screen-time, parental control, device care) and disclosed.",
    disclosure: "required",
    rejections: ["Usage data collected for ads or profiling"],
  },
  "com.google.android.gms.permission.AD_ID": {
    title: "Advertising ID",
    level: "low",
    what: "Reads the Google advertising ID. Usually added by ads or analytics SDKs.",
    play: "Answer the Advertising ID question in App content and match it in Data safety. Apps for children can't use it.",
    disclosure: "no",
    rejections: ["App content says 'no advertising ID' but this permission is present"],
  },
};

// Things found on components (services, receivers) rather than in <uses-permission>.
export const COMPONENT_RULES: Record<string, Rule> = {
  BIND_ACCESSIBILITY_SERVICE: {
    title: "Accessibility service",
    level: "restricted",
    what: "The app has an accessibility service: it can read the screen and act for the user.",
    play: "Fill in the AccessibilityService API declaration and show a prominent disclosure with consent. Apps that aren't accessibility tools must not use it to automate or collect data.",
    disclosure: "required",
    rejections: ["Used for automation, ad clicking or data collection", "No prominent disclosure and consent screen", "isAccessibilityTool set without being one"],
  },
  BIND_NOTIFICATION_LISTENER_SERVICE: {
    title: "Notification access",
    level: "high",
    what: "Reads every notification on the phone, including messages and codes.",
    play: "Reviewers check it's core to the app. Show a disclosure before sending the user to Settings.",
    disclosure: "required",
    rejections: ["Reading notifications for data collection or OTP scraping"],
  },
  BIND_VPN_SERVICE: {
    title: "VPN service",
    level: "restricted",
    what: "The app runs a VPN and can see network traffic.",
    play: "Fill in the VpnService declaration. Only for apps whose core feature is a VPN or similar.",
    disclosure: "required",
    rejections: ["VPN used to collect data or inject ads", "VPN isn't the core feature"],
  },
  BIND_DEVICE_ADMIN: {
    title: "Device admin",
    level: "high",
    what: "Device administrator rights (lock screen, wipe, policies).",
    play: "Only for enterprise, parental control or anti-theft apps; must be disclosed and easy to remove.",
    disclosure: "required",
    rejections: ["Used to stop users uninstalling the app"],
  },
};

export const FGS_RULE: Rule = {
  title: "Foreground services",
  level: "medium",
  what: "The app runs foreground services (long tasks with a notification).",
  play: "Apps targeting Android 14+ must declare foreground service types in Play Console (App content → Foreground service permissions), explain each use and its user impact, and add a video for some types.",
  disclosure: "no",
  rejections: ["Type doesn't match what the service does", "Work could be done with WorkManager instead"],
  alternative: "WorkManager for deferrable work; user-initiated data transfer jobs for big downloads.",
};
