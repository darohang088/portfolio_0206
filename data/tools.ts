// Tools listed on the Tools page, in groups.
export type Tool = { href: string; icon: string; name: string; description: string; tags: string[]; pinHash?: string };
// pinHash: SHA-256 (hex) of the PIN asked before the tool opens.
export type ToolGroup = { title: string; tools: Tool[] };

export const toolGroups: ToolGroup[] = [
  {
    title: "Signing & Build Inspection",
    tools: [
      {
        href: "/fingerprint",
        icon: "🔑",
        name: "Keystore Fingerprints",
        description: "Drop a keystore (.jks / .p12), APK or certificate and get its MD5, SHA-1 and SHA-256, plus the Facebook key hash. Ready to paste into Firebase, Google Sign-In and payment SDKs.",
        tags: ["Signing", "Firebase", "Free"],
      },
      {
        href: "/permissions",
        icon: "📋",
        name: "Permissions & Privacy Explainer",
        description: "Drop an AndroidManifest.xml or APK. See which permissions Google Play will question, the Play Console declarations you need, where a prominent disclosure is required, and what gets apps rejected.",
        tags: ["Google Play", "Privacy", "Free"],
      },
      {
        href: "/share",
        icon: "📲",
        name: "Build Share",
        description: "Drop a test APK and get a short link and QR code for clients and testers: a clean download page with the app icon, version and install help. Links expire on their own.",
        tags: ["Testers", "QR", "Owner"],
      },
      {
        href: "/apk-diff",
        icon: "🆚",
        name: "Manifest & Permissions Diff",
        description: "Drop two APKs or manifests side by side to see added and removed permissions, newly exported components, SDK changes and signing key changes.",
        tags: ["Release", "Review", "Free"],
      },
      {
        href: "/apk",
        icon: "🛡️",
        name: "APK Security Check",
        description: "Drop an Android APK and get a security grade: debug settings, network, exported screens, signing, permissions and hardcoded secrets.",
        tags: ["Android", "Security", "Free"],
      },
    ],
  },
  {
    title: "QR & Payments",
    tools: [
      {
        href: "/khqr",
        icon: "🔍",
        name: "KHQR Reader",
        description: "Read a KHQR (or any QR): upload, link, camera or paste. Shows who you pay, the amount, bank, bill number and expiry, and checks the code wasn't changed.",
        tags: ["KHQR", "Bakong", "Free"],
      },
      {
        href: "/qr",
        icon: "🔳",
        name: "QR Code Maker",
        description: "Turn any text or link into a QR code with one of three frames, then download it as a PNG.",
        tags: ["QR", "Design", "Free"],
      },
    ],
  },
  {
    title: "Code & Data",
    tools: [
      {
        href: "/json",
        icon: "🧾",
        name: "Pretty JSON",
        description: "Paste JSON and see it formatted on the other side, with colours and a collapsible tree view. Minify it, load a .json file, and get the exact line and column of any error.",
        tags: ["JSON", "Format", "Free"],
      },
      {
        href: "/encode",
        icon: "🔐",
        name: "Encode & Hash",
        description: "Base64 and URL encode or decode, MD5 / SHA-1 / SHA-256 / SHA-512 checksums of text or any file, and HMAC signatures. Decoded images preview right away.",
        tags: ["Base64", "SHA-256", "Free"],
      },
    ],
  },
  {
    title: "Testing",
    tools: [
      {
        href: "/test",
        icon: "📱",
        name: "Test App",
        description: "Preview private app builds on real iPhone-size screens (393 × 852), up to 12 at once. Each project needs its PIN.",
        tags: ["Preview", "PIN"],
        pinHash: "d86d84d945596a7836b26b9e06e05042ba9617bac697b793b008fb4c4f7c218a",
      },
    ],
  },
];
