// Tools listed on the Tools page, in groups.
export type Tool = { href: string; icon: string; name: string; description: string; tags: string[]; locked?: boolean };
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
    title: "Testing",
    tools: [
      {
        href: "/test",
        icon: "📱",
        name: "Test App",
        description: "Preview private app builds on real iPhone-size screens (393 × 852), up to 12 at once. Each project needs its PIN.",
        tags: ["Preview", "PIN"],
        locked: true,
      },
    ],
  },
];
